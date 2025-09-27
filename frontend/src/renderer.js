import FacileJS from '../framework/index.js';

// This object will hold direct references to the layer container elements
const layers = {
    powerups: null,
    bombs: null,
    players: null,
    explosions: null,
};

// This will store a map of entity ID -> DOM element
const entityElements = new Map();


function manualRender(vNode) {
    const el = document.createElement(vNode.tag);

    // Apply props (like class, style, etc.)
    for (const [key, value] of Object.entries(vNode.props)) {
        el.setAttribute(key, value);
    }

    // Handle children (for text content in power-ups)
    for (const child of vNode.children) {
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(child.toString()));
        }
    }

    return el;
}


function createPlayerElement(player) {
    const vNode = FacileJS.createElement('div', {
        class: 'player',
        style: `background-color: ${player.color}; transform: translate(${player.x * 40}px, ${player.y * 40}px);`
    });
    return manualRender(vNode);
}

function createBombElement(bomb) {
    const vNode = FacileJS.createElement('div', {
        class: 'bomb',
        style: `transform: translate(${bomb.x * 40}px, ${bomb.y * 40}px);`
    });
    return manualRender(vNode);
}

function createPowerupElement(powerup) {
    const vNode = FacileJS.createElement('div', {
        class: `powerup ${powerup.type}`,
        style: `transform: translate(${powerup.x * 40}px, ${powerup.y * 40}px);`
    }, powerup.type === 'oneup' ? '1UP' : powerup.type.charAt(0).toUpperCase());
    return manualRender(vNode);
}

export function registerLayer(layerName, element) {
    if (element) {
        layers[layerName] = element;
    }
}

export function addEntity(entityType, entity) {
    const layerName = entityType;
    if (!layers[layerName] || !entity || !entity.id || entityElements.has(entity.id)) return;

    let element;
    if (layerName === 'players') element = createPlayerElement(entity);
    else if (layerName === 'bombs') element = createBombElement(entity);
    else if (layerName === 'powerups') element = createPowerupElement(entity);

    if (element) {
        entityElements.set(entity.id, element);
        layers[layerName].appendChild(element);
    }
}

export function removeEntity(entityId) {
    if (entityElements.has(entityId)) {
        const element = entityElements.get(entityId);
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        entityElements.delete(entityId);
    }
}

export function updatePlayerPosition(player) {
    if (entityElements.has(player.id)) {
        const element = entityElements.get(player.id);
        element.style.transform = `translate(${player.x * 40}px, ${player.y * 40}px)`;
    } else {
        addEntity('players', player);
    }
}

export function clearLayer(layerName) {
    if (layers[layerName]) {
        layers[layerName].innerHTML = '';
    }
}

export function clearAllEntities() {
    entityElements.forEach((el) => {
        if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });
    entityElements.clear();
}

export function renderExplosions(explosions) {
    clearLayer('explosions');
    explosions.forEach(exp => {
        const vNode = FacileJS.createElement('div', {
            class: 'explosion',
            style: `transform: translate(${exp.x * 40}px, ${exp.y * 40}px); background-color: orange; opacity: 0.8;`
        });
        const el = manualRender(vNode);
        layers.explosions.appendChild(el);
    });
}