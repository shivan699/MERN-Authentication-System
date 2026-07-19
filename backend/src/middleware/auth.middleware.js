const { verifyAccessToken } = require('../config/jwt');
const { extractBearerToken } = require('../utils/jwt');

// ------------------------------------------------------------------
// Middleware: protect
// Verifies the JWT access token from the Authorization header and
// attaches the decoded payload ({ id: user._id }) to req.user.
// ------------------------------------------------------------------
const protect = (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
      });
    }

    // Throws jwt.TokenExpiredError or jwt.JsonWebTokenError on failure.
    const decoded = verifyAccessToken(token);
    req.user = decoded;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
      });
    }

    console.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while authenticating the request',
    });
  }
};

module.exports = protect;