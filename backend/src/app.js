const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const otpRoutes = require('./routes/otp.routes');
const chatRoutes = require('./routes/chat.routes');
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
// process.env.CLIENT_URL alone only ever allows ONE origin (the deployed
// Vercel URL) — any request from localhost during development, or from
// a Vercel preview deployment, gets blocked by the browser's CORS check.
// This allows: the production URL from .env, localhost for local dev,
// and any Vercel preview URL that belongs to this same project.
const allowedOrigins = [
  process.env.CLIENT_URL,      // e.g. https://mern-authentication-system-uzja.vercel.app
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const isVercelPreviewOfThisProject = (origin) => {
  try {
    const { hostname } = new URL(origin);
    return /^mern-authentication-system-uzja(-[a-z0-9]+)?\.vercel\.app$/.test(hostname);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = server-to-server calls, curl, Postman — allow.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || isVercelPreviewOfThisProject(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
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
app.use('/api/chat', chatRoutes);

// 404 — no path argument, so it's safe on both Express 4 and Express 5
// (a bare '*' string throws on Express 5's path-to-regexp).
app.use(notFound);

// Global error handler — must be last.
app.use(errorHandler);

module.exports = app;