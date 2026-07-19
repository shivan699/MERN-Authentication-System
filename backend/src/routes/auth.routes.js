console.log("✅ auth.routes.js loaded");

const express = require('express');
const {
  register,
  verifyRegistrationOTP,
  resendOTP,
  login,
  sendEmailLoginOTP,
  verifyEmailLoginOTP,
  forgotPassword,
  resetPassword,
  refreshTokenHandler,
  logout,
} = require('../controllers/auth.controller');

const validate = require('../middleware/validate');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');

const {
  registerValidation,
  loginValidation,
  verifyOTPValidation,
  emailOnlyValidation,
  resetPasswordValidation,
  refreshTokenValidation,
} = require('../validations/auth.validation');

const router = express.Router();

// Register
router.post('/register', otpLimiter, registerValidation, validate, register);

// Verify Registration OTP
router.post('/verify-otp', verifyOTPValidation, validate, verifyRegistrationOTP);

// Resend OTP
router.post('/resend-otp', otpLimiter, emailOnlyValidation, validate, resendOTP);

// Login
router.post('/login', authLimiter, loginValidation, validate, login);

// Email OTP Login
router.post('/send-email-otp', otpLimiter, emailOnlyValidation, validate, sendEmailLoginOTP);
router.post('/verify-email-otp', verifyOTPValidation, validate, verifyEmailLoginOTP);

// Forgot Password
router.post('/forgot-password', otpLimiter, emailOnlyValidation, validate, forgotPassword);

// Reset Password
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);

// Refresh Token
router.post('/refresh-token', refreshTokenValidation, validate, refreshTokenHandler);

// Logout
router.post('/logout', refreshTokenValidation, validate, logout);

module.exports = router;