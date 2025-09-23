const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require("socket.io");

// --- Game Constants ---
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;

// --- Game Logic ---
const generateMap = () => {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));
    for (let i = 0; i < MAP_HEIGHT; i++) {
        map[i][0] = 1; map[i][MAP_WIDTH - 1] = 1;
    }
    for (let j = 0; j < MAP_WIDTH; j++) {
        map[0][j] = 1; map[MAP_HEIGHT - 1][j] = 1;
    }
    for (let i = 2; i < MAP_HEIGHT - 1; i += 2) {
        for (let j = 2; j < MAP_WIDTH - 1; j += 2) {
            map[i][j] = 1;
        }
    }
    for (let i = 0; i < MAP_HEIGHT; i++) {
        for (let j = 0; j < MAP_WIDTH; j++) {
            if (map[i][j] !== 0) continue;
            const isTopLeft = i < 3 && j < 3;
            const isTopRight = i < 3 && j > MAP_WIDTH - 4;
            const isBottomLeft = i > MAP_HEIGHT - 4 && j < 3;
            const isBottomRight = i > MAP_HEIGHT - 4 && j > MAP_WIDTH - 4;
            if (isTopLeft || isTopRight || isBottomLeft || isBottomRight) continue;
            if (Math.random() > 0.25) { map[i][j] = 2; }
        }
    }
    return map;
};

const gameState = {
    map: generateMap(),
    players: {},
};

// --- HTTP Server ---
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const safeSuffix = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, '..', 'frontend', safeSuffix);
    const extname = String(path.extname(fullPath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found: ' + fullPath + '</h1>');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// --- WebSocket Server ---
const io = new Server(server);

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    gameState.players[socket.id] = { x: 1, y: 1 };
    io.emit('gameState', gameState);

    socket.on('move', (data) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        let newX = player.x;
        let newY = player.y;

        if (data.direction === 'up') newY -= 1;
        if (data.direction === 'down') newY += 1;
        if (data.direction === 'left') newX -= 1;
        if (data.direction === 'right') newX += 1;

        if (gameState.map[newY] && gameState.map[newY][newX] === 0) {
            player.x = newX;
            player.y = newY;
            io.emit('gameState', gameState);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete gameState.players[socket.id];
        io.emit('gameState', gameState);
    });
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});