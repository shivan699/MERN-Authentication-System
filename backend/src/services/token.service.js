const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const RefreshToken = require('../models/RefreshToken');
const { emitToUser } = require('../socket');

// Should stay in sync with JWT_REFRESH_EXPIRES_IN in .env (e.g. "7d").
const REFRESH_TOKEN_TTL_DAYS = 7;

/**
 * Issues a new access + refresh token pair for a user and persists the
 * refresh token so it can be validated/revoked later.
 * @param {import('mongoose').Document} user
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
const issueAuthTokens = async (user) => {
  const payload = { id: user._id };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: user._id, token: refreshToken, expiresAt });

  return { accessToken, refreshToken };
};

/**
 * Verifies a refresh token (JWT signature + DB record), revokes it, and
 * issues a fresh access + refresh token pair (rotation — a stolen refresh
 * token can only be used once before it's invalidated).
 * @param {string} oldToken
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 * @throws {Error} with a `statusCode` property on invalid/expired/revoked tokens.
 */
const rotateRefreshToken = async (oldToken) => {
  // Throws jwt.JsonWebTokenError / jwt.TokenExpiredError if invalid.
  const decoded = verifyRefreshToken(oldToken);

  const stored = await RefreshToken.findOne({ token: oldToken, revoked: false });
  if (!stored) {
    const err = new Error('Refresh token not recognized or already revoked');
    err.statusCode = 401;
    throw err;
  }

  // Revoke the used token immediately (rotation).
  stored.revoked = true;
  await stored.save();

  const payload = { id: decoded.id };
  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ user: decoded.id, token: newRefreshToken, expiresAt });

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Revokes a single refresh token (logout from one device).
 * @param {string} token
 */
const revokeRefreshToken = async (token) => {
  const record = await RefreshToken.findOne({ token });
  await RefreshToken.updateOne({ token }, { revoked: true });

  if (record) {
    emitToUser(record.user, 'session-revoked', { reason: 'logout' });
  }
};

/**
 * Revokes every active refresh token for a user (e.g. after password
 * reset — forces re-login on all devices).
 * @param {string} userId
 */
const revokeAllUserTokens = async (userId) => {
  await RefreshToken.updateMany({ user: userId, revoked: false }, { revoked: true });
  emitToUser(userId, 'session-revoked', { reason: 'password-reset' });
};

module.exports = {
  issueAuthTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
}