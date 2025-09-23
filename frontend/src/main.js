console.log("Frontend script loaded.");

// Pas besoin d'import, "io" est déjà global
const socket = io("http://localhost:8080");

socket.on("connect", () => {
  console.log("✅ Connecté au serveur Socket.IO !");
});

socket.on("disconnect", () => {
  console.log("❌ Déconnecté du serveur Socket.IO");
});

// Import the framework and the main game screen component
import FacileJS from '../framework/index.js';
import { GameScreen } from './components/GameScreen.js';

// The main App component now simply renders the GameScreen
const App = () => FacileJS.createElement(GameScreen, {});

// Mount the app to the root element
const root = document.getElementById('root');
FacileJS.createApp(App, root);

// --- Keyboard Input Handling ---
window.addEventListener('keydown', (e) => {
    const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };

    const direction = keyMap[e.key];
    if (direction) {
        e.preventDefault();
        socket.emit('move', { direction });
    }
});