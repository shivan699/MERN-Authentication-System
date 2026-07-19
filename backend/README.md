# MERN Authentication System
A production-ready, multi-method authentication and user verification system built with the MERN stack. Supports email/password login, passwordless email OTP login, phone OTP login (via Twilio), JWT access + refresh tokens, and a full forgot-password flow — all behind a clean, layered backend architecture and a React frontend.

---

##  Features

- **User Registration with OTP Verification** — accounts stay `isVerified: false` until the emailed OTP is confirmed
- **Email & Password Authentication**
- **Email OTP Login** (passwordless)
- **Phone OTP Login** via Twilio SMS
- **JWT Authentication** — short-lived access tokens
- **Refresh Token Implementation** — stored server-side, rotated on every refresh, revocable (real logout)
- **Forgot Password Flow** — OTP-based reset, revokes all active sessions on success
- **Resend OTP** — with client-side cooldown
- **Secure Password Hashing** — bcrypt, 10 salt rounds
- **OTP Expiry & Validation** — 10-minute TTL enforced at the database level (MongoDB TTL index) and mirrored live in the UI
- **Rate Limiting** — separate limits for auth, OTP, and general traffic
- **Input Validation & Error Handling** — `express-validator` + centralized error middleware
- **Clean Modular Architecture** — routes → controllers → services → models
- **RESTful API Design** — resource-based URLs, correct HTTP verbs and status codes
- **API Documentation** — Postman collection with automated end-to-end test scripts

---

## Tech Stack

**Backend:** Node.js, Express 5, MongoDB, Mongoose, JWT (`jsonwebtoken`), bcrypt, Nodemailer, Twilio, express-validator, express-rate-limit, Helmet, CORS
**Frontend:** React (Vite), Axios

---

## 📁 Project Structure

```
MERN-Auth-System/
├── backend/
│   ├── src/
│   │   ├── config/          # db.js, jwt.js, mail.js, twilio.js
│   │   ├── controllers/     # auth.controller.js, otp.controller.js, user.controller.js
│   │   ├── middleware/      # auth.middleware.js, validate.js, rateLimiter.js, errorHandler.js
│   │   ├── models/          # User.js, OTP.js, RefreshToken.js
│   │   ├── routes/          # auth.routes.js, otp.routes.js, user.routes.js
│   │   ├── services/        # email.service.js, sms.service.js, otp.service.js, token.service.js
│   │   ├── utils/           # generateOTP.js, hashPassword.js, jwt.js, response.js
│   │   ├── validations/     # auth.validation.js
│   │   └── app.js
│   ├── server.js
│   └── .env
├── auth-frontend/
│   └── src/
│       ├── api/             # axios.jsx, auth.js
│       ├── AuthPage.jsx
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── API_DOCUMENTATION.md
├── MERN_Auth_Postman_Collection.json
└── README.md
```

---

##  Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (for Nodemailer)
- A [Twilio](https://console.twilio.com) account (trial is fine) with a purchased phone number

### 1. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development

MONGO_URI=mongodb://127.0.0.1:27017/mern-auth

JWT_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_a_different_long_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

CLIENT_URL=http://localhost:5173
```

> Generate strong secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

Run the backend:
```bash
npm run dev
```
Confirm in the terminal: `MongoDB Connected` and `Server running on port 5000`.

### 2. Frontend setup

```bash
cd auth-frontend
npm install axios
```

Create `auth-frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

Run the frontend:
```bash
npm run dev
```
Open `http://localhost:5173`.

> **Twilio trial accounts** can only send SMS to phone numbers verified in the Twilio Console (**Phone Numbers → Manage → Verified Caller IDs**). Verify your test number there before testing Phone OTP login.

---

## 🔌 API Overview

Base URL: `http://127.0.0.1:5000`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register + send registration OTP |
| POST | `/api/auth/verify-otp` | Verify registration OTP |
| POST | `/api/auth/resend-otp` | Resend registration OTP |
| POST | `/api/auth/login` | Email + password login |
| POST | `/api/auth/send-email-otp` | Send passwordless login OTP (email) |
| POST | `/api/auth/verify-email-otp` | Verify email login OTP, issue tokens |
| POST | `/api/otp/send-phone-otp` | Send login OTP via SMS |
| POST | `/api/otp/verify-phone-otp` | Verify phone OTP, issue tokens |
| POST | `/api/auth/forgot-password` | Send password reset OTP |
| POST | `/api/auth/reset-password` | Reset password with OTP |
| POST | `/api/auth/refresh-token` | Rotate refresh token, issue new pair |
| POST | `/api/auth/logout` | Revoke a refresh token |
| GET | `/api/user/profile` | Get authenticated user's profile (protected) |

Full request/response examples: see [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md).

Import [`MERN_Auth_Postman_Collection.json`](./MERN_Auth_Postman_Collection.json) into Postman for a ready-to-run test suite covering both success and failure cases (invalid tokens, expired OTPs, duplicate registration, token rotation, revocation after logout, etc.).

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt (10 salt rounds) — plain-text passwords are never stored or logged
- Access tokens are short-lived (15 min); refresh tokens are stored server-side and rotated on every use, so a stolen refresh token can only be replayed once before it's invalidated
- OTPs are single-use (deleted on successful verification) and expire after 10 minutes via a MongoDB TTL index
- All OTP-issuing endpoints (register, resend, login OTP, forgot-password) are rate-limited to prevent SMS/email abuse
- Resetting a password revokes all of that user's active refresh tokens, forcing re-login on every device

---

## 📄 License

ISC