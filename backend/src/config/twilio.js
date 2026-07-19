const twilio = require('twilio');

// ------------------------------------------------------------------
// Validate required environment variables at module load time.
// Failing fast here ensures the app never runs with a broken SMS config.
// ------------------------------------------------------------------
const REQUIRED_ENV_VARS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
];

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

// ------------------------------------------------------------------
// Twilio client: instantiated once and reused across the app, rather
// than creating a new client per request.
// ------------------------------------------------------------------
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

module.exports = {
  twilioClient,
  TWILIO_PHONE_NUMBER,
};