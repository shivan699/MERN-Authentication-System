 const express = require('express');
const { sendPhoneOTP, verifyPhoneOTP } = require('../controllers/otp.controller');
const validate = require('../middleware/validate');
const { otpLimiter } = require('../middleware/rateLimiter');
const { phoneOnlyValidation, verifyPhoneOTPValidation } = require('../validations/auth.validation');

const router = express.Router();

// @route   POST /api/otp/send-phone-otp
router.post('/send-phone-otp', otpLimiter, phoneOnlyValidation, validate, sendPhoneOTP);

// @route   POST /api/otp/verify-phone-otp
router.post('/verify-phone-otp', verifyPhoneOTPValidation, validate, verifyPhoneOTP);

module.exports = router;