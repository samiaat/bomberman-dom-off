import FacileJS from '../../framework/index.js';
import { sendChatMessage } from '../game.js';

export const WaitingRoom = (props) => {
    const { players, countdown, status, chatMessages, myId } = props;
    const playerCount = Object.keys(players || {}).length;

    const renderLobbyMessage = () => {
        if (status === 'countdown') {
            return FacileJS.createElement('p', { class: 'countdown' }, `La partie commence dans ${Math.ceil(countdown)}...`);
        }
        if (status === 'lobby') {
            return FacileJS.createElement('p', { class: 'lobby-countdown' }, `Démarrage dans ${Math.ceil(countdown)}s...`);
        }
        return FacileJS.createElement('p', {}, 'En attente d\'au moins 2 joueurs...');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const input = e.target.elements.message;
        const message = input.value.trim();
        if (message) {
            sendChatMessage(message);
            input.value = '';
        }
    };

    return FacileJS.createElement('div', { class: 'waiting-room-layout' },
        FacileJS.createElement('div', { class: 'waiting-room' },
            FacileJS.createElement('h2', {}, 'Salle d\'attente'),
            FacileJS.createElement('p', {}, `Joueurs connectés : ${playerCount} / 4`),
            renderLobbyMessage(),
            FacileJS.createElement('div', { class: 'player-list' },
                FacileJS.createElement('h3', {}, 'Joueurs :'),
                ...Object.values(players || {}).map(player =>
                    FacileJS.createElement('div', { class: 'player-list-item' },
                        FacileJS.createElement('div', { class: 'player-color-indicator', style: `background-color: ${player.color}` }),
                        FacileJS.createElement('span', {}, player.nickname)
                    )
                )
            )
        ),
        FacileJS.createElement('div', { class: 'chat-container' },
            FacileJS.createElement('h3', {}, 'Chat'),
            FacileJS.createElement('div', {
                class: 'chat-messages',
                ref: (el) => {
                    // This function is called after the element is rendered.
                    // We can use it to scroll to the bottom.
                    if (el) {
                        el.scrollTop = el.scrollHeight;
                    }
                }
            },
                ...(chatMessages || []).map(msg =>
                    FacileJS.createElement('p', {
                        key: msg.timestamp, // Add unique key for efficient re-rendering
                        class: `chat-message ${msg.senderId === myId ? 'my-message' : ''}`
                    },
                        FacileJS.createElement('strong', { style: `color: ${players[msg.senderId]?.color || '#ccc'}` }, `${msg.nickname}: `),
                        msg.message
                    )
                )
            ),
            FacileJS.createElement('form', { class: 'chat-form', onsubmit: handleFormSubmit },
                FacileJS.createElement('input', {
                    type: 'text',
                    name: 'message',
                    placeholder: 'Écrire un message...',
                    autocomplete: 'off',
                    maxlength: 100
                }),
                FacileJS.createElement('button', { type: 'submit' }, 'Envoyer')
            )
        )
    );
};