const OTP = require('../models/OTP');
const generateOTP = require('../utils/generateOTP');

const OTP_TTL_MINUTES = 10;

/**
 * Generates a new OTP, invalidating any previous unused OTP for the same
 * user + channel + purpose, and saves it to the OTP collection.
 * @param {{ userId: string, identifier: string, channel: 'email'|'phone', purpose: 'register'|'login'|'reset' }} params
 * @returns {Promise<string>} The generated 6-digit OTP.
 */
const createOTP = async ({ userId, identifier, channel, purpose }) => {
  // Remove any stale OTPs for this exact user/channel/purpose combo so
  // only the most recently issued code is ever valid.
  await OTP.deleteMany({ user: userId, channel, purpose });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await OTP.create({ user: userId, identifier, otp, channel, purpose, expiresAt });

  return otp;
};

/**
 * Verifies a submitted OTP against the stored record. On success, the
 * record is deleted (single-use). On failure, returns a reason so the
 * caller can return an appropriate error message.
 * @param {{ userId: string, otp: string, channel: 'email'|'phone', purpose: 'register'|'login'|'reset' }} params
 * @returns {Promise<{ valid: boolean, reason?: 'not_found'|'expired'|'invalid' }>}
 */
const verifyOTPRecord = async ({ userId, otp, channel, purpose }) => {
  const record = await OTP.findOne({ user: userId, channel, purpose });

  if (!record) {
    return { valid: false, reason: 'not_found' };
  }

  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: record._id });
    return { valid: false, reason: 'expired' };
  }

  if (record.otp !== String(otp).trim()) {
    return { valid: false, reason: 'invalid' };
  }

  // Single-use: delete immediately on successful verification.
  await OTP.deleteOne({ _id: record._id });

  return { valid: true };
};

/**
 * Deletes any pending OTP for a user/channel/purpose. Used to roll back
 * a created-but-undelivered OTP (e.g. email/SMS send failure).
 */
const invalidateOTP = async ({ userId, channel, purpose }) => {
  await OTP.deleteMany({ user: userId, channel, purpose });
};

module.exports = {
  createOTP,
  verifyOTPRecord,
  invalidateOTP,
};