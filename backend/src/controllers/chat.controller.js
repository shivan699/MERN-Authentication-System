const { sendSuccess, sendError } = require('../utils/response');
const { generateChatReply } = require('../services/ai.service');

// ------------------------------------------------------------------
// @desc    Send a chat message to CareerPulse AI and get a reply
// @route   POST /api/chat/message
// @access  Private (requires access token via `protect` middleware)
// ------------------------------------------------------------------
const postMessage = async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return sendError(res, 400, 'Message is required');
    }

    // `history` is the prior conversation, sent by the client so the
    // backend stays stateless (no chat session storage needed for now).
    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: 'user', content: message.trim() },
    ];

    const reply = await generateChatReply(messages);

    return sendSuccess(res, 200, 'Reply generated', { reply });
  } catch (error) {
    next(error);
  }
};

module.exports = { postMessage };