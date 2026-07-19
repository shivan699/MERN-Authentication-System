import api from './axios.jsx';

// Each function returns response.data directly (the { success, message, data } shape).

// --- Registration ---
export const registerUser = (payload) => api.post('/api/auth/register', payload).then((r) => r.data);
export const verifyRegistrationOtp = (payload) => api.post('/api/auth/verify-otp', payload).then((r) => r.data);
export const resendOtp = (payload) => api.post('/api/auth/resend-otp', payload).then((r) => r.data);

// --- Email + Password login ---
export const loginWithPassword = (payload) => api.post('/api/auth/login', payload).then((r) => r.data);

// --- Email OTP login (passwordless) ---
export const sendEmailLoginOtp = (payload) => api.post('/api/auth/send-email-otp', payload).then((r) => r.data);
export const verifyEmailLoginOtp = (payload) => api.post('/api/auth/verify-email-otp', payload).then((r) => r.data);

// --- Phone OTP login ---
export const sendPhoneOtp = (payload) => api.post('/api/otp/send-phone-otp', payload).then((r) => r.data);
export const verifyPhoneOtp = (payload) => api.post('/api/otp/verify-phone-otp', payload).then((r) => r.data);

// --- Forgot / reset password ---
export const forgotPassword = (payload) => api.post('/api/auth/forgot-password', payload).then((r) => r.data);
export const resetPassword = (payload) => api.post('/api/auth/reset-password', payload).then((r) => r.data);

// --- Session ---
export const logoutUser = (payload) => api.post('/api/auth/logout', payload).then((r) => r.data);
export const getProfile = () => api.get('/api/user/profile').then((r) => r.data);