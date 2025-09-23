import FacileJS from '../../framework/index.js';

export const GameScreen = (props) => {
    const { gameState, onkeydown, onkeyup } = props;

    // If gameState is not yet available, show a loading message and still provide a focusable element
    if (!gameState || !gameState.map) {
        return FacileJS.createElement('div', {
            onkeydown: onkeydown,
            onkeyup: onkeyup,
            tabindex: "0",
            autofocus: true,
            class: 'loading-screen' // Add a class for styling
        }, 'Loading game state...');
    }

    const { map, players } = gameState;

    const tileTypeToClass = {
        0: 'floor',
        1: 'wall',
        2: 'block'
    };

    return FacileJS.createElement('div', {
            class: 'game-board',
            onkeydown: onkeydown, // Pass the event handler to the main game board
            onkeyup: onkeyup, // Pass the keyup handler as well
            tabindex: "0",
            autofocus: true
        },
        // Render the map tiles from the server-provided state
        ...map.map((row) =>
            row.map((tile) =>
                FacileJS.createElement('div', { class: `tile ${tileTypeToClass[tile]}` })
            )
        ).flat(),

        // Render all players from the server-provided state
        ...Object.values(players).map(player =>
            FacileJS.createElement('div', {
                class: 'player',
                style: `left: ${player.x * 40}px; top: ${player.y * 40}px;`
            })
        ),

        // Render all bombs from the server-provided state
        ...(gameState.bombs || []).map(bomb =>
            FacileJS.createElement('div', {
                class: 'bomb',
                style: `left: ${bomb.x * 40}px; top: ${bomb.y * 40}px;`
            })
        )
    );
};
