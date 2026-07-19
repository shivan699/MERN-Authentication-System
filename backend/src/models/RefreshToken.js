const mongoose = require('mongoose');

// Storing refresh tokens server-side (rather than trusting the JWT alone)
// enables real logout, per-session revocation, and rotation — a stolen
// refresh token can be invalidated here even before its JWT expiry.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL index: auto-removes the record once the refresh token has expired.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);