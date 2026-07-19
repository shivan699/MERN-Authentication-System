const express = require('express');
const { getProfile } = require('../controllers/user.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

// @route   GET /api/user/profile
// @access  Private
router.get('/profile', protect, getProfile);

module.exports = router;