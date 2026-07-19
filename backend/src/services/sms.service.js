 const { twilioClient, TWILIO_PHONE_NUMBER } = require('../config/twilio');

// Normalizes a 10-digit Indian phone number into E.164 format
// (e.g. "9876543210" -> "+919876543210"), which Twilio requires.
const toE164 = (phone) => {
  const trimmed = phone.trim();
  return trimmed.startsWith('+') ? trimmed : `+91${trimmed}`;
};

/**
 * Sends a 6-digit OTP via SMS.
 * @param {string} phone - Recipient's phone number.
 * @param {string} otp - The 6-digit OTP code.
 * @returns {Promise<void>}
 * @throws {Error} If the SMS fails to send.
 */
const sendOTPSMS = async (phone, otp) => {
  try {
    await twilioClient.messages.create({
      body: `Your MERN Authentication System verification code is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
      from: TWILIO_PHONE_NUMBER,
      to: toE164(phone),
    });
  } catch (error) {
    console.error(`Failed to send OTP SMS to ${phone}: ${error.message}`);
    throw new Error('Failed to send verification SMS. Please try again later.');
  }
};

module.exports = { sendOTPSMS };