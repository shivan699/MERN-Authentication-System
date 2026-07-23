import api from './axios.jsx';

export const sendChatMessage = (message, history) =>
  api.post('/api/chat/message', { message, history }).then((r) => r.data);