const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require("socket.io");

// --- Game Constants ---
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;
const BOMB_TIMER = 3000;
const GAME_TICK_RATE = 1000 / 60; // Main logic loop runs at 60fps
const LOBBY_COUNTDOWN = 20;
const FINAL_COUNTDOWN = 10;

// --- Game State ---
let gameState = createInitialGameState();

// --- Utility Functions ---
function createInitialGameState() {
    return {
        status: 'waiting', // waiting, lobby, countdown, playing, gameover
        countdown: null,
        map: generateMap(),
        players: {},
        bombs: [],
        powerUps: [],
        explosions: [],
        chatMessages: [], // Ensure chat messages are always initialized
    };
}

function generateMap() {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
    // Walls
    for (let i = 0; i < MAP_HEIGHT; i++) { map[i][0] = 1; map[i][MAP_WIDTH - 1] = 1; }
    for (let j = 0; j < MAP_WIDTH; j++) { map[0][j] = 1; map[MAP_HEIGHT - 1][j] = 1; }
    for (let i = 2; i < MAP_HEIGHT - 1; i += 2) { for (let j = 2; j < MAP_WIDTH - 1; j += 2) { map[i][j] = 1; } }
    // Blocks
    for (let i = 0; i < MAP_HEIGHT; i++) {
        for (let j = 0; j < MAP_WIDTH; j++) {
            if (map[i][j] !== 0) continue;
            const isSpawnArea = (i < 3 && j < 3) || (i < 3 && j > MAP_WIDTH - 4) || (i > MAP_HEIGHT - 4 && j < 3) || (i > MAP_HEIGHT - 4 && j > MAP_WIDTH - 4);
            if (isSpawnArea) continue;
            if (Math.random() > 0.25) { map[i][j] = 2; }
        }
    }
    return map;
};

// --- HTTP Server (for serving frontend files) ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url); const pathname = parsedUrl.pathname; let filePath = pathname === '/' ? '/index.html' : pathname; const safeSuffix = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ''); const fullPath = path.join(__dirname, '..', 'frontend', safeSuffix); const extname = String(path.extname(fullPath)).toLowerCase(); const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', }; const contentType = mimeTypes[extname] || 'application/octet-stream'; fs.readFile(fullPath, (err, content) => { if (err) { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 Not Found</h1>'); } else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8'); } });
});

// --- WebSocket Server ---
const io = new Server(server);
const startPositions = [{ x: 1, y: 1 }, { x: MAP_WIDTH - 2, y: 1 }, { x: 1, y: MAP_HEIGHT - 2 }, { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 }];
const PLAYER_COLORS = ['#ff85b3', '#4a90e2', '#50e3c2', '#f5a623'];
let lobbyIntervalId = null;
let countdownIntervalId = null;

function broadcast(event, data) {
    // console.log(`Broadcasting [${event}]`);
    io.emit(event, data);
}

function updateLobbyState() {
    const numPlayers = Object.keys(gameState.players).length;
    if (gameState.status === 'playing' || gameState.status === 'countdown') return;

    if (numPlayers >= 4) {
        startFinalCountdown();
    } else if (numPlayers >= 2) {
        startLobbyCountdown();
    } else {
        resetLobby();
    }
    broadcast('lobbyUpdate', { status: gameState.status, countdown: gameState.countdown });
}

function startLobbyCountdown() {
    if (lobbyIntervalId) return;
    resetLobby();
    gameState.status = 'lobby';
    gameState.countdown = LOBBY_COUNTDOWN;
    lobbyIntervalId = setInterval(() => {
        gameState.countdown--;
        broadcast('lobbyUpdate', { status: gameState.status, countdown: gameState.countdown });
        if (gameState.countdown <= 0) {
            startFinalCountdown();
        }
    }, 1000);
}

function startFinalCountdown() {
    if (countdownIntervalId) return;
    resetLobby();
    gameState.status = 'countdown';
    gameState.countdown = FINAL_COUNTDOWN;
    countdownIntervalId = setInterval(() => {
        gameState.countdown--;
        broadcast('lobbyUpdate', { status: gameState.status, countdown: gameState.countdown });
        if (gameState.countdown <= 0) {
            startGame();
        }
    }, 1000);
}

function resetLobby() {
    clearInterval(lobbyIntervalId);
    clearInterval(countdownIntervalId);
    lobbyIntervalId = null;
    countdownIntervalId = null;
    gameState.status = 'waiting';
    gameState.countdown = null;
}

function startGame() {
    resetLobby();
    gameState.status = 'playing';
    broadcast('gameStart', { map: gameState.map, players: gameState.players });
}


io.on('connection', (socket) => {
    if (Object.keys(gameState.players).length >= 4 || gameState.status === 'playing') {
        socket.emit('error', { message: "Game is full or has already started." });
        return socket.disconnect();
    }

    const playerIndex = Object.keys(gameState.players).length;
    const newPlayer = {
        id: socket.id,
        nickname: `Player ${playerIndex + 1}`,
        x: startPositions[playerIndex].x, y: startPositions[playerIndex].y,
        lives: 3, speed: 1, flameSize: 1, maxBombs: 1,
        color: PLAYER_COLORS[playerIndex],
    };
    gameState.players[socket.id] = newPlayer;

    socket.emit('welcome', { myId: socket.id, initialState: gameState });
    broadcast('playerJoined', newPlayer);

    updateLobbyState();

    socket.on('joinGame', ({ nickname }) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].nickname = nickname;
            broadcast('playerUpdate', { id: socket.id, nickname });
        }
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        broadcast('playerLeft', { id: socket.id });
        updateLobbyState();
    });

    socket.on('move', ({ direction }) => {
        if (gameState.status !== 'playing') return;
        const player = gameState.players[socket.id];
        if (!player) return;

        let newX = player.x; let newY = player.y;
        if (direction === 'up') newY -= 1;
        if (direction === 'down') newY += 1;
        if (direction === 'left') newX -= 1;
        if (direction === 'right') newX += 1;

        // A player can only move into an empty floor tile (0). Power-ups also exist on floor tiles.
        if (gameState.map[newY] && gameState.map[newY][newX] === 0) {
            player.x = newX; player.y = newY;
            broadcast('playerMoved', { id: socket.id, x: player.x, y: player.y });

            const powerUpIndex = gameState.powerUps.findIndex(p => p.x === player.x && p.y === player.y);
            if (powerUpIndex !== -1) {
                const powerUp = gameState.powerUps[powerUpIndex];
                if (powerUp.type === 'bombs') player.maxBombs++;
                if (powerUp.type === 'flame') player.flameSize++;
                if (powerUp.type === 'speed') player.speed++;
                if (powerUp.type === 'oneup') player.lives++;
                gameState.powerUps.splice(powerUpIndex, 1);
                broadcast('powerUpCollected', { powerUpId: `${powerUp.x}-${powerUp.y}`, playerId: socket.id, newStats: player });
            }
        }
    });

    socket.on('placeBomb', () => {
        if (gameState.status !== 'playing') return;
        const player = gameState.players[socket.id];
        if (player) {
            const bomb = { id: `${player.x}-${player.y}-${Date.now()}`, x: player.x, y: player.y, createdAt: Date.now(), ownerId: socket.id };
            gameState.bombs.push(bomb);
            broadcast('bombPlaced', bomb);
        }
    });

    socket.on('chatMessage', (message) => {
        const player = gameState.players[socket.id];
        if (player && message && message.length > 0 && message.length <= 100) {
            broadcast('newChatMessage', {
                senderId: socket.id,
                nickname: player.nickname,
                message: message,
                timestamp: Date.now(),
            });
        }
    });
});

// --- Main Game Loop ---
setInterval(() => {
    if (gameState.status !== 'playing') return;

    const now = Date.now();
    const explodingBombs = gameState.bombs.filter(bomb => now - bomb.createdAt >= BOMB_TIMER);

    if (explodingBombs.length > 0) {
        const allExplosionCoords = new Map();
        const destroyedBlocks = [];
        const newPowerUps = [];
        const powerUpTypes = ['bombs', 'flame', 'speed', 'oneup'];

        explodingBombs.forEach(bomb => {
            const owner = gameState.players[bomb.ownerId];
            const flameSize = owner ? owner.flameSize : 1;
            const directions = [{x:0,y:0}, {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1}];

            directions.forEach(dir => {
                for (let i = 0; i <= flameSize; i++) {
                    const x = bomb.x + dir.x * i;
                    const y = bomb.y + dir.y * i;

                    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT || gameState.map[y][x] === 1) break;

                    const coordKey = `${x},${y}`;
                    if (!allExplosionCoords.has(coordKey)) {
                        allExplosionCoords.set(coordKey, {x, y});
                    }

                    if (gameState.map[y][x] === 2) { // Destructible block
                        gameState.map[y][x] = 0;
                        destroyedBlocks.push({x, y});
                        if (Math.random() < 0.4) { // 40% chance to spawn powerup
                            const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                            const powerUp = { x, y, type, id: `${x}-${y}` };
                            gameState.powerUps.push(powerUp);
                            newPowerUps.push(powerUp);
                        }
                        break;
                    }
                }
            });
        });

        const damagedPlayers = [];
        for (const playerId in gameState.players) {
            const player = gameState.players[playerId];
            if (allExplosionCoords.has(`${player.x},${player.y}`)) {
                player.lives--;
                damagedPlayers.push({ id: playerId, lives: player.lives });
            }
        }

        const explodedBombIds = explodingBombs.map(b => b.id);

        broadcast('explosion', {
            coords: Array.from(allExplosionCoords.values()),
            destroyedBlocks,
            newPowerUps,
            damagedPlayers,
            explodedBombIds,
        });

        // Remove dead players after broadcasting damage
        damagedPlayers.forEach(p => {
            if (p.lives <= 0) {
                delete gameState.players[p.id];
                broadcast('playerDied', { id: p.id });
            }
        });

        gameState.bombs = gameState.bombs.filter(bomb => !explodingBombs.includes(bomb));

        // Check for game over
        const alivePlayers = Object.values(gameState.players);
        if (alivePlayers.length <= 1) {
            gameState.status = 'gameover';
            broadcast('gameOver', { winner: alivePlayers[0] || null });
            setTimeout(() => {
                gameState = createInitialGameState();
                broadcast('reset');
            }, 5000);
        }
    }
}, GAME_TICK_RATE);


const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});