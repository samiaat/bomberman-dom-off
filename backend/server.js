const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require("socket.io");

// --- Game Constants ---
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;
const BOMB_TIMER = 3000; // 3 seconds
const GAME_TICK_RATE = 1000 / 60; // 60fps for broadcasting state

// --- Game Logic ---
const generateMap = () => {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
    for (let i = 0; i < MAP_HEIGHT; i++) { map[i][0] = 1; map[i][MAP_WIDTH - 1] = 1; }
    for (let j = 0; j < MAP_WIDTH; j++) { map[0][j] = 1; map[MAP_HEIGHT - 1][j] = 1; }
    for (let i = 2; i < MAP_HEIGHT - 1; i += 2) { for (let j = 2; j < MAP_WIDTH - 1; j += 2) { map[i][j] = 1; } }
    for (let i = 0; i < MAP_HEIGHT; i++) { for (let j = 0; j < MAP_WIDTH; j++) { if (map[i][j] !== 0) continue; const isTopLeft = i < 3 && j < 3; const isTopRight = i < 3 && j > MAP_WIDTH - 4; const isBottomLeft = i > MAP_HEIGHT - 4 && j < 3; const isBottomRight = i > MAP_HEIGHT - 4 && j > MAP_WIDTH - 4; if (isTopLeft || isTopRight || isBottomLeft || isBottomRight) continue; if (Math.random() > 0.25) { map[i][j] = 2; } } }
    return map;
};

const gameState = {
    map: generateMap(),
    players: {},
    bombs: [],
    powerUps: [],
};

// --- HTTP Server ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url); const pathname = parsedUrl.pathname; let filePath = pathname === '/' ? '/index.html' : pathname; const safeSuffix = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ''); const fullPath = path.join(__dirname, '..', 'frontend', safeSuffix); const extname = String(path.extname(fullPath)).toLowerCase(); const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', }; const contentType = mimeTypes[extname] || 'application/octet-stream'; fs.readFile(fullPath, (err, content) => { if (err) { if (err.code == 'ENOENT') { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 Not Found: ' + fullPath + '</h1>'); } else { res.writeHead(500); res.end('Server Error: ' + err.code); } } else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8'); } });
});

// --- WebSocket Server ---
const io = new Server(server);
const startPositions = [ { x: 1, y: 1 }, { x: MAP_WIDTH - 2, y: 1 }, { x: 1, y: MAP_HEIGHT - 2 }, { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 } ];

io.on('connection', (socket) => {
    const numPlayers = Object.keys(gameState.players).length;
    if (numPlayers >= 4) {
        socket.disconnect();
        return;
    }

    const startPosition = startPositions[numPlayers];
    gameState.players[socket.id] = {
        x: startPosition.x,
        y: startPosition.y,
        lives: 3,
        speed: 1, // Not used yet, but for the power-up
        flameSize: 1,
        maxBombs: 1,
    };

    socket.on('move', (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;
        let newX = player.x; let newY = player.y;
        if (data.direction === 'up') newY -= 1;
        if (data.direction === 'down') newY += 1;
        if (data.direction === 'left') newX -= 1;
        if (data.direction === 'right') newX += 1;
        if (gameState.map[newY] && gameState.map[newY][newX] === 0) {
            player.x = newX;
            player.y = newY;

            // Check for power-up collection
            const powerUpIndex = gameState.powerUps.findIndex(p => p.x === player.x && p.y === player.y);
            if (powerUpIndex !== -1) {
                const powerUp = gameState.powerUps[powerUpIndex];
                console.log(`Player ${socket.id} collected ${powerUp.type}`);

                // Apply power-up effect
                if (powerUp.type === 'bombs') player.maxBombs++;
                if (powerUp.type === 'flame') player.flameSize++;
                if (powerUp.type === 'speed') player.speed++;
                if (powerUp.type === 'oneup') player.lives++;

                // Remove power-up from game state
                gameState.powerUps.splice(powerUpIndex, 1);
            }
        }
    });

    socket.on('placeBomb', () => {
        const player = gameState.players[socket.id];
        if (player) {
            gameState.bombs.push({ x: player.x, y: player.y, createdAt: Date.now() });
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
    });
});

// --- Game Loop ---
setInterval(() => {
    const now = Date.now();
    const explodingBombs = [];

    // Identify bombs that should explode now
    gameState.bombs.forEach(bomb => {
        if (now - bomb.createdAt >= BOMB_TIMER) {
            explodingBombs.push(bomb);
        }
    });

    if (explodingBombs.length > 0) {
        explodingBombs.forEach(bomb => {
            // For now, flame size is hardcoded to 1
            const flameSize = 1;
            const explosionCoords = [{ x: bomb.x, y: bomb.y }]; // Center of explosion

            // Right
            for(let i = 1; i <= flameSize; i++) {
                if(gameState.map[bomb.y][bomb.x + i] === 1) break; // Stop at wall
                explosionCoords.push({ x: bomb.x + i, y: bomb.y });
                if(gameState.map[bomb.y][bomb.x + i] === 2) break; // Stop after hitting a block
            }
            // Left
            for(let i = 1; i <= flameSize; i++) {
                if(gameState.map[bomb.y][bomb.x - i] === 1) break;
                explosionCoords.push({ x: bomb.x - i, y: bomb.y });
                if(gameState.map[bomb.y][bomb.x - i] === 2) break;
            }
            // Down
            for(let i = 1; i <= flameSize; i++) {
                if(gameState.map[bomb.y + i][bomb.x] === 1) break;
                explosionCoords.push({ x: bomb.x, y: bomb.y + i });
                if(gameState.map[bomb.y + i][bomb.x] === 2) break;
            }
            // Up
            for(let i = 1; i <= flameSize; i++) {
                if(gameState.map[bomb.y - i][bomb.x] === 1) break;
                explosionCoords.push({ x: bomb.x, y: bomb.y - i });
                if(gameState.map[bomb.y - i][bomb.x] === 2) break;
            }

            // Destroy blocks and potentially spawn power-ups
            const powerUpTypes = ['bombs', 'flame', 'speed', 'oneup'];
            const POWERUP_CHANCE = 0.5; // 50% chance

            explosionCoords.forEach(coord => {
                if (gameState.map[coord.y] && gameState.map[coord.y][coord.x] === 2) {
                    gameState.map[coord.y][coord.x] = 0; // Turn block into floor

                    if (Math.random() < POWERUP_CHANCE) {
                        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        gameState.powerUps.push({
                            x: coord.x,
                            y: coord.y,
                            type: type,
                        });
                    }
                }
            });
        });

        // Remove the exploded bombs from the game state
        const explodedBombSet = new Set(explodingBombs);
        gameState.bombs = gameState.bombs.filter(bomb => !explodedBombSet.has(bomb));
    }

    // Broadcast the state to all clients
    io.emit('gameState', gameState);
}, GAME_TICK_RATE);


const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});