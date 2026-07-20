const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify SMTP Connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP Connection Failed:", error.message);
  } else {
    console.log("✅ SMTP Server is ready to send emails");
  }
});

// Common Send Email Function
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"MERN Authentication System" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent successfully to ${to}`);
    console.log(`📨 Message ID: ${info.messageId}`);

    return info;
  } catch (error) {
    console.error(`❌ Email send failed for ${to}:`, error.message);
    throw new Error("Failed to send email. Please try again later.");
  }
};

module.exports = {
  transporter,
  sendEmail,
  EMAIL_USER,
};