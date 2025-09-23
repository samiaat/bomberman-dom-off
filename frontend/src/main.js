// FacileJS Bomberman - From Scratch
console.log("Frontend script loaded.");

// Connect to the WebSocket server
const socket = io("http://localhost:8080");
socket.on("connect", () => { console.log("✅ Connecté au serveur Socket.IO !"); });
socket.on("disconnect", () => { console.log("❌ Déconnecté du serveur Socket.IO"); });

// Import the framework and the main game screen component
import FacileJS from '../framework/index.js';
import { GameScreen } from './components/GameScreen.js';

// --- Keyboard Input Handling ---
const handleKeyDown = (e) => {
    const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };

    const direction = keyMap[e.key];
    if (direction) {
        e.preventDefault(); // Prevent scrolling the page with arrow keys
        socket.emit('move', { direction });
    }
};

// The main App component now passes the keydown handler directly to the GameScreen component
const App = () => FacileJS.createElement(GameScreen, { onkeydown: handleKeyDown });

// Mount the app to the root element
const root = document.getElementById('root');
FacileJS.createApp(App, root);
