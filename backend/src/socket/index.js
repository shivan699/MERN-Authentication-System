const { Server } = require('socket.io');
const { verifyAccessToken } = require('../config/jwt');

let io;

// Tracks every open socket connection per user, so an event can be
// pushed to ALL of a user's open tabs/devices at once (e.g. force
// logout on every device after a password reset).
const userSockets = new Map(); // userId -> Set<socketId>

/**
 * Initializes Socket.io on top of the existing HTTP server and wires
 * up JWT-based authentication for each connection.
 * @param {import('http').Server} httpServer
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true,
    },
  });

  // Every socket must present the same access token used for REST
  // requests, sent via the client's `auth: { token }` handshake option.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication token missing'));

      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;

    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket.id);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
    });
  });

  return io;
};

/**
 * Pushes a real-time event to every open connection belonging to a user.
 * @param {string} userId
 * @param {string} event
 * @param {object} payload
 */
const emitToUser = (userId, event, payload) => {
  if (!io) return;
  const socketIds = userSockets.get(String(userId));
  if (!socketIds) return;
  socketIds.forEach((id) => io.to(id).emit(event, payload));
};

module.exports = { initSocket, emitToUser };