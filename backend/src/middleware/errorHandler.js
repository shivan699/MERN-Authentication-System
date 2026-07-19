// 404 handler — runs when no route matched. Registered as plain
// middleware (no path string) to stay compatible with Express 5's
// stricter path-to-regexp parsing (a bare '*' route throws on Express 5).
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

// Global error handler — must be registered LAST, with all 4 parameters,
// so Express recognizes it as an error-handling middleware. Any controller
// that calls next(error) ends up here.
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };