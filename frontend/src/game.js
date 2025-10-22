import * as renderer from './renderer.js';

// --- Input State (maintenu ici) ---
const keysPressed = {};
const keysToTrack = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];

// --- Game State ---
// État global de l'application
let appState = {
    screen: 'home', 
    gameState: {
        status: 'waiting',   
        countdown: null,     
        map: [],            
        players: {},         
        bombs: [],           
        powerUps: [],        
        chatMessages: [],    
    },
    myId: null,   
    winner: null, 
};

// --- Socket.io Connection ---

const socket = io(":8080", { autoConnect: false, reconnection: false });

// --- State Management ---
function updateGameState(newPartialState) {
    appState.gameState = { ...appState.gameState, ...newPartialState };
}

function stopAllMovement() {
    for (const key in keysPressed) {   // Parcours toutes les touches enregistrées
        if (keysPressed[key]) {         // Si la touche est pressée
            let direction = null;
            if (key === 'ArrowUp') direction = 'up';
            if (key === 'ArrowDown') direction = 'down';
            if (key === 'ArrowLeft') direction = 'left';
            if (key === 'ArrowRight') direction = 'right';

            if (direction) {
                stopMoving(direction); // On envoie l'événement pour arrêter le mouvement
            }
            keysPressed[key] = false;  // On marque la touche comme relâchée
        }
    }
}

function updateScreen(newScreen) {
    if (appState.screen === 'game' && newScreen !== 'game') {
        stopAllMovement();
    }
    appState.screen = newScreen; 
}

// --- Event Listeners ---
socket.on("connect", () => console.log("✅ Connecté au serveur Socket.IO !"));

// Quand la connexion au serveur est perdue
socket.on("disconnect", () => {
    console.log("❌ Déconnecté du serveur Socket.IO");
    updateScreen('home');           
    renderer.clearAllEntities();    
});

socket.on('welcome', ({ myId, initialState }) => {
    appState.myId = myId;
    appState.gameState = initialState; 
    updateScreen('waiting');           
});

// Quand un nouveau joueur rejoint
socket.on('playerJoined', (newPlayer) => {
    updateGameState({ players: { ...appState.gameState.players, [newPlayer.id]: newPlayer } });
    renderer.addEntity('players', newPlayer);
});

// Quand un joueur quitte
socket.on('playerLeft', ({ id }) => {
    const newPlayers = { ...appState.gameState.players }; 
    delete newPlayers[id];                              
    updateGameState({ players: newPlayers });           
    renderer.removeEntity(id);                           
});

// Mise à jour du lobby (compteur ou statut)
socket.on('lobbyUpdate', ({ status, countdown }) => {
    updateGameState({ status, countdown });
});

// Quand le jeu commence
socket.on('gameStart', ({ map, players }) => {
    renderer.clearAllEntities(); 
    updateGameState({ map, players, bombs: [], powerUps: [] }); 
    updateScreen('game'); 
});

// Mise à jour des positions des joueurs (sans le rendu)
socket.on('playersMoved', (playersToUpdate) => {
    playersToUpdate.forEach(({ id, x, y }) => {
        if (appState.gameState.players[id]) {
            appState.gameState.players[id].x = x;
            appState.gameState.players[id].y = y;
        }
    });
});

// Quand une bombe est posée
socket.on('bombPlaced', (bomb) => {
    updateGameState({ bombs: [...appState.gameState.bombs, bomb] });
    renderer.addEntity('bombs', bomb);                              
});

// Quand une explosion se produit
socket.on('explosion', ({ coords, destroyedBlocks, newPowerUps, damagedPlayers, explodedBombIds }) => {
    const newMap = appState.gameState.map.map(row => [...row]);
    destroyedBlocks.forEach(({ x, y }) => { newMap[y][x] = 0; });

    const newPlayers = { ...appState.gameState.players };
    damagedPlayers.forEach(({ id, lives }) => {
        if (newPlayers[id]) {
            newPlayers[id] = { ...newPlayers[id], lives };
        }
    });

    // Mise à jour de l'état pour l'UI
    updateGameState({
        map: newMap,
        powerUps: [...appState.gameState.powerUps, ...newPowerUps],
        players: newPlayers,
        bombs: appState.gameState.bombs.filter(b => !explodedBombIds.includes(b.id)),
    });

    // Mise à jour du rendu
    explodedBombIds.forEach(id => renderer.removeEntity(id));
    newPowerUps.forEach(p => renderer.addEntity('powerups', p));
    renderer.renderExplosions(coords);
    setTimeout(() => {
        renderer.clearLayer('explosions'); // On supprime les explosions après 400ms
    }, 400);
});

// Quand un joueur ramasse un power-up
socket.on('powerUpCollected', ({ powerUpId, playerId, newStats }) => {
    updateGameState({
        powerUps: appState.gameState.powerUps.filter(p => p.id !== powerUpId), 
        players: { 
            ...appState.gameState.players, 
            [playerId]: { ...appState.gameState.players[playerId], ...newStats } 
        }
    });
    renderer.removeEntity(powerUpId); 
});

// Quand un joueur meurt
socket.on('playerDied', ({ player }) => {
    const newPlayers = { ...appState.gameState.players };
    if (newPlayers[player.id]) {
        newPlayers[player.id] = player; 
    }
    updateGameState({ players: newPlayers });
    renderer.markAsEliminated(player.id); 
});

// Quand le jeu est terminé
socket.on('gameOver', ({ winner }) => {
    appState.winner = winner; 
    updateScreen('gameover'); 
});

// Quand le serveur demande un reset
socket.on('reset', () => {
    socket.disconnect(); 
});

// Nouveaux messages de chat
socket.on('newChatMessage', (message) => {
    const currentMessages = appState.gameState.chatMessages || [];
    const newMessages = [...currentMessages, message]; 
    if (newMessages.length > 50) { newMessages.shift(); } 
    updateGameState({ chatMessages: newMessages });
});

// --- Actions ---
// Rejoindre une partie
export function joinGame(nickname) {
    if (!socket.connected && nickname && nickname.trim().length > 0 && nickname.length <= 20) {
        socket.connect();
        socket.once('connect', () => socket.emit('joinGame', { nickname }));
    } else {
        socket.emit('joinGame', { nickname });
    }
}

// Poser une bombe
export function placeBomb() { socket.emit('placeBomb'); }

// Commencer à se déplacer
export function startMoving(direction) { socket.emit('startMoving', { direction }); }

// Arrêter le mouvement
export function stopMoving(direction) { socket.emit('stopMoving', { direction }); }

// Envoyer un message de chat
export function sendChatMessage(message) { socket.emit('chatMessage', message); }

// Redemarrer la partie (côté client)
export function requestRestart() { socket.disconnect(); }

// --- Getters ---
// Récupérer l'état complet de l'application
export function getAppState() { return appState; }
