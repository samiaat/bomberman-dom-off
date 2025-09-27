import FacileJS from '../../framework/index.js';
import { PlayerPanel } from './PlayerPanel.js';
import { registerLayer } from '../renderer.js';

// A simple sub-component to display player stats
const StatsDisplay = (player) => {
    if (player) {
        return FacileJS.createElement('div', { class: 'stats-panel' },
            FacileJS.createElement('h3', {}, 'Mes Stats'),
            FacileJS.createElement('p', {}, `Vies: ${player.lives}`),
            FacileJS.createElement('p', {}, `Bombes Max: ${player.maxBombs}`),
            FacileJS.createElement('p', {}, `Portée Flamme: ${player.flameSize}`),
            FacileJS.createElement('p', {}, `Vitesse: ${player.speed}`),
        );
    } else {
        return FacileJS.createElement('div', { class: 'stats-panel eliminated' },
            FacileJS.createElement('h3', {}, 'ÉLIMINÉ !')
        );
    }
};

// --- Memoization Cache for the Map ---
let cachedMapVNodes = null;
let lastMapSignature = '';

const tileTypeToClass = { 0: 'floor', 1: 'wall', 2: 'block' };

export const GameScreen = (props) => {
    const { gameState, onkeydown, onkeyup, myId } = props;

    const gameLayout = FacileJS.createElement('div', { class: 'game-layout' });

    if (!gameState || !gameState.map || gameState.map.length === 0) {
        const loadingScreen = FacileJS.createElement('div', { class: 'loading-screen' }, 'Loading game state...');
        gameLayout.children.push(loadingScreen);
        return gameLayout;
    }

    const { map, players } = gameState;
    const me = players[myId];

    // --- Map Caching Logic ---
    const currentMapSignature = map.map(row => row.join('')).join(';');
    let mapVNodes;
    if (currentMapSignature === lastMapSignature) {
        mapVNodes = cachedMapVNodes;
    } else {
        console.log("Map has changed, re-rendering tiles...");
        mapVNodes = map.map(row =>
            row.map(tile => FacileJS.createElement('div', { class: `tile ${tileTypeToClass[tile]}` }))
        ).flat();
        cachedMapVNodes = mapVNodes;
        lastMapSignature = currentMapSignature;
    }

    // --- Assemble the Game Board ---
    const gameBoard = FacileJS.createElement('div', {
            class: 'game-board',
            onkeydown: onkeydown,
            onkeyup: onkeyup,
            tabindex: "0",
            autofocus: true
        },
        FacileJS.createElement('div', { class: 'map-layer' }, ...mapVNodes),
        FacileJS.createElement('div', { class: 'powerups-layer', ref: (el) => registerLayer('powerups', el) }),
        FacileJS.createElement('div', { class: 'bombs-layer', ref: (el) => registerLayer('bombs', el) }),
        FacileJS.createElement('div', { class: 'players-layer', ref: (el) => registerLayer('players', el) }),
        FacileJS.createElement('div', { class: 'explosions-layer', ref: (el) => registerLayer('explosions', el) })
    );

    // Add panels and game board to the layout
    gameLayout.children.push(FacileJS.createElement(PlayerPanel, { players, myId }));
    gameLayout.children.push(gameBoard);
    gameLayout.children.push(FacileJS.createElement(StatsDisplay, me));

    return gameLayout;
};