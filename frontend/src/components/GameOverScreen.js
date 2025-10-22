import FacileJS from '../../framework/index.js';

export const GameOverScreen = ({ winner, onRetry }) => {
    const title = winner ? `${winner.nickname} wins!` : 'It\'s a draw!';

    return FacileJS.createElement('div', { class: 'game-over-container' },
        FacileJS.createElement('div', { class: 'game-over-box' },
            FacileJS.createElement('h1', { class: 'game-over-title' }, 'Game Over'),
            FacileJS.createElement('h2', { class: 'game-over-winner' }, title),
            FacileJS.createElement('button', {
                class: 'retry-button',
                onclick: onRetry // This was missing. It triggers the restart flow.
            }, 'Play Again')
        )
    );
};