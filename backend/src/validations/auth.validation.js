const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('A valid 10-digit phone number is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const verifyOTPValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('otp')
    .trim()
    .matches(/^SHI\d{3}$/i)
    .withMessage('OTP must be in the format SHI followed by 3 digits (e.g. SHI124)'),
];

const emailOnlyValidation = [body('email').trim().isEmail().withMessage('A valid email is required')];

const resetPasswordValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('otp')
    .trim()
    .matches(/^SHI\d{3}$/i)
    .withMessage('OTP must be in the format SHI followed by 3 digits (e.g. SHI124)'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const phoneOnlyValidation = [
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('A valid 10-digit phone number is required'),
];

const verifyPhoneOTPValidation = [
  ...phoneOnlyValidation,
  body('otp')
    .trim()
    .matches(/^SHI\d{3}$/i)
    .withMessage('OTP must be in the format SHI followed by 3 digits (e.g. SHI124)'),
];

const refreshTokenValidation = [body('refreshToken').notEmpty().withMessage('Refresh token is required')];

module.exports = {
  registerValidation,
  loginValidation,
  verifyOTPValidation,
  emailOnlyValidation,
  resetPasswordValidation,
  phoneOnlyValidation,
  verifyPhoneOTPValidation,
  refreshTokenValidation,
};