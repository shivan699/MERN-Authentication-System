const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password.
 * @param {string} password - Plain-text password.
 * @returns {Promise<string>} Hashed password.
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compares a plain-text password against a stored hash.
 * @param {string} password - Plain-text password to check.
 * @param {string} hash - Stored bcrypt hash.
 * @returns {Promise<boolean>} True if the password matches.
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = {
  hashPassword,
  comparePassword,
};