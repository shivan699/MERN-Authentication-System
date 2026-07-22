import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

let socket = null;

/**
 * Opens a new authenticated socket connection using the current access
 * token (sent via the handshake, verified server-side in socket/index.js).
 * Closes any previous connection first.
 */
export const connectSocket = (accessToken) => {
  if (socket) socket.disconnect();
  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    autoConnect: true,
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;