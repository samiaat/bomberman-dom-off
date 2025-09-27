// This object will hold direct references to the layer container elements
const layers = {
    powerups: null,
    bombs: null,
    players: null,
    explosions: null,
};

// This will store a map of entity ID -> DOM element
const entityElements = new Map();

function createPlayerElement(player) {
    const el = document.createElement('div');
    el.className = 'player';
    el.style.backgroundColor = player.color;
    // All other styles are defined in style.css, we only set dynamic properties
    el.style.transform = `translate(${player.x * 40}px, ${player.y * 40}px)`;
    return el;
}

function createBombElement(bomb) {
    const el = document.createElement('div');
    el.className = 'bomb';
    el.style.transform = `translate(${bomb.x * 40}px, ${bomb.y * 40}px)`;
    return el;
}

function createPowerupElement(powerup) {
    const el = document.createElement('div');
    el.className = `powerup ${powerup.type}`;
    el.textContent = powerup.type === 'oneup' ? '1UP' : powerup.type.charAt(0).toUpperCase();
    el.style.transform = `translate(${powerup.x * 40}px, ${powerup.y * 40}px)`;
    return el;
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
        // If player doesn't exist, create it. This can happen on game start.
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
        const el = document.createElement('div');
        el.className = 'explosion';
        el.style.position = 'absolute';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundColor = 'orange';
        el.style.opacity = '0.8';
        el.style.transform = `translate(${exp.x * 40}px, ${exp.y * 40}px)`;
        layers.explosions.appendChild(el);
    });
}