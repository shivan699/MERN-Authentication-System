const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

// Runs after any express-validator chain; if validation failed, responds
// with 422 and a structured list of field errors instead of letting the
// request reach the controller.
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return sendError(res, 422, 'Validation failed', formattedErrors);
  }

  return next();
};

module.exports = validate;