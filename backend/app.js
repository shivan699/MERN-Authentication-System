const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const otpRoutes = require('./routes/otp.routes');

const app = express();

// ------------------------------------------------------------------
// Security & core middleware
// ------------------------------------------------------------------

app.use(helmet());

const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ------------------------------------------------------------------
// Rate limiting
// ------------------------------------------------------------------

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

// ------------------------------------------------------------------
// Routes
// ------------------------------------------------------------------

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/otp', otpRoutes);

// ------------------------------------------------------------------
// 404
// ------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

module.exports = app;