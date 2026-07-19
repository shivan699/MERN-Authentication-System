const rateLimit = require('express-rate-limit');

// Stricter limiter for credential-guessing-prone endpoints (login).
const authLimiter = rateLimit({
  windowMs: 15 *1000, // 15 seconds
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 seconds.',
  },
});

// Limiter for OTP-issuing endpoints (register, resend-otp, forgot-password,
// send-email-otp, send-phone-otp) — prevents SMS/email bombing and abuse
// of third-party sending costs (Twilio/Nodemailer).
const otpLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 10 seconds.',
  },
});

// General-purpose limiter applied app-wide as a baseline.
const generalLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, otpLimiter, generalLimiter };