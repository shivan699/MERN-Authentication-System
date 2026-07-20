// Generates an OTP with a fixed alphabetic prefix and 3 random digits
// (e.g. "SHI124", "SHI956"). The prefix stays constant across every OTP
// issued; only the numeric suffix changes per code.
const OTP_PREFIX = 'SHI';

const generateOTP = () => {
  const digits = Math.floor(100 + Math.random() * 900).toString(); // 100–999
  return `${OTP_PREFIX}${digits}`;
};

module.exports = generateOTP;