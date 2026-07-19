const mongoose = require('mongoose');

// A single collection for every OTP the system issues — registration
// verification, email login, phone login, and password reset — kept
// distinct via `channel` + `purpose` rather than four separate models.
const otpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The email or phone number this specific OTP was sent to.
    identifier: {
      type: String,
      required: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },
    purpose: {
      type: String,
      enum: ['register', 'login', 'reset'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically deletes the document once `expiresAt`
// passes, so expired OTPs never pile up and don't need manual cleanup.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);