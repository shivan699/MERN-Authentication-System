const mongoose = require('mongoose');

// User model: identity + credentials only. OTPs and refresh tokens live
// in their own collections (see OTP.js and RefreshToken.js) so this model
// stays focused on "who the user is", not "what session/verification
// state is currently active" — a cleaner separation for a system with
// multiple OTP channels (email + phone) and multiple active sessions.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);