console.log("Frontend script loaded.");

// Pas besoin d'import, "io" est déjà global
const socket = io("http://localhost:8080");

socket.on("connect", () => {
  console.log("✅ Connecté au serveur Socket.IO !");
});

socket.on("disconnect", () => {
  console.log("❌ Déconnecté du serveur Socket.IO");
});

