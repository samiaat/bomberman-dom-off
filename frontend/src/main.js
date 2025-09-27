import FacileJS from '../framework/index.js';
import { GameScreen } from './components/GameScreen.js';
import { HomeScreen } from './components/HomeScreen.js';
import { WaitingRoom } from './components/WaitingRoom.js';
import { getAppState, joinGame, movePlayer, placeBomb, sendChatMessage } from './game.js';
import * as renderer from './renderer.js';

// --- Input State ---
const keysPressed = {};
const keysToTrack = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];

function handleKeyDown(e) {
    if (keysToTrack.includes(e.key)) e.preventDefault();
    keysPressed[e.key] = true;
}

function handleKeyUp(e) {
    if (keysToTrack.includes(e.key)) e.preventDefault();
    keysPressed[e.key] = false;
}

// --- Main App Component (The "Shell") ---
const App = () => {
    const { screen, gameState, myId, winner } = getAppState();

    switch (screen) {
        case 'waiting':
            return FacileJS.createElement(WaitingRoom, {
                players: gameState.players,
                countdown: gameState.countdown,
                status: gameState.status,
                chatMessages: gameState.chatMessages,
                myId: myId,
            });
        case 'game':
            return FacileJS.createElement(GameScreen, {
                gameState,
                myId,
                onkeydown: handleKeyDown,
                onkeyup: handleKeyUp
            });
        case 'gameover':
            return FacileJS.createElement('div', { class: 'game-over-screen' },
                FacileJS.createElement('h1', {}, 'Game Over'),
                winner ? FacileJS.createElement('h2', {}, `${winner.nickname} wins!`) : FacileJS.createElement('h2', {}, 'It\'s a draw!'),
                FacileJS.createElement('p', {}, 'Returning to lobby...'),
            );
        case 'home':
        default:
            return FacileJS.createElement(HomeScreen, { onNicknameSubmit: joinGame });
    }
};

// --- App Initialization ---
const root = document.getElementById('root');
const patchApp = FacileJS.createApp(App, root);

// --- High-Performance Game Loop ---
const TICK_RATE = 60;
const MS_PER_TICK = 1000 / TICK_RATE;
let lag = 0;
let lastTime = performance.now();


function update() {
    const appState = getAppState();
    if (appState.screen !== 'game' || !appState.gameState.players[appState.myId]) return;

    // Handle bomb placement (only once per press)
    if (keysPressed[' ']) {
        placeBomb();
        keysPressed[' '] = false; // Consume the key press
    }

    // Handle movement
    let direction = null;
    if (keysPressed['ArrowUp']) direction = 'up';
    else if (keysPressed['ArrowDown']) direction = 'down';
    else if (keysPressed['ArrowLeft']) direction = 'left';
    else if (keysPressed['ArrowRight']) direction = 'right';

    if (direction) {
        movePlayer(direction);
    }
}


function render() {
    // 1. Render dynamic entities via direct DOM manipulation (very fast)
    const { players } = getAppState().gameState;
    if (players) {
        Object.values(players).forEach(p => renderer.updatePlayerPosition(p));
    }

    // 2. Render the UI "shell" via the framework (slower, but only for non-critical UI)
    patchApp();
}

// The main loop that orchestrates updates and rendering.
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const elapsedTime = currentTime - lastTime;
    lastTime = currentTime;
    lag += elapsedTime;

    // If the tab was inactive, prevent the "death spiral" by resetting lag.
    if (lag > 1000) {
        lag = 0;
    }

   
    while (lag >= MS_PER_TICK) {
        update();
        lag -= MS_PER_TICK;
    }

    render();
}

requestAnimationFrame(gameLoop);