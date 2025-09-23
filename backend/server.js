const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require("socket.io");

const server = http.createServer((req, res) => {
    // Construct the file path to serve from the 'frontend' directory
    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Security check to prevent directory traversal attacks
    const safeSuffix = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(__dirname, '..', 'frontend', safeSuffix);

    // Determine the content type based on the file extension
    const extname = String(path.extname(fullPath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read and serve the file
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            if (err.code == 'ENOENT') {
                // File not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>The requested URL ' + req.url + ' was not found on this server.</p>', 'utf-8');
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

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Serving files from the ../frontend directory.');
});
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté via WebSocket');
  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté');
  });
});