# Bomberman-DOM

**Bomberman-DOM** est un jeu multijoueur en temps réel développé en JavaScript (Node.js et Socket.IO pour le backend, et un framework virtuel DOM personnalisé nommé **FacileJS** pour le frontend). Il permet à 2 à 4 joueurs de s'affronter dans une arène dynamique en posant des bombes, en détruisant des obstacles, en collectant des bonus (power-ups) et en éliminant leurs adversaires.

---

## 🚀 Fonctionnalités Principales

- **Multijoueur en temps réel (2 à 4 joueurs) :**
  - Connexion des joueurs via WebSocket (Socket.IO).
  - Gestion automatique de la salle d'attente (Lobby) avec compte à rebours avant le lancement de la partie.
- **Système de Chat intégré :**
  - Chat en direct dans la salle d'attente pour discuter entre joueurs avant la partie.
- **Framework Frontend Maison (`FacileJS`) :**
  - Implémentation d'un Virtual DOM léger et réactif avec moteur de diffing/patching (`createElement`, `render`, `patch`, `createStore`, `createRouter`).
- **Gameplay dynamique & Moteur de jeu :**
  - Mouvement fluide avec gestion des collisions et glissements (sliding logic).
  - Génération procédurale de la carte avec murs incassables (fixes) et blocs destructibles.
  - Gestion des bombes, des explosions à portée variable et destruction des blocs.
  - Apparition aléatoire de Power-ups lors de la destruction de blocs :
    - 💣 **Bombs (+1)** : Augmente le nombre maximum de bombes posables simultanément.
    - 🔥 **Flame (+1)** : Augmente la portée de l'explosion des bombes.
    - ⚡ **Speed (+0.5)** : Augmente la vitesse de déplacement.
    - ❤️ **1UP (+1 Life)** : Octroie une vie supplémentaire.
- **Fin de partie & Rejouabilité :**
  - Détection automatique de la défaite/victoire (dernier survivant).
  - Écran de "Game Over" avec affichage du gagnant et bouton "Play Again" pour rejouer.

---

## 🛠️ Architecture du Projet

```text
.
├── backend/                # Code du serveur Node.js & Socket.IO
│   ├── package.json        # Dépendances backend (socket.io)
│   └── server.js           # Serveur HTTP, WebSocket & boucle de jeu (Game Loop)
├── frontend/               # Code client & interface utilisateur
│   ├── assets/             # Ressources graphiques (images)
│   ├── framework/          # Framework Frontend custom (FacileJS)
│   │   ├── dom.js          # Moteur Virtual DOM, createElement, render, patch, createApp
│   │   ├── event.js        # Gestionnaire d'événements DOM
│   │   ├── index.js        # Point d'entrée du framework
│   │   ├── router.js       # Gestionnaire de routes
│   │   └── state.js        # Redux-like Store (createStore)
│   ├── src/                # Code applicatif du jeu
│   │   ├── components/     # Composants de l'UI (HomeScreen, WaitingRoom, GameScreen, etc.)
│   │   ├── game.js         # Gestion de l'état local du jeu et communication Socket.IO
│   │   ├── main.js         # Point d'entrée de l'application client (Game Loop)
│   │   └── renderer.js     # Moteur d'affichage optimisé DOM pour le jeu
│   ├── index.html          # Fichier HTML principal
│   └── style.css           # Styles CSS du jeu et du lobby
└── README.md               # Documentation du projet
```

---

## 🎮 Contrôles du Jeu

| Touche | Action |
| :--- | :--- |
| **Flèche Haut** (`↑`) | Déplacer le personnage vers le haut |
| **Flèche Bas** (`↓`) | Déplacer le personnage vers le bas |
| **Flèche Gauche** (`←`) | Déplacer le personnage vers la gauche |
| **Flèche Droite** (`→`) | Déplacer le personnage vers la droite |
| **Espace** (`Space`) | Poser une bombe |

---

## 💻 Installation et Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) (version 14 ou supérieure recommandée)
- npm (fourni avec Node.js)

### 1. Installation des dépendances du Backend

Rendez-vous dans le dossier `backend` et installez les dépendances :

```bash
cd backend
npm install
```

### 2. Démarrage du serveur

Démarrez le serveur HTTP et WebSocket :

```bash
npm start
```

Le serveur démarrera sur **`http://localhost:8080/`**.

### 3. Accès au jeu

Ouvrez un navigateur web (Google Chrome, Firefox, Edge, Safari...) et accédez à :
```text
http://localhost:8080/
```

Pour tester le multijoueur, ouvrez plusieurs onglets ou fenêtres de navigateur à l'adresse `http://localhost:8080/`. Entrez un pseudo pour chaque joueur pour rejoindre la salle d'attente et lancer la partie !

---

## 🧪 Technologies Utilisées

- **Langage :** JavaScript (ES6+ Module)
- **Backend :** Node.js, Socket.IO, HTTP Native Server
- **Frontend :** HTML5, CSS3, FacileJS (Framework Custom VDOM)
