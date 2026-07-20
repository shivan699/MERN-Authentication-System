const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const otpRoutes = require('./routes/otp.routes');
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render (and most hosting platforms) sit behind a reverse proxy, so the
// real client IP arrives via the X-Forwarded-For header. Without this,
// express-rate-limit can't reliably identify unique clients and throws
// a validation error. `1` trusts exactly one hop (the platform's proxy).
app.set('trust proxy', 1);

// Security
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

// Body Parser (IMPORTANT)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Baseline rate limiter — stricter per-route limiters (auth/OTP) are
// applied inside their respective route files.
app.use(generalLimiter);

// Test Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/otp', otpRoutes);

// 404 — no path argument, so it's safe on both Express 4 and Express 5
// (a bare '*' string throws on Express 5's path-to-regexp).
app.use(notFound);

// Global error handler — must be last.
app.use(errorHandler);

module.exports = app;
