import FacileJS from '../../framework/index.js';
import { PlayerPanel } from './PlayerPanel.js';
import { registerLayer } from '../renderer.js';

// A simple sub-component to display player stats
const StatsDisplay = (player) => {
    // Check if the player exists and is alive to show stats.
    if (player && player.isAlive) {
        return FacileJS.createElement('div', { class: 'stats-panel' },
            FacileJS.createElement('h3', {}, 'Mes Stats'),
            FacileJS.createElement('p', {}, `Vies: ${player.lives}`),
            FacileJS.createElement('p', {}, `Bombes Max: ${player.maxBombs}`),
            FacileJS.createElement('p', {}, `Portée Flamme: ${player.flameSize}`),
            FacileJS.createElement('p', {}, `Vitesse: ${player.speed}`),
        );
    } else {
        // Otherwise, show the eliminated message.
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
    const { gameState, onkeydown, onkeyup, onblur, myId } = props;

    const gameLayout = FacileJS.createElement('div', { class: 'game-layout' });

    if (!gameState || !gameState.map || gameState.map.length === 0) {
        const loadingScreen = FacileJS.createElement('div', { class: 'loading-screen' }, 'Loading game state...');
        gameLayout.children.push(loadingScreen);
        return gameLayout;
    }

    const { map, players } = gameState;
    const me = players ? players[myId] : null;

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
    // The component now only renders the static map and empty containers for dynamic entities.
    // The `ref` prop gives us a direct DOM reference to the layer element, which we pass to our renderer.
    const gameBoard = FacileJS.createElement('div', {
            class: 'game-board',
            onkeydown: onkeydown,
            onkeyup: onkeyup,
           onblur: props.onblur, // ✅ ajouté ici
    tabindex: "0",
    
        },
        FacileJS.createElement('div', { class: 'map-layer' }, ...mapVNodes),
        FacileJS.createElement('div', { class: 'powerups-layer', ref: (el) => registerLayer('powerups', el) }),
        FacileJS.createElement('div', { class: 'bombs-layer', ref: (el) => registerLayer('bombs', el) }),
        FacileJS.createElement('div', { class: 'players-layer', ref: (el) => registerLayer('players', el) }),
        FacileJS.createElement('div', { class: 'explosions-layer', ref: (el) => registerLayer('explosions', el) })
    );

    // Add panels and game board to the layout
    // We pass the complete list of players to the panel
    // so it can display everyone's status, even if they are eliminated.
    gameLayout.children.push(FacileJS.createElement(PlayerPanel, { players, myId }));
    gameLayout.children.push(gameBoard);
    gameLayout.children.push(FacileJS.createElement(StatsDisplay, me));

    return gameLayout;
};