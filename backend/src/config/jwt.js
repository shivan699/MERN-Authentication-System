const jwt = require('jsonwebtoken');

// ------------------------------------------------------------------
// Validate required environment variables at module load time.
// Failing fast here (instead of at first token generation) ensures
// the app never runs in a misconfigured state.
// ------------------------------------------------------------------
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
];

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} = process.env;

/**
 * Generates a short-lived access token.
 * @param {Object} payload - Data to embed in the token (e.g. { id: user._id }).
 * @returns {string} Signed JWT access token.
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Generates a long-lived refresh token, used to obtain new access tokens
 * without requiring the user to log in again.
 * @param {Object} payload - Data to embed in the token (e.g. { id: user._id }).
 * @returns {string} Signed JWT refresh token.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Verifies an access token and returns its decoded payload.
 * @param {string} token - The JWT access token to verify.
 * @returns {Object} Decoded token payload.
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError} If the token is
 *   invalid, malformed, or expired.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Verifies a refresh token and returns its decoded payload.
 * @param {string} token - The JWT refresh token to verify.
 * @returns {Object} Decoded token payload.
 * @throws {jwt.JsonWebTokenError|jwt.TokenExpiredError} If the token is
 *   invalid, malformed, or expired.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};