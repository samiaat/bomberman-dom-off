import FacileJS from '../../framework/index.js';

export const HomeScreen = (props) => {
    const { onNicknameSubmit } = props;

    const handleSubmit = (e) => {
        e.preventDefault();
        const nickname = e.target.elements.nickname.value;
        if (nickname) {
            onNicknameSubmit(nickname);
        }
    };

    return FacileJS.createElement('div', { class: 'home-screen' },
        FacileJS.createElement('h1', {}, 'Bomberman DOM'),
        FacileJS.createElement('form', { onsubmit: handleSubmit },
            FacileJS.createElement('input', {
                type: 'text',
                name: 'nickname',
                placeholder: 'Entrez votre pseudo',
                required: true,
                maxLength: 12,
            }),
            FacileJS.createElement('button', { type: 'submit' }, 'Rejoindre la partie')
        )
    );
};