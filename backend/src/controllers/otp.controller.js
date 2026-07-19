const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const otpService = require('../services/otp.service');
const smsService = require('../services/sms.service');
const tokenService = require('../services/token.service');

// ------------------------------------------------------------------
// @desc    Send a login OTP to an existing user's phone
// @route   POST /api/otp/send-phone-otp
// @access  Public
// ------------------------------------------------------------------
const sendPhoneOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const normalizedPhone = phone.trim();

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const otp = await otpService.createOTP({
      userId: user._id,
      identifier: normalizedPhone,
      channel: 'phone',
      purpose: 'login',
    });

    try {
      await smsService.sendOTPSMS(normalizedPhone, otp);
    } catch (smsError) {
      await otpService.invalidateOTP({ userId: user._id, channel: 'phone', purpose: 'login' });
      console.error(`Phone OTP delivery failed for ${normalizedPhone}: ${smsError.message}`);
      return sendError(res, 502, 'Unable to send OTP SMS. Please try again.');
    }

    return sendSuccess(res, 200, 'OTP sent successfully to your phone number');
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Verify a phone OTP and log the user in (issues tokens)
// @route   POST /api/otp/verify-phone-otp
// @access  Public
// ------------------------------------------------------------------
const verifyPhoneOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const normalizedPhone = phone.trim();

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const result = await otpService.verifyOTPRecord({
      userId: user._id,
      otp,
      channel: 'phone',
      purpose: 'login',
    });

    if (!result.valid) {
      const message = result.reason === 'expired' ? 'OTP has expired. Please request a new one' : 'Invalid OTP';
      return sendError(res, 400, message);
    }

    const { accessToken, refreshToken } = await tokenService.issueAuthTokens(user);

    return sendSuccess(res, 200, 'Login successful', {
      id: user._id,
      name: user.name,
      phone: user.phone,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendPhoneOTP,
  verifyPhoneOTP,
};