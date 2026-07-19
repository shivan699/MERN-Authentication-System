 // Extracts the token from a "Bearer <token>" Authorization header.
// Returns null if the header is missing or malformed, letting the
// caller (auth.middleware.js) decide how to respond.
const extractBearerToken = (authHeader) => {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
};

module.exports = { extractBearerToken };