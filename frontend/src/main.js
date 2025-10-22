import FacileJS from '../framework/index.js';

import { GameScreen } from './components/GameScreen.js';
import { HomeScreen } from './components/HomeScreen.js';
import { WaitingRoom } from './components/WaitingRoom.js';
import { GameOverScreen } from './components/GameOverScreen.js';

import { getAppState, joinGame, startMoving, stopMoving, placeBomb, sendChatMessage, requestRestart } from './game.js';

import * as renderer from './renderer.js';

// --- Input State ---
const keysPressed = {};
const keysToTrack = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];

function handleKeyDown(e) {
    if (keysToTrack.includes(e.key)) e.preventDefault();

    if (!keysPressed[e.key]) {
        keysPressed[e.key] = true; 
        let direction = null;

        if (e.key === 'ArrowUp') direction = 'up';
        if (e.key === 'ArrowDown') direction = 'down';
        if (e.key === 'ArrowLeft') direction = 'left';
        if (e.key === 'ArrowRight') direction = 'right';

        if (direction) {
            startMoving(direction);
        }
    }
}

function handleKeyUp(e) {
    if (keysToTrack.includes(e.key)) e.preventDefault();

    keysPressed[e.key] = false;

    let direction = null;
    if (e.key === 'ArrowUp') direction = 'up';
    if (e.key === 'ArrowDown') direction = 'down';
    if (e.key === 'ArrowLeft') direction = 'left';
    if (e.key === 'ArrowRight') direction = 'right';

    if (direction) {
        stopMoving(direction);
    }
}

function stopAllMovement() {
    const appState = getAppState();

    if (appState.screen !== 'game') {
        return;
    }

    for (const key in keysPressed) {
        if (keysPressed[key]) {
            let direction = null;
            if (key === 'ArrowUp') direction = 'up';
            if (key === 'ArrowDown') direction = 'down';
            if (key === 'ArrowLeft') direction = 'left';
            if (key === 'ArrowRight') direction = 'right';

            if (direction) {
                stopMoving(direction);
            }
            keysPressed[key] = false;
        }
    }
}

// --- Main App Component 

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
                onkeyup: handleKeyUp,
                onblur: stopAllMovement
            });
        case 'gameover':
            return FacileJS.createElement(GameOverScreen, { winner, onRetry: requestRestart });
        case 'home':
        default:
            return FacileJS.createElement(HomeScreen, { onNicknameSubmit: joinGame });
    }
};

// --- App Initialization ---
const root = document.getElementById('root');
const patchApp = FacileJS.createApp(App, root);

// --- High-Performance Game Loop ---
// Nombre de mises à jour par seconde
const TICK_RATE = 60;
const MS_PER_TICK = 1000 / TICK_RATE; // Durée d'une mise à jour en ms
let lag = 0;
let lastTime = performance.now();

// Fonction de mise à jour du jeu (logique fixe)
function update() {
    const appState = getAppState();

    // Si on n'est pas dans l'écran de jeu ou que le joueur n'existe pas, on quitte
    if (appState.screen !== 'game' || !appState.gameState.players[appState.myId]) return;

    // Si la touche espace est pressée, on place une bombe
    if (keysPressed[' ']) {
        placeBomb();
        keysPressed[' '] = false; 
    }
}

// Fonction de rendu 
function render() {
    const { players } = getAppState().gameState;

    if (players) {
        Object.values(players).forEach(p => renderer.updatePlayerPosition(p));
    }

    patchApp();
}

// Boucle principale qui gère l'update et le rendu
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);

    const elapsedTime = currentTime - lastTime; 
    lastTime = currentTime;
    lag += elapsedTime;

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
