import FacileJS from '../../framework/index.js';

// 0 = floor, 1 = indestructible wall, 2 = destructible block
const MAP_WIDTH = 15;
const MAP_HEIGHT = 13;

// Function to generate the initial map
const generateMap = () => {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(0));

    // Create indestructible walls border
    for (let i = 0; i < MAP_HEIGHT; i++) {
        map[i][0] = 1;
        map[i][MAP_WIDTH - 1] = 1;
    }
    for (let j = 0; j < MAP_WIDTH; j++) {
        map[0][j] = 1;
        map[MAP_HEIGHT - 1][j] = 1;
    }

    // Create inner indestructible walls (checkerboard pattern)
    for (let i = 2; i < MAP_HEIGHT - 1; i += 2) {
        for (let j = 2; j < MAP_WIDTH - 1; j += 2) {
            map[i][j] = 1;
        }
    }

    // Place destructible blocks randomly, avoiding player start areas
    for (let i = 0; i < MAP_HEIGHT; i++) {
        for (let j = 0; j < MAP_WIDTH; j++) {
            if (map[i][j] !== 0) continue; // Skip if not a floor tile

            // Define player corner areas to keep clear
            const isTopLeft = i < 3 && j < 3;
            const isTopRight = i < 3 && j > MAP_WIDTH - 4;
            const isBottomLeft = i > MAP_HEIGHT - 4 && j < 3;
            const isBottomRight = i > MAP_HEIGHT - 4 && j > MAP_WIDTH - 4;

            if (isTopLeft || isTopRight || isBottomLeft || isBottomRight) {
                continue;
            }

            if (Math.random() > 0.25) { 
                map[i][j] = 2;
            }
        }
    }

    return map;
};

const mapData = generateMap();
const player = { id: 1, x: 1, y: 1 };

export const GameScreen = () => {
    const tileTypeToClass = {
        0: 'floor',
        1: 'wall',
        2: 'block'
    };

    return FacileJS.createElement('div', { class: 'game-board' },
        ...mapData.map((row, y) =>
            row.map((tile, x) =>
                FacileJS.createElement('div', { class: `tile ${tileTypeToClass[tile]}` })
            )
        ).flat(),
        FacileJS.createElement('div', {
            class: 'player',
            style: `left: ${player.x * 40}px; top: ${player.y * 40}px;`
        })
    );
};
