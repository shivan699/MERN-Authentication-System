import { useState, useEffect, useRef, useCallback } from 'react';
import {
  registerUser,
  verifyRegistrationOtp,
  resendOtp,
  loginWithPassword,
  sendEmailLoginOtp,
  verifyEmailLoginOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  forgotPassword,
  resetPassword,
  logoutUser,
  getProfile,
} from './api/auth';

const OTP_TTL_SECONDS = 10 * 60; // must mirror backend otp.service.js OTP_TTL_MINUTES
const RESEND_COOLDOWN_SECONDS = 30;

// ------------------------------------------------------------------
// Small helper: extracts a readable message from an Axios error,
// falling back to a generic message if the backend didn't send JSON.
// ------------------------------------------------------------------
const getErrorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.errors?.length) return data.errors.map((e) => e.message).join(', ');
  return data?.message || 'Something went wrong. Please try again.';
};

const formatMMSS = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ------------------------------------------------------------------
// Reusable 6-digit OTP input: renders 6 boxes, auto-advances focus,
// supports backspace-to-previous and paste.
// ------------------------------------------------------------------
function OtpInput({ value, onChange }) {
  const refs = useRef([]);

  const setDigit = (index, digit) => {
    const chars = value.split('');
    chars[index] = digit;
    onChange(chars.join('').slice(0, 6));
  };

  const handleChange = (index, e) => {
    // Allow letters + digits (OTP format is e.g. "SHI124") instead of
    // digits only. Always stored/displayed uppercase to match the
    // backend's case-insensitive SHI### format.
    const char = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();
    setDigit(index, char || '');
    if (char && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    if (pasted) {
      onChange(pasted.padEnd(6, ''));
      e.preventDefault();
    }
  };

  return (
    <div className="otp-row" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp-box"
          type="text"
          inputMode="text"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Live countdown showing how long the current OTP stays valid for.
// Mirrors the backend's 10-minute TTL (otp.service.js) so the person
// can see "OTP Expiry" actually enforced, not just claimed in copy.
// ------------------------------------------------------------------
function OtpExpiryTimer({ resetKey }) {
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);

  useEffect(() => {
    setSecondsLeft(OTP_TTL_SECONDS);
  }, [resetKey]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const expired = secondsLeft <= 0;

  return (
    <p
      className="mono"
      style={{
        fontSize: 12,
        color: expired ? 'var(--danger)' : 'var(--text-dim)',
        marginTop: -8,
        marginBottom: 16,
      }}
    >
      {expired ? 'OTP expired — request a new one' : `Expires in ${formatMMSS(secondsLeft)}`}
    </p>
  );
}

// ------------------------------------------------------------------
// Registration panel: register -> verify OTP -> done.
// ------------------------------------------------------------------
function RegisterPanel({ onRegistered }) {
  const [step, setStep] = useState('form'); // 'form' | 'otp' | 'done'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [otpIssuedAt, setOtpIssuedAt] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerUser(form);
      setStep('otp');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpIssuedAt(Date.now());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyRegistrationOtp({ email: form.email, otp });
      setStep('done');
      onRegistered?.(form.email);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      await resendOtp({ email: form.email });
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpIssuedAt(Date.now());
      setOtp('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (step === 'done') {
    return (
      <>
        <div className="panel-label">Step 02 / 02</div>
        <h3 className="panel-title">Account verified</h3>
        <div className="msg msg-success">
          Your account is active. Use the Login panel on the right to sign in.
        </div>
      </>
    );
  }

  if (step === 'otp') {
    return (
      <>
        <div className="panel-label">Step 02 / 02</div>
        <h3 className="panel-title">Verify your email</h3>
        {error && <div className="msg msg-error">{error}</div>}
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
          6-digit code sent to <span className="mono" style={{ color: 'var(--text)' }}>{form.email}</span>
        </p>
        <OtpExpiryTimer resetKey={otpIssuedAt} />
        <form onSubmit={handleVerify}>
          <OtpInput value={otp} onChange={setOtp} />
          <button className="btn btn-primary" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & activate'}
          </button>
        </form>
        <div className="link-row">
          <button className="btn-link" onClick={() => setStep('form')} type="button">
            ← Edit details
          </button>
          <button
            className="btn-link"
            onClick={handleResend}
            disabled={cooldown > 0}
            type="button"
            style={{ opacity: cooldown > 0 ? 0.5 : 1 }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="panel-label">Step 01 / 02</div>
      <h3 className="panel-title">Create account</h3>
      {error && <div className="msg msg-error">{error}</div>}
      <form onSubmit={handleSubmitForm}>
        <div className="field">
          <label>Full name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Piya Sharma"
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label>Phone (10-digit)</label>
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="9876543210"
          />
        </div>
        <div className="field">
          <label>Password (min. 8 characters)</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create account & send OTP'}
        </button>
      </form>
    </>
  );
}

// ------------------------------------------------------------------
// Login panel: 3 tabs (password / email OTP / phone OTP) + forgot
// password sub-flow, all issuing tokens via onAuthSuccess.
// ------------------------------------------------------------------
function LoginPanel({ onAuthSuccess, prefillEmail }) {
  const [tab, setTab] = useState('password'); // 'password' | 'email-otp' | 'phone-otp' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Password login state
  const [pwEmail, setPwEmail] = useState(prefillEmail || '');
  const [pwPassword, setPwPassword] = useState('');

  // Email OTP login state
  const [emailOtpStep, setEmailOtpStep] = useState('request'); // 'request' | 'verify'
  const [emailOtpEmail, setEmailOtpEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpIssuedAt, setEmailOtpIssuedAt] = useState(0);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);

  // Phone OTP login state
  const [phoneOtpStep, setPhoneOtpStep] = useState('request');
  const [phone, setPhone] = useState('');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpIssuedAt, setPhoneOtpIssuedAt] = useState(0);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  // Forgot password state
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotOtpIssuedAt, setForgotOtpIssuedAt] = useState(0);

  // Tick down both login-OTP resend cooldowns.
  useEffect(() => {
    if (emailResendCooldown <= 0) return;
    const t = setTimeout(() => setEmailResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [emailResendCooldown]);

  useEffect(() => {
    if (phoneResendCooldown <= 0) return;
    const t = setTimeout(() => setPhoneResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phoneResendCooldown]);

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setInfo('');
  };

  // --- Password login ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginWithPassword({ email: pwEmail, password: pwPassword });
      onAuthSuccess(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // --- Email OTP login ---
  const requestEmailOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await sendEmailLoginOtp({ email: emailOtpEmail });
      setEmailOtpStep('verify');
      setEmailOtpIssuedAt(Date.now());
      setEmailResendCooldown(RESEND_COOLDOWN_SECONDS);
      setEmailOtpCode('');
      setInfo(`OTP sent to ${emailOtpEmail}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = (e) => {
    e.preventDefault();
    requestEmailOtp();
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyEmailLoginOtp({ email: emailOtpEmail, otp: emailOtpCode });
      onAuthSuccess(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // --- Phone OTP login ---
  const requestPhoneOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await sendPhoneOtp({ phone });
      setPhoneOtpStep('verify');
      setPhoneOtpIssuedAt(Date.now());
      setPhoneResendCooldown(RESEND_COOLDOWN_SECONDS);
      setPhoneOtpCode('');
      setInfo(`OTP sent via SMS to +91 ${phone}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = (e) => {
    e.preventDefault();
    requestPhoneOtp();
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyPhoneOtp({ phone, otp: phoneOtpCode });
      onAuthSuccess(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // --- Forgot password ---
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ email: forgotEmail });
      setForgotStep('reset');
      setForgotOtpIssuedAt(Date.now());
      setInfo(`Reset OTP sent to ${forgotEmail}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword({ email: forgotEmail, otp: forgotOtp, newPassword });
      setTab('password');
      setPwEmail(forgotEmail);
      setPwPassword('');
      setInfo('Password reset. Please log in with your new password.');
      setForgotStep('request');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="panel-label">Access</div>
      <h3 className="panel-title">Log in</h3>

      <div className="tabs">
        <button className={`tab ${tab === 'password' ? 'active' : ''}`} onClick={() => switchTab('password')} type="button">
          Password
        </button>
        <button className={`tab ${tab === 'email-otp' ? 'active' : ''}`} onClick={() => switchTab('email-otp')} type="button">
          Email OTP
        </button>
        <button className={`tab ${tab === 'phone-otp' ? 'active' : ''}`} onClick={() => switchTab('phone-otp')} type="button">
          Phone OTP
        </button>
      </div>

      {error && <div className="msg msg-error">{error}</div>}
      {info && !error && <div className="msg msg-success">{info}</div>}

      {/* ---------- Password tab ---------- */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordLogin}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={pwEmail} onChange={(e) => setPwEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="field">
            <label>Password</label>
            <input required type="password" value={pwPassword} onChange={(e) => setPwPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="link-row">
            <button type="button" className="btn-link" onClick={() => { setForgotEmail(pwEmail); switchTab('forgot'); }}>
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {/* ---------- Email OTP tab ---------- */}
      {tab === 'email-otp' && emailOtpStep === 'request' && (
        <form onSubmit={handleSendEmailOtp}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={emailOtpEmail} onChange={(e) => setEmailOtpEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending…' : 'Send login OTP'}
          </button>
        </form>
      )}
      {tab === 'email-otp' && emailOtpStep === 'verify' && (
        <form onSubmit={handleVerifyEmailOtp}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
            Code sent to <span className="mono" style={{ color: 'var(--text)' }}>{emailOtpEmail}</span>
          </p>
          <OtpExpiryTimer resetKey={emailOtpIssuedAt} />
          <OtpInput value={emailOtpCode} onChange={setEmailOtpCode} />
          <button className="btn btn-primary" disabled={loading || emailOtpCode.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <div className="link-row">
            <button type="button" className="btn-link" onClick={() => setEmailOtpStep('request')}>
              ← Different email
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={requestEmailOtp}
              disabled={emailResendCooldown > 0 || loading}
              style={{ opacity: emailResendCooldown > 0 ? 0.5 : 1 }}
            >
              {emailResendCooldown > 0 ? `Resend in ${emailResendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      {/* ---------- Phone OTP tab ---------- */}
      {tab === 'phone-otp' && phoneOtpStep === 'request' && (
        <form onSubmit={handleSendPhoneOtp}>
          <div className="field">
            <label>Phone (10-digit)</label>
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210"
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending…' : 'Send SMS OTP'}
          </button>
        </form>
      )}
      {tab === 'phone-otp' && phoneOtpStep === 'verify' && (
        <form onSubmit={handleVerifyPhoneOtp}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
            Code sent to <span className="mono" style={{ color: 'var(--text)' }}>+91 {phone}</span>
          </p>
          <OtpExpiryTimer resetKey={phoneOtpIssuedAt} />
          <OtpInput value={phoneOtpCode} onChange={setPhoneOtpCode} />
          <button className="btn btn-primary" disabled={loading || phoneOtpCode.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <div className="link-row">
            <button type="button" className="btn-link" onClick={() => setPhoneOtpStep('request')}>
              ← Different number
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={requestPhoneOtp}
              disabled={phoneResendCooldown > 0 || loading}
              style={{ opacity: phoneResendCooldown > 0 ? 0.5 : 1 }}
            >
              {phoneResendCooldown > 0 ? `Resend in ${phoneResendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      {/* ---------- Forgot password sub-flow ---------- */}
      {tab === 'forgot' && forgotStep === 'request' && (
        <form onSubmit={handleForgotRequest}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset OTP'}
          </button>
          <button type="button" className="btn-link" style={{ marginTop: 10 }} onClick={() => switchTab('password')}>
            ← Back to login
          </button>
        </form>
      )}
      {tab === 'forgot' && forgotStep === 'reset' && (
        <form onSubmit={handleForgotReset}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
            Code sent to <span className="mono" style={{ color: 'var(--text)' }}>{forgotEmail}</span>
          </p>
          <OtpExpiryTimer resetKey={forgotOtpIssuedAt} />
          <OtpInput value={forgotOtp} onChange={setForgotOtp} />
          <div className="field">
            <label>New password (min. 8 characters)</label>
            <input required type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" disabled={loading || forgotOtp.length !== 6}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
      )}
    </>
  );
}

// ------------------------------------------------------------------
// Profile view: shown once authenticated. Fetches /api/user/profile
// (access token attached automatically by the axios interceptor).
// ------------------------------------------------------------------
function ProfileView({ onLoggedOut }) {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      setProfile(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) await logoutUser({ refreshToken });
    } catch {
      // Even if the server call fails, clear local state so the UI
      // never gets stuck in a "logged in but broken" state.
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      onLoggedOut();
    }
  };

  return (
    <div className="stamp-card">
      <div className="stamp">✓ VERIFIED</div>
      {error && <div className="msg msg-error">{error}</div>}
      {profile ? (
        <>
          <div className="profile-row"><span className="k">Name</span><span className="v">{profile.name}</span></div>
          <div className="profile-row"><span className="k">Email</span><span className="v">{profile.email}</span></div>
          <div className="profile-row"><span className="k">Phone</span><span className="v">{profile.phone}</span></div>
          <div className="profile-row"><span className="k">Status</span><span className="v">{profile.isVerified ? 'Active' : 'Pending'}</span></div>
        </>
      ) : (
        !error && <p style={{ color: 'var(--text-dim)' }}>Loading profile…</p>
      )}
      <button className="btn btn-ghost" onClick={handleLogout} style={{ marginTop: 20 }}>
        Log out
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Root page: switches between the two-box (Register | Login) layout
// and the authenticated ProfileView based on whether an access token
// exists in localStorage.
// ------------------------------------------------------------------
export default function AuthPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [prefillEmail, setPrefillEmail] = useState('');

  const handleAuthSuccess = (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setIsAuthenticated(true);
  };

  const handleLoggedOut = () => {
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="eyebrow">Checkpoint · Session</div>
          <h1>Welcome back</h1>
        </div>
        <ProfileView onLoggedOut={handleLoggedOut} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">Checkpoint · Identity Verification</div>
        <h1>MERN Authentication System</h1>
        <p>Register a new account or sign in with a method of your choice.</p>
      </div>

      <div className="pass">
        <div className="pass-panel left">
          <RegisterPanel onRegistered={(email) => setPrefillEmail(email)} />
        </div>
        <div className="perforation" />
        <div className="pass-panel right">
          <LoginPanel onAuthSuccess={handleAuthSuccess} prefillEmail={prefillEmail} />
        </div>
      </div>
    </div>
  );
}