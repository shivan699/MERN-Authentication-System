 const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

// ------------------------------------------------------------------
// @desc    Get the authenticated user's profile
// @route   GET /api/user/profile
// @access  Private (requires valid access token via `protect` middleware)
// ------------------------------------------------------------------
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, 'User profile fetched successfully', user);
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile };