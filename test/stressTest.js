require('dotenv').config();
const { io } = require("socket.io-client");

const BASE_URL = process.env.SOCKET_SERVER_URL || "http://34.56.8.190:4000"; // Cambia esto si es necesario
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS || 100); // Total de usuarios (debe ser múltiplo de 2)
const ROOM_PREFIX = "Room_"; // Prefijo para los nombres de salas
const USERS_PER_ROOM = 2; // Dos usuarios por sala: 1 creador, 1 visitante

if (TOTAL_USERS % USERS_PER_ROOM !== 0) {
    console.error("El número total de usuarios debe ser múltiplo de 2.");
    process.exit(1);
}

// Movimientos predefinidos para la partida
const MOVES = [
    "e4", "e5", "f4", "exf4", "Bc4", "Qh4+", "Kf1", "b5", 
    "Bxb5", "Nf6", "Nf3", "Qh6", "d3", "Nh5", "Nh4", "Qg5", 
    "Nf5", "c6", "g4", "Nf6", "Rg1", "cxb5", "h4", "Qg6", 
    "h5", "Qg5", "Qf3", "Ng8", "Bxf4", "Qf6", "Nc3", "Bc5", 
    "Nd5", "Qxb2", "Bd6", "Bxg1", "e5", "Qxa1", "Nxg7+", "Kd8", 
    "Bc7#", 
];

// Función para esperar un tiempo (sleep)
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Función para simular un usuario
function simulateUser(userId) {
    return new Promise(async (resolve) => {
        const socket = io(BASE_URL, {
            transports: ["websocket"], // Usar WebSocket directamente
        });

        socket.on("connect", async () => {
            console.log(`Usuario ${userId} conectado: ${socket.id}`);

            const roomIndex = Math.floor(userId / USERS_PER_ROOM); // Cada 2 usuarios comparten una sala
            const roomId = `${ROOM_PREFIX}${roomIndex}`;
            const isCreator = userId % USERS_PER_ROOM === 0;

            if (isCreator) {
                // Crear una sala
                socket.emit("createRoom", {
                    name: roomId,
                    password: "",
                    creatorIsBlack: Math.random() < 0.5, // Elegir color aleatoriamente
                });
                console.log(`Usuario ${userId} creó la sala: ${roomId}`);
            } else {
                // Esperar a que la sala esté creada y unirse
                await sleep(3000); // Espera para sincronización
                socket.emit("joinRoom", roomId, socket.id);
                console.log(`Usuario ${userId} se unió a la sala: ${roomId}`);
            }

            // Simular movimientos alternados
            const isWhite = isCreator; // El creador será las blancas
            await sleep(5000); // Esperar a que ambos jugadores estén listos
            for (let i = 0; i < MOVES.length; i++) {
                if ((i % 2 === 0 && isWhite) || (i % 2 !== 0 && !isWhite)) {
                    await sleep(1000); // 1 segundo entre movimientos
                    socket.emit("move", { move: MOVES[i], roomId });
                    console.log(`Usuario ${userId} jugó: ${MOVES[i]}`);
                }
            }

            // Salir de la sala
            await sleep(2000); // Pausa antes de salir
            socket.emit("leftRoom", roomId);
            console.log(`Usuario ${userId} dejó la sala: ${roomId}`);
            socket.disconnect();
            resolve(); // Finaliza la simulación de este usuario
        });

        socket.on("disconnect", () => {
            console.log(`Usuario ${userId} desconectado.`);
        });

        socket.on("error", (error) => {
            console.error(`Error del usuario ${userId}:`, error);
            resolve(); // Finaliza incluso si hay un error
        });
    });
}

// Crear múltiples usuarios simultáneamente
(async () => {
    const totalRooms = TOTAL_USERS / USERS_PER_ROOM; // Número total de salas
    console.log(`Iniciando test con ${TOTAL_USERS} usuarios (${totalRooms} salas)...`);

    // Crear todos los usuarios simultáneamente
    const users = Array.from({ length: TOTAL_USERS }, (_, i) => simulateUser(i + 1));
    await Promise.all(users); // Esperar a que todos los usuarios terminen

    console.log("Test completado.");
})();
