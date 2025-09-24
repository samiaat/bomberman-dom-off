import FacileJS from '../../framework/index.js';

export const WaitingRoom = (props) => {
    const { players, countdown } = props;
    const playerCount = Object.keys(players).length;

    return FacileJS.createElement('div', { class: 'waiting-room' },
        FacileJS.createElement('h2', {}, 'Salle d\'attente'),
        FacileJS.createElement('p', {}, `Joueurs connectés : ${playerCount} / 4`),
        countdown !== null
            ? FacileJS.createElement('p', { class: 'countdown' }, `La partie commence dans ${countdown}...`)
            : FacileJS.createElement('p', {}, 'En attente d\'autres joueurs...')
    );
};