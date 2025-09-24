import FacileJS from '../../framework/index.js';

export const PlayerPanel = (props) => {
    const { players, myId } = props;

    if (!players || Object.keys(players).length === 0) {
        return null;
    }

    return FacileJS.createElement('div', { class: 'player-panel' },
        FacileJS.createElement('h3', {}, 'Joueurs'),
        ...Object.entries(players).map(([id, player]) => {
            const isMe = id === myId;
            const cardClass = isMe ? 'player-color-card me' : 'player-color-card';

            return FacileJS.createElement('div', { class: cardClass },
                FacileJS.createElement('div', {
                    class: 'player-color-indicator',
                    style: `background-color: ${player.color};`
                })
            );
        })
    );
};