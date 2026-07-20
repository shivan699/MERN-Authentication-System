// Standardizes every API response shape across the app:
// { success, message, data? } for success, { success, message, errors? } for errors.

const sendSuccess = (res, statusCode, message, data = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

const sendError = (res, statusCode, message, errors = null) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = {
  sendSuccess,
  sendError,
};