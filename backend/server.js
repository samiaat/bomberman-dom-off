const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { Server } = require("socket.io");

// --- Game Constants ---
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;
const BOMB_TIMER = 3000;
const GAME_TICK_RATE = 1000 / 60; 
const LOBBY_COUNTDOWN = 5;
const FINAL_COUNTDOWN = 5;
const BASE_SPEED = 2.5; 
const PLAYER_SIZE = 0.75; 

// --- Player Slot Management ---
let availableSlots = [0, 1, 2, 3];
// --- Game State ---
let gameState = createInitialGameState();


// --- Utility Functions ---
function createInitialGameState() {
    // Reset the slots when the game fully resets
    availableSlots = [0, 1, 2, 3];
    return {
        status: 'waiting',
        countdown: null,
        map: generateMap(),
        players: {},
        bombs: [],
        powerUps: [],
        explosions: [],
        chatMessages: [],
    };
}

function generateMap() {
    // Crée une matrice 2D représentant la carte du jeu, remplie initialement de 0 (cases vides)
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));

    // --- Création des murs fixes autour de la carte ---
    for (let i = 0; i < MAP_HEIGHT; i++) { 
        map[i][0] = 1; 
        map[i][MAP_WIDTH - 1] = 1; 
    }
    for (let j = 0; j < MAP_WIDTH; j++) { 
        map[0][j] = 1; 
        map[MAP_HEIGHT - 1][j] = 1; 
    }

    // --- Création des murs internes (en damier) ---
    for (let i = 2; i < MAP_HEIGHT - 1; i += 2) { 
        for (let j = 2; j < MAP_WIDTH - 1; j += 2) { 
            map[i][j] = 1; 
        }
    }

    // --- Placement des blocs destructibles ---
    for (let i = 0; i < MAP_HEIGHT; i++) { 
        for (let j = 0; j < MAP_WIDTH; j++) { 
            if (map[i][j] !== 0) continue; 

            // Vérifie si la case est dans une zone de spawn pour les joueurs
            const isSpawnArea = 
                (i < 3 && j < 3) || 
                (i < 3 && j > MAP_WIDTH - 4) || 
                (i > MAP_HEIGHT - 4 && j < 3) || 
                (i > MAP_HEIGHT - 4 && j > MAP_WIDTH - 4); 

            if (isSpawnArea) continue; 

            // Place un bloc destructible avec 75% de chance (2 = bloc destructible)
            if (Math.random() > 0.25) { 
                map[i][j] = 2; 
            }
        }
    }

    return map;
};


function isPositionValid(x, y, map) {
    // Vérifie si le joueur dépasse les limites de la carte
    // x < 0 ou y < 0 → dépassement à gauche ou en haut
    // x + PLAYER_SIZE > MAP_WIDTH ou y + PLAYER_SIZE > MAP_HEIGHT → dépassement à droite ou en bas
    if (x < 0 || (x + PLAYER_SIZE) > MAP_WIDTH || y < 0 || (y + PLAYER_SIZE) > MAP_HEIGHT) 
        return false; 

    // Calcul des tuiles minimales et maximales que le joueur touche
    const minTileX = Math.floor(x);             // colonne minimale
    const maxTileX = Math.floor(x + PLAYER_SIZE); // colonne maximale
    const minTileY = Math.floor(y);             // ligne minimale
    const maxTileY = Math.floor(y + PLAYER_SIZE); // ligne maximale

    // Parcours toutes les tuiles couvertes par le joueur
    for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            // Vérifie si la tuile est solide (1 ou 2)
            if (map[ty][tx] === 1 || map[ty][tx] === 2) {
                return false; // Collision détectée → position invalide
            }
        }
    }

    //  position valide
    return true;
}



// --- HTTP Server (pour servir les fichiers frontend) ---
const server = http.createServer((req, res) => {
    // Récupère l'URL demandée par le client
    const parsedUrl = url.parse(req.url);

    
    const pathname = parsedUrl.pathname;

    let filePath = pathname === '/' ? '/index.html' : pathname;

    // Empêche les attaques de type "../" pour accéder à d'autres dossiers
    const safeSuffix = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');

    // Crée le chemin complet vers le fichier dans le dossier frontend
    const fullPath = path.join(__dirname, '..', 'frontend', safeSuffix);

    const extname = String(path.extname(fullPath)).toLowerCase();

    // Définition des types MIME pour les fichiers connus
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Lecture du fichier demandé
    fs.readFile(fullPath, (err, content) => {
        if (err) {
            
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});


// --- WebSocket Server ---
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});
const startPositions = [{ x: 1, y: 1 }, { x: MAP_WIDTH - 2, y: 1 }, { x: 1, y: MAP_HEIGHT - 2 }, { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 }];
const PLAYER_COLORS = ['#ff85b3', '#4a90e2', '#50e3c2', '#f5a623'];
let lobbyIntervalId = null;
let countdownIntervalId = null;

function broadcast(event, data) {
    io.emit(event, data);
}

function updateLobbyState() {
    const numPlayers = Object.keys(gameState.players).length;

    if (gameState.status === 'playing') return;

    if (numPlayers >= 4) {
        startFinalCountdown();
    } 
    else if (numPlayers >= 2) {
        startLobbyCountdown();
    } 
    else {
        resetLobby();
    }

    // On envoie l'état actuel du lobby à tous les clients connectés
    // Cela inclut le statut et le compte à rebours actuel
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

    // Parcourt tous les joueurs présents dans l'état du jeu
    Object.values(gameState.players).forEach(player => {
        player.x = startPositions[player.playerIndex].x;
        player.y = startPositions[player.playerIndex].y;

        player.lives = 3;

        player.speed = 1;

        player.flameSize = 1;

        player.maxBombs = 1;

        player.isAlive = true;

        player.moving = { up: false, down: false, left: false, right: false };
    });

    
    gameState.status = 'playing';

    gameState.bombs = [];

    gameState.powerUps = [];

    gameState.map = generateMap();

    broadcast('gameStart', { map: gameState.map, players: gameState.players });
}



io.on('connection', (socket) => {
   
if (availableSlots.length === 0 || gameState.status === 'playing' || gameState.status === 'countdown') {
    socket.emit('error', { message: "Game is full or has already started." });
    return socket.disconnect();
}

// Assigne le premier slot disponible au nouveau joueur
const playerIndex = availableSlots.shift();

// Crée l'objet représentant le nouveau joueur
const newPlayer = {
    id: socket.id, 
    playerIndex: playerIndex, // Index du joueur pour sa position de départ
    x: startPositions[playerIndex].x,
    y: startPositions[playerIndex].y, 
    lives: 3, 
    speed: 1, 
    flameSize: 1, 
    maxBombs: 1, 
    isAlive: true, 
    color: PLAYER_COLORS[playerIndex], 
    moving: { up: false, down: false, left: false, right: false },
};


gameState.players[socket.id] = newPlayer;

// Envoie un message de bienvenue au joueur avec son ID et l'état initial du jeu
socket.emit('welcome', { myId: socket.id, initialState: gameState });

broadcast('playerJoined', newPlayer);

updateLobbyState();

socket.on('joinGame', ({ nickname }) => {
    if (gameState.players[socket.id] && nickname && nickname.trim().length > 0 && nickname.length <= 20) {
        
        gameState.players[socket.id].nickname = nickname;
        broadcast('playerUpdate', { id: socket.id, nickname });
    }
});


socket.on('disconnect', () => {
    const wasInGame = gameState.status === 'playing' || gameState.status === 'gameover'; // Vérifie si le joueur était en jeu
    const gameWasOver = gameState.status === 'gameover'; // Vérifie si le jeu était terminé
    const player = gameState.players[socket.id];

    if (!player) return; // Si le joueur n'existe plus, on quitte

    // Rend le slot du joueur disponible pour un futur joueur
    availableSlots.push(player.playerIndex);
    availableSlots.sort((a, b) => a - b); // Trie les slots pour garder l'ordre

    const playerWasAlive = player.isAlive; // Vérifie si le joueur était vivant
    // Supprime le joueur de l'état global
    delete gameState.players[socket.id];
    // Informe tous les autres joueurs que ce joueur a quitté
    broadcast('playerLeft', { id: socket.id });

    // Vérifie s'il reste des joueurs et s'il y a un gagnant
    const remainingPlayers = Object.values(gameState.players);
    const alivePlayers = remainingPlayers.filter(p => p.isAlive);

    // Si un joueur quitte en plein jeu et qu'il ne reste qu'un joueur vivant
    if (gameState.status === 'playing' && playerWasAlive && alivePlayers.length <= 1) {
        gameState.status = 'gameover';
        broadcast('gameOver', { winner: alivePlayers[0] || null });

        // Il est crucial de réinitialiser l'état ici aussi pour éviter les joueurs fantômes
        console.log("Game over due to disconnect, resetting game state.");
        gameState = createInitialGameState();

        return; // Arrête la fonction pour éviter de mettre à jour le lobby
    }

    // Si le dernier joueur quitte, réinitialise le jeu
    if (remainingPlayers.length === 0 && wasInGame) {
        console.log("Last player left. Resetting game state.");
        gameState = createInitialGameState();
    }

    // Si le jeu était déjà terminé, ne met pas à jour le lobby
    if (gameWasOver) {
        return;
    }

    // Met à jour l'état du lobby pour les joueurs restants
    updateLobbyState();
});


socket.on('startMoving', ({ direction }) => {
    const player = gameState.players[socket.id];
    if (player && player.isAlive && player.moving[direction] !== undefined) {
        player.moving[direction] = true;
    }
});

socket.on('stopMoving', ({ direction }) => {
    const player = gameState.players[socket.id];
    if (player && player.moving[direction] !== undefined) {
        player.moving[direction] = false;
    }
});

// Événement lorsque le joueur pose une bombe
socket.on('placeBomb', () => {
    // Vérifie que le jeu est en cours
    if (gameState.status !== 'playing') return;

    const player = gameState.players[socket.id];
    if (player && player.isAlive) {
        // Vérifie combien de bombes le joueur a déjà sur le terrain
        const activeBombs = gameState.bombs.filter(b => b.ownerId === socket.id).length;
        // Si le joueur a atteint sa limite, il ne peut pas poser de bombe
        if (activeBombs >= player.maxBombs) {
            return;
        }

        // Place la bombe sur la grille en arrondissant la position du joueur
        const bombX = Math.round(player.x);
        const bombY = Math.round(player.y);
        const bomb = {
            id: `${bombX}-${bombY}-${Date.now()}`,
            x: bombX,
            y: bombY,
            createdAt: Date.now(), 
            ownerId: socket.id, 
        };

        
        gameState.bombs.push(bomb);

        broadcast('bombPlaced', bomb);
    }
});

// Événement lorsqu'un joueur envoie un message de chat
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

   // --- Gestion des déplacements des joueurs ---
const playersToUpdate = [];


for (const playerId in gameState.players) {
    const player = gameState.players[playerId];

    if (!player.isAlive) continue;

    let dx = 0;
    let dy = 0;

    if (player.moving.up) dy -= 1;
    if (player.moving.down) dy += 1;
    if (player.moving.left) dx -= 1;
    if (player.moving.right) dx += 1;

    // Si le joueur se déplace
    if (dx !== 0 || dy !== 0) {
        // Normalisation du vecteur de déplacement pour garder la même vitesse diagonale
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / magnitude;
        const normalizedDy = dy / magnitude;

        // Calcul de la vitesse du joueur selon le tick rate et la vitesse du joueur
        const moveSpeed = (BASE_SPEED * player.speed) / (1000 / GAME_TICK_RATE);
        let newX = player.x + normalizedDx * moveSpeed;
        let newY = player.y + normalizedDy * moveSpeed;

        // Détection de collision "slide" indépendante pour X et Y
        const originalX = player.x;
        const originalY = player.y;

        // Déplacement sur l'axe X
        player.x = newX;
        if (!isPositionValid(player.x, originalY, gameState.map)) {
            player.x = originalX;
        }

        // Déplacement sur l'axe Y
        player.y = newY;
        if (!isPositionValid(player.x, player.y, gameState.map)) {
            player.y = originalY;
        }

        // Vérification si le joueur ramasse un power-up
        const playerTileX = Math.round(player.x);
        const playerTileY = Math.round(player.y);
        const powerUpIndex = gameState.powerUps.findIndex(p => p.x === playerTileX && p.y === playerTileY);

        if (powerUpIndex !== -1) {
            const powerUp = gameState.powerUps[powerUpIndex];

            // Application de l'effet du power-up selon son type
            if (powerUp.type === 'bombs') player.maxBombs++;
            if (powerUp.type === 'flame') player.flameSize++;
            if (powerUp.type === 'speed') player.speed += 0.5;
            if (powerUp.type === 'oneup') player.lives++;

            // Supprime le power-up du jeu
            gameState.powerUps.splice(powerUpIndex, 1);

            // Informe tous les joueurs qu'un power-up a été collecté
            broadcast('powerUpCollected', {
                powerUpId: `${powerUp.x}-${powerUp.y}`,
                playerId: playerId,
                newStats: player
            });
        }

        playersToUpdate.push({ id: playerId, x: player.x, y: player.y });
    }
}

if (playersToUpdate.length > 0) {
    io.emit('playersMoved', playersToUpdate);
}
    // --- Gestion des explosions de bombes ---
const now = Date.now(); // Temps actuel en millisecondes

const explodingBombs = gameState.bombs.filter(bomb => now - bomb.createdAt >= BOMB_TIMER);

if (explodingBombs.length > 0) {
    const allExplosionCoords = new Map();
    const destroyedBlocks = [];
    const newPowerUps = [];
    const powerUpTypes = ['bombs', 'flame', 'speed', 'oneup'];

    // Parcours de chaque bombe qui explose
    explodingBombs.forEach(bomb => {
        const owner = gameState.players[bomb.ownerId];
        const flameSize = owner ? owner.flameSize : 1;
        const directions = [
            {x:0, y:0},
            {x:1, y:0},
            {x:-1, y:0},
            {x:0, y:1},
            {x:0, y:-1}
        ];

        // Parcours de chaque direction
        directions.forEach(dir => {
            for (let i = 0; i <= flameSize; i++) {
                const x = bomb.x + dir.x * i;
                const y = bomb.y + dir.y * i;

                if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT || gameState.map[y][x] === 1) break;

                const coordKey = `${x},${y}`;
                if (!allExplosionCoords.has(coordKey)) {
                    allExplosionCoords.set(coordKey, {x, y});
                }

                // Si c'est un bloc destructible
                if (gameState.map[y][x] === 2) {
                    gameState.map[y][x] = 0; 
                    destroyedBlocks.push({x, y});

                    if (Math.random() < 0.4) {
                        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        const powerUp = { x, y, type, id: `${x}-${y}` };
                        gameState.powerUps.push(powerUp);
                        newPowerUps.push(powerUp);
                    }
                }
            }
        });
    });

    const damagedPlayers = [];

    // Vérification des joueurs touchés
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        const playerTileX = Math.round(player.x);
        const playerTileY = Math.round(player.y);

        // Si le joueur est dans une explosion
        if (allExplosionCoords.has(`${playerTileX},${playerTileY}`)) {
            player.lives--;
            damagedPlayers.push({ id: playerId, lives: player.lives });
        }
    }

    const explodedBombIds = explodingBombs.map(b => b.id);

    // Envoie les informations d'explosion à tous les joueurs
    broadcast('explosion', {
        coords: Array.from(allExplosionCoords.values()),
        destroyedBlocks,
        newPowerUps,
        damagedPlayers,
        explodedBombIds,
    });

    // Marque les joueurs morts mais ne les supprime pas encore
    damagedPlayers.forEach(p => {
        const player = gameState.players[p.id];
        if (player && player.isAlive && p.lives <= 0) {
            player.isAlive = false;
            broadcast('playerDied', { player: player });
        }
    });

    gameState.bombs = gameState.bombs.filter(bomb => !explodingBombs.includes(bomb));

    // Vérifie si la partie est terminée
    const alivePlayers = Object.values(gameState.players).filter(p => p.isAlive);
    if (alivePlayers.length <= 1) {
        gameState.status = 'gameover';
        broadcast('gameOver', { winner: alivePlayers[0] || null });
        gameState = createInitialGameState();
    }
}

}, GAME_TICK_RATE);


const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});