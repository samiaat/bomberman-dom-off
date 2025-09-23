import FacileJS from '../framework/index.js';
import { GameScreen } from './components/GameScreen.js';

// --- Game State Management ---
let gameState = null;

// --- Socket.io Connection ---
const socket = io("http://localhost:8080");
socket.on("connect", () => { console.log("✅ Connecté au serveur Socket.IO !"); });
socket.on("disconnect", () => { console.log("❌ Déconnecté du serveur Socket.IO"); });

// --- Keyboard Input Handling for Continuous Movement ---
const keysPressed = {};
const keyMap = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right' };

const handleKeyDown = (e) => {
    const direction = keyMap[e.key];
    if (direction && !keysPressed[e.key]) {
        e.preventDefault();
        keysPressed[e.key] = true;
        socket.emit('startMove', { direction });
    }
};

const handleKeyUp = (e) => {
    const direction = keyMap[e.key];
    if (direction) {
        e.preventDefault();
        keysPressed[e.key] = false;
        socket.emit('stopMove', { direction });
    }
};

// --- App Component ---
const App = () => FacileJS.createElement(
    GameScreen,
    {
        onkeydown: handleKeyDown,
        onkeyup: handleKeyUp,
        gameState: gameState
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
