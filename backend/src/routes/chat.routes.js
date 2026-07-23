const express = require('express');
const { postMessage } = require('../controllers/chat.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

// @route   POST /api/chat/message
// @access  Private
router.post('/message', protect, postMessage);

module.exports = router;