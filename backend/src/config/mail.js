const nodemailer = require('nodemailer');

// ------------------------------------------------------------------
// Validate required environment variables at module load time.
// ------------------------------------------------------------------
const REQUIRED_ENV_VARS = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

// Transporter: created once and reused across the app.
// `secure: true` is required for port 465 (implicit TLS).
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: Number(EMAIL_PORT),
  secure: Number(EMAIL_PORT) === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  // Render's outbound network doesn't reliably support IPv6, and Gmail's
  // SMTP servers resolve to IPv6 addresses by default on some hosts,
  // causing ENETUNREACH. Forcing IPv4 avoids that entirely.
  family: 4,
});

module.exports = { transporter, EMAIL_USER };