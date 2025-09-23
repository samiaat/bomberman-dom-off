const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require("socket.io");

// --- Game Constants ---
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;
const GAME_TICK_RATE = 1000 / 60; // 60 updates per second

// --- Game Logic ---
const generateMap = () => {
    // (Map generation logic is unchanged)
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
};

// --- HTTP Server (unchanged) ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url); const pathname = parsedUrl.pathname; let filePath = pathname === '/' ? '/index.html' : pathname; const safeSuffix = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, ''); const fullPath = path.join(__dirname, '..', 'frontend', safeSuffix); const extname = String(path.extname(fullPath)).toLowerCase(); const mimeTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', }; const contentType = mimeTypes[extname] || 'application/octet-stream'; fs.readFile(fullPath, (err, content) => { if (err) { if (err.code == 'ENOENT') { res.writeHead(404, { 'Content-Type': 'text/html' }); res.end('<h1>404 Not Found: ' + fullPath + '</h1>'); } else { res.writeHead(500); res.end('Server Error: ' + err.code); } } else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8'); } });
});

// --- WebSocket Server ---
const io = new Server(server);

const startPositions = [
    { x: 1, y: 1 },
    { x: MAP_WIDTH - 2, y: 1 },
    { x: 1, y: MAP_HEIGHT - 2 },
    { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 }
];

io.on('connection', (socket) => {
    const numPlayers = Object.keys(gameState.players).length;

    if (numPlayers >= 4) {
        console.log(`Game is full. Rejecting player ${socket.id}`);
        socket.disconnect();
        return;
    }

    console.log(`Player connected: ${socket.id}`);
    const startPosition = startPositions[numPlayers];

    gameState.players[socket.id] = {
        x: startPosition.x,
        y: startPosition.y,
        moving: { up: false, down: false, left: false, right: false }
    };

    // Broadcast is handled by the game loop, but we can send one on connect
    // to get the player in the game immediately.
    io.emit('gameState', gameState);

    socket.on('startMove', (data) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].moving[data.direction] = true;
        }
    });

    socket.on('stopMove', (data) => {
        if (gameState.players[socket.id]) {
            gameState.players[socket.id].moving[data.direction] = false;
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
        // The game loop will naturally broadcast the change
    });
});

// --- Game Loop ---
setInterval(() => {
    // Update player positions based on their moving state
    for (const id in gameState.players) {
        const player = gameState.players[id];
        // This is a very basic movement implementation. A real implementation would use speed, delta time, etc.
        let newX = player.x;
        let newY = player.y;

        if (player.moving.up) newY -= 1;
        if (player.moving.down) newY += 1;
        if (player.moving.left) newX -= 1;
        if (player.moving.right) newX += 1;

        // Simple collision detection
        if (gameState.map[newY] && gameState.map[newY][newX] === 0) {
            player.x = newX;
            player.y = newY;
        }
    }
    // Broadcast the new state to all players
    io.emit('gameState', gameState);
}, GAME_TICK_RATE);


const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});