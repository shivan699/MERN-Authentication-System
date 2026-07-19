// Generates a random 6-digit numeric OTP as a string (e.g. "042913").
// Shared across every OTP flow (register, login, reset — email or phone).
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = generateOTP;