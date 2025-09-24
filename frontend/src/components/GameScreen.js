import FacileJS from '../../framework/index.js';

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
        // Handle the case where the player has been eliminated
        return FacileJS.createElement('div', { class: 'stats-panel eliminated' },
            FacileJS.createElement('h3', {}, 'ÉLIMINÉ !')
        );
    }
};

export const GameScreen = (props) => {
    const { gameState, onkeydown, onkeyup, myId } = props;

    // Main container for the entire game view
    const mainContainer = FacileJS.createElement('div', { class: 'main-container' });

    if (!gameState || !gameState.map) {
        const loadingScreen = FacileJS.createElement('div', { class: 'loading-screen' }, 'Loading game state...');
        mainContainer.children.push(loadingScreen);
        // Still render an empty stats panel during initial load
        mainContainer.children.push(FacileJS.createElement(StatsDisplay, null));
        return mainContainer;
    }

    const { map, players, bombs, powerUps } = gameState;
    const me = players[myId];

    const tileTypeToClass = { 0: 'floor', 1: 'wall', 2: 'block' };

    const gameBoard = FacileJS.createElement('div', {
            class: 'game-board',
            onkeydown: onkeydown,
            onkeyup: onkeyup,
            tabindex: "0",
            autofocus: true
        },
        ...map.map(row => row.map(tile => FacileJS.createElement('div', { class: `tile ${tileTypeToClass[tile]}` }))).flat(),
        ...Object.values(players).map(player => FacileJS.createElement('div', { class: 'player', style: `left: ${player.x * 40}px; top: ${player.y * 40}px;` })),
        ...(bombs || []).map(bomb => FacileJS.createElement('div', { class: 'bomb', style: `left: ${bomb.x * 40}px; top: ${bomb.y * 40}px;` })),
        ...(powerUps || []).map(powerUp => FacileJS.createElement('div', { class: `powerup ${powerUp.type}`, style: `left: ${powerUp.x * 40}px; top: ${powerUp.y * 40}px;` }, powerUp.type === 'oneup' ? '1UP' : powerUp.type.charAt(0).toUpperCase()))
    );

    mainContainer.children.push(gameBoard);
    // Pass the current player's data (which could be undefined) to the stats display
    mainContainer.children.push(FacileJS.createElement(StatsDisplay, me));

    return mainContainer;
};