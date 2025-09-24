import FacileJS from '../framework/index.js';
import { GameScreen } from './components/GameScreen.js';

// --- Game State Management ---
let gameState = null;
let myId = null;

// --- Socket.io Connection ---
const socket = io("http://localhost:8080");
socket.on("connect", () => { console.log("✅ Connecté au serveur Socket.IO !"); });
socket.on("disconnect", () => { console.log("❌ Déconnecté du serveur Socket.IO"); });

socket.on('welcome', (data) => {
    myId = data.myId;
});

// --- Keyboard Input Handling for Tile-based Movement ---
const keyMap = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right' };
let moveInterval = null;
let currentDirection = null;
const MOVE_INTERVAL_MS = 120;

const stopMoving = (direction = null) => {
    if (direction && direction !== currentDirection) return;
    clearInterval(moveInterval);
    moveInterval = null;
    currentDirection = null;
};

const startMoving = (direction) => {
    if (direction === currentDirection) return;
    stopMoving();
    currentDirection = direction;
    socket.emit('move', { direction });
    moveInterval = setInterval(() => {
        socket.emit('move', { direction });
    }, MOVE_INTERVAL_MS);
};

const handleKeyDown = (e) => {
    const direction = keyMap[e.key];
    if (direction) {
        e.preventDefault();
        startMoving(direction);
    }
};

const handleKeyUp = (e) => {
    const direction = keyMap[e.key];
    if (direction) {
        e.preventDefault();
        stopMoving(direction);
    }
    if (e.key === ' ') {
        e.preventDefault();
        socket.emit('placeBomb');
    }
};

// --- App Component ---
const App = () => FacileJS.createElement(
    GameScreen,
    {
        onkeydown: handleKeyDown,
        onkeyup: handleKeyUp,
        gameState: gameState,
        myId: myId
    }
);

// --- App Initialization & Re-rendering ---
const root = document.getElementById('root');
const updateApp = FacileJS.createApp(App, root);

// --- Game State Update Listener ---
socket.on('gameState', (newState) => {
    gameState = newState;
    updateApp();
});