const { transporter, EMAIL_USER } = require('../config/mail');

// ------------------------------------------------------------------
// Shared HTML builder — one template, parameterized by heading/purpose,
// used for all three email OTP scenarios (register, login, reset).
// ------------------------------------------------------------------
const buildOTPEmailHTML = (name, otp, heading, purposeText) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827;">${heading}</h2>
      <p style="color: #374151; font-size: 15px;">Hi ${name},</p>
      <p style="color: #374151; font-size: 15px;">
        Use the OTP code below to ${purposeText}:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; font-size: 28px; letter-spacing: 6px; font-weight: bold; color: #1d4ed8; background-color: #eff6ff; padding: 12px 24px; border-radius: 6px;">
          ${otp}
        </span>
      </div>
      <p style="color: #374151; font-size: 14px;">
        This OTP is valid for <strong>10 minutes</strong>.
      </p>
      <p style="color: #b91c1c; font-size: 13px; margin-top: 16px;">
        For your security, never share this OTP with anyone. If you did not request this, you can safely ignore this email.
      </p>
    </div>
  `;
};

// ------------------------------------------------------------------
// Internal helper: sends an email and normalizes errors.
// ------------------------------------------------------------------
const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"MERN Authentication System" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error(`Email send failed for ${to}: ${error.message}`);
    throw new Error('Failed to send email. Please try again later.');
  }
};

/**
 * Sends the registration verification OTP.
 * @param {{ email: string, otp: string, name: string }} params
 */
const sendRegistrationOTPEmail = async ({ email, otp, name }) => {
  const html = buildOTPEmailHTML(name, otp, 'Verify Your Email', 'complete your registration');
  await sendMail(email, 'Verify Your Email - MERN Authentication System', html);
};

/**
 * Sends a login OTP (passwordless email login).
 * @param {{ email: string, otp: string, name: string }} params
 */
const sendLoginOTPEmail = async ({ email, otp, name }) => {
  const html = buildOTPEmailHTML(name, otp, 'Your Login OTP', 'log in to your account');
  await sendMail(email, 'Your Login OTP - MERN Authentication System', html);
};

/**
 * Sends a password reset OTP.
 * @param {{ email: string, otp: string, name: string }} params
 */
const sendPasswordResetOTPEmail = async ({ email, otp, name }) => {
  const html = buildOTPEmailHTML(name, otp, 'Reset Your Password', 'reset your password');
  await sendMail(email, 'Reset Your Password - MERN Authentication System', html);
};

module.exports = {
  sendRegistrationOTPEmail,
  sendLoginOTPEmail,
  sendPasswordResetOTPEmail,
};