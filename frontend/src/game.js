import * as renderer from './renderer.js';

// --- Game State ---
let appState = {
    screen: 'home', // 'home', 'waiting', 'game', 'gameover'
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
const socket = io("http://localhost:8080", { autoConnect: false });

// --- State Management ---
// We still update the state for non-rendering logic (like UI panels)
function updateGameState(newPartialState) {
    appState.gameState = { ...appState.gameState, ...newPartialState };
}
function updateScreen(newScreen) {
    appState.screen = newScreen;
}

// --- Event Listeners ---
socket.on("connect", () => console.log("✅ Connecté au serveur Socket.IO !"));

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

socket.on('playerJoined', (newPlayer) => {
    updateGameState({ players: { ...appState.gameState.players, [newPlayer.id]: newPlayer } });
    renderer.addEntity('players', newPlayer);
});

socket.on('playerLeft', ({ id }) => {
    const newPlayers = { ...appState.gameState.players };
    delete newPlayers[id];
    updateGameState({ players: newPlayers });
    renderer.removeEntity(id);
});

socket.on('lobbyUpdate', ({ status, countdown }) => {
    updateGameState({ status, countdown });
});

socket.on('gameStart', ({ map, players }) => {
    renderer.clearAllEntities();
    updateGameState({ map, players, bombs: [], powerUps: [] });
    Object.values(players).forEach(p => renderer.addEntity('players', p));
    updateScreen('game');
});

// Player positions are updated in the render loop, not here.
// We just update the data model.
socket.on('playerMoved', ({ id, x, y }) => {
    if (appState.gameState.players[id]) {
        appState.gameState.players[id].x = x;
        appState.gameState.players[id].y = y;
    }
});

socket.on('bombPlaced', (bomb) => {
    updateGameState({ bombs: [...appState.gameState.bombs, bomb] });
    renderer.addEntity('bombs', bomb);
});

socket.on('explosion', ({ coords, destroyedBlocks, newPowerUps, damagedPlayers, explodedBombIds }) => {
    // Update map data
    const newMap = appState.gameState.map.map(row => [...row]);
    destroyedBlocks.forEach(({ x, y }) => { newMap[y][x] = 0; });

    // Update player data
    const newPlayers = { ...appState.gameState.players };
    damagedPlayers.forEach(({ id, lives }) => {
        if (newPlayers[id]) {
            newPlayers[id] = { ...newPlayers[id], lives };
        }
    });

    // Update state for UI panels
    updateGameState({
        map: newMap,
        powerUps: [...appState.gameState.powerUps, ...newPowerUps],
        players: newPlayers,
        bombs: appState.gameState.bombs.filter(b => !explodedBombIds.includes(b.id)),
    });

    // Update renderer
    explodedBombIds.forEach(id => renderer.removeEntity(id));
    newPowerUps.forEach(p => renderer.addEntity('powerups', p));
    renderer.renderExplosions(coords);
    setTimeout(() => {
        renderer.clearLayer('explosions');
    }, 400);
});

socket.on('powerUpCollected', ({ powerUpId, playerId, newStats }) => {
    updateGameState({
        powerUps: appState.gameState.powerUps.filter(p => p.id !== powerUpId),
        players: { ...appState.gameState.players, [playerId]: { ...appState.gameState.players[playerId], ...newStats } }
    });
    renderer.removeEntity(powerUpId);
});

socket.on('playerDied', ({ id }) => {
    const newPlayers = { ...appState.gameState.players };
    delete newPlayers[id];
    updateGameState({ players: newPlayers });
    renderer.removeEntity(id);
});

socket.on('gameOver', ({ winner }) => {
    appState.winner = winner;
    updateScreen('gameover');
});

socket.on('reset', () => {
    renderer.clearAllEntities();
    updateGameState({ status: 'waiting', countdown: null, map: [], players: {}, bombs: [], powerUps: [], chatMessages: [] });
    appState.winner = null;
    updateScreen('home');
});

socket.on('newChatMessage', (message) => {
    // Ensure chatMessages is always an array before trying to spread it.
    const currentMessages = appState.gameState.chatMessages || [];
    const newMessages = [...currentMessages, message];
    // Keep only the last 50 messages to avoid performance issues
    if (newMessages.length > 50) {
        newMessages.shift();
    }
    updateGameState({ chatMessages: newMessages });
});

// --- Actions ---
export function joinGame(nickname) {
    if (!socket.connected) {
        socket.connect();
        socket.once('connect', () => socket.emit('joinGame', { nickname }));
    } else {
        socket.emit('joinGame', { nickname });
    }
}

export function placeBomb() {
    socket.emit('placeBomb');
}

export function movePlayer(direction) {
    socket.emit('move', { direction });
}

export function sendChatMessage(message) {
    socket.emit('chatMessage', message);
}

// --- Getters ---
export function getAppState() {
    return appState;
}