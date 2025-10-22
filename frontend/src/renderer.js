import FacileJS from '../framework/index.js';

// --- Couches de Rendu (Layers) ---
const layers = {
    powerups: null,
    bombs: null,
    players: null,
    explosions: null,
};

// --- Cache des Éléments DOM ---
const entityElements = new Map();

// --- Fonctions de Création d'Éléments ---
// Ces fonctions créent maintenant des éléments DOM en utilisant la fonction `render` du framework,
// ce qui garantit une cohérence totale dans toute l'application.

function createPlayerElement(player) {
    const vNode = FacileJS.createElement('div', {
        class: 'player',
        style: `background-color: ${player.color}; transform: translate(${player.x * 40}px, ${player.y * 40}px);`
    });
    return FacileJS.render(vNode);
}

function createBombElement(bomb) {
    const vNode = FacileJS.createElement('div', {
        class: 'bomb',
        style: `transform: translate(${bomb.x * 40}px, ${bomb.y * 40}px);`
    });
    return FacileJS.render(vNode);
}

function createPowerupElement(powerup) {
    const vNode = FacileJS.createElement('div', {
        class: `powerup ${powerup.type}`,
        style: `transform: translate(${powerup.x * 40}px, ${powerup.y * 40}px);`
    }, powerup.type === 'oneup' ? '1UP' : powerup.type.charAt(0).toUpperCase());
    return FacileJS.render(vNode);
}

// --- Fonctions exportées pour gérer le rendu ---

export function registerLayer(layerName, element) {
    if (element) {
        layers[layerName] = element;
    }
}

export function addEntity(entityType, entity) {
    const layerName = entityType;
    if (!layers[layerName] || !entity || !entity.id) return;

    if (entityElements.has(entity.id)) {
        if (layerName === 'players') {
            const element = entityElements.get(entity.id);
            element.classList.remove('eliminated');
        }
        return;
    }

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

export function markAsEliminated(entityId) {
    if (entityElements.has(entityId)) {
        const element = entityElements.get(entityId);
        element.classList.add('eliminated');
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
    for (const layerName in layers) {
        if (layers[layerName]) {
            layers[layerName].innerHTML = '';
        }
    }
    entityElements.clear();
    layers.powerups = null;
    layers.bombs = null;
    layers.players = null;
    layers.explosions = null;
}

export function renderExplosions(explosions) {
    clearLayer('explosions');
    explosions.forEach(exp => {
        const vNode = FacileJS.createElement('div', {
            class: 'explosion',
            style: `transform: translate(${exp.x * 40}px, ${exp.y * 40}px); background-color: orange; opacity: 0.8;`
        });
        const el = FacileJS.render(vNode);
        layers.explosions.appendChild(el);
    });
}