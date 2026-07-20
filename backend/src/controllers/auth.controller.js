const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { sendSuccess, sendError } = require('../utils/response');
const otpService = require('../services/otp.service');
const emailService = require('../services/email.service');
const tokenService = require('../services/token.service');

// ------------------------------------------------------------------
// @desc    Register a new user and send a registration OTP
// @route   POST /api/auth/register
// @access  Public
// ------------------------------------------------------------------
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    const [existingEmailUser, existingPhoneUser] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ phone: normalizedPhone }),
    ]);

    if (existingEmailUser) {
      return sendError(res, 409, 'Email is already registered');
    }
    if (existingPhoneUser) {
      return sendError(res, 409, 'Phone number is already registered');
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      isVerified: false,
    });

    const otp = await otpService.createOTP({
      userId: newUser._id,
      identifier: newUser.email,
      channel: 'email',
      purpose: 'register',
    });

    try {
      await emailService.sendRegistrationOTPEmail({ email: newUser.email, otp, name: newUser.name });
    } catch (emailError) {
      // Roll back the user so a failed-delivery account isn't stuck
      // permanently unverifiable.
      await User.findByIdAndDelete(newUser._id);
      await otpService.invalidateOTP({ userId: newUser._id, channel: 'email', purpose: 'register' });

      console.error(`Registration email failed for ${newUser.email}: ${emailError.message}`);
      return sendError(res, 502, 'Registration failed: unable to send verification email. Please try again.');
    }

    return sendSuccess(res, 201, 'User registered successfully. OTP verification pending.', {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      isVerified: newUser.isVerified,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Verify the registration OTP and activate the account
// @route   POST /api/auth/verify-otp
// @access  Public
// ------------------------------------------------------------------
const verifyRegistrationOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.isVerified) {
      return sendError(res, 400, 'User is already verified');
    }

    const result = await otpService.verifyOTPRecord({
      userId: user._id,
      otp,
      channel: 'email',
      purpose: 'register',
    });

    if (!result.valid) {
      const message = result.reason === 'expired' ? 'OTP has expired. Please request a new one' : 'Invalid OTP';
      return sendError(res, 400, message);
    }

    user.isVerified = true;
    await user.save();

    return sendSuccess(res, 200, 'Account verified successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Resend the registration OTP
// @route   POST /api/auth/resend-otp
// @access  Public
// ------------------------------------------------------------------
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.isVerified) {
      return sendError(res, 400, 'User is already verified');
    }

    const otp = await otpService.createOTP({
      userId: user._id,
      identifier: user.email,
      channel: 'email',
      purpose: 'register',
    });

    try {
      await emailService.sendRegistrationOTPEmail({ email: user.email, otp, name: user.name });
    } catch (emailError) {
      console.error(`Resend OTP email failed for ${user.email}: ${emailError.message}`);
      return sendError(res, 502, 'Unable to resend OTP email. Please try again.');
    }

    return sendSuccess(res, 200, 'A new OTP has been sent to your email');
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Authenticate with email + password, issue tokens
// @route   POST /api/auth/login
// @access  Public
// ------------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Invalid credentials');
    }

    if (!user.isVerified) {
      return sendError(res, 403, 'Please verify your account first.');
    }

    const { accessToken, refreshToken } = await tokenService.issueAuthTokens(user);

    return sendSuccess(res, 200, 'Login successful', {
      id: user._id,
      name: user.name,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Send a passwordless login OTP to the user's email
// @route   POST /api/auth/send-email-otp
// @access  Public
// ------------------------------------------------------------------
const sendEmailLoginOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (!user.isVerified) {
      return sendError(res, 403, 'Please verify your account first.');
    }

    const otp = await otpService.createOTP({
      userId: user._id,
      identifier: user.email,
      channel: 'email',
      purpose: 'login',
    });

    try {
      await emailService.sendLoginOTPEmail({ email: user.email, otp, name: user.name });
    } catch (emailError) {
      await otpService.invalidateOTP({ userId: user._id, channel: 'email', purpose: 'login' });
      console.error(`Login OTP email failed for ${user.email}: ${emailError.message}`);
      return sendError(res, 502, 'Unable to send login OTP email. Please try again.');
    }

    return sendSuccess(res, 200, 'A login OTP has been sent to your email');
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Verify the email login OTP and issue tokens
// @route   POST /api/auth/verify-email-otp
// @access  Public
// ------------------------------------------------------------------
const verifyEmailLoginOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const result = await otpService.verifyOTPRecord({
      userId: user._id,
      otp,
      channel: 'email',
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
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Request a password reset OTP via email
// @route   POST /api/auth/forgot-password
// @access  Public
// ------------------------------------------------------------------
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const otp = await otpService.createOTP({
      userId: user._id,
      identifier: user.email,
      channel: 'email',
      purpose: 'reset',
    });

    try {
      await emailService.sendPasswordResetOTPEmail({ email: user.email, otp, name: user.name });
    } catch (emailError) {
      await otpService.invalidateOTP({ userId: user._id, channel: 'email', purpose: 'reset' });
      console.error(`Password reset email failed for ${user.email}: ${emailError.message}`);
      return sendError(res, 502, 'Unable to send password reset email. Please try again.');
    }

    return sendSuccess(res, 200, 'Password reset OTP has been sent to your email');
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Reset password using the forgot-password OTP
// @route   POST /api/auth/reset-password
// @access  Public
// ------------------------------------------------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const result = await otpService.verifyOTPRecord({
      userId: user._id,
      otp,
      channel: 'email',
      purpose: 'reset',
    });

    if (!result.valid) {
      const message = result.reason === 'expired' ? 'OTP has expired. Please request a new one' : 'Invalid OTP';
      return sendError(res, 400, message);
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    // Force re-login everywhere after a password reset.
    await tokenService.revokeAllUserTokens(user._id);

    return sendSuccess(res, 200, 'Password has been reset successfully. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Exchange a valid refresh token for a new token pair
// @route   POST /api/auth/refresh-token
// @access  Public (requires a valid refresh token in the body)
// ------------------------------------------------------------------
const refreshTokenHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const tokens = await tokenService.rotateRefreshToken(refreshToken);

    return sendSuccess(res, 200, 'Token refreshed successfully', tokens);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Refresh token has expired. Please log in again.');
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 401, 'Invalid refresh token');
    }
    next(error);
  }
};

// ------------------------------------------------------------------
// @desc    Log out — revoke the given refresh token
// @route   POST /api/auth/logout
// @access  Private
// ------------------------------------------------------------------
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 400, 'Refresh token is required');
    }

    await tokenService.revokeRefreshToken(refreshToken);

    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};