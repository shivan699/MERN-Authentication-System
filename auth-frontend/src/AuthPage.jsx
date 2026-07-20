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
const BRAND_NAME = 'FuturePath';

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
// Top navbar. The "Sign In" button is now functional — it switches
// the page into the login view instead of being purely decorative.
// ------------------------------------------------------------------
function Navbar({ onSignInClick }) {
  return (
    <nav className="navbar">
      <div className="brand">
        <span className="brand-dot" />
        {BRAND_NAME}
      </div>
      <ul className="nav-links">
        <li>Find Jobs</li>
        <li>Companies</li>
        <li>Resources</li>
        <li>About</li>
      </ul>
      <div className="nav-right">
        <span className="nav-link-text">Have an account?</span>
        <button className="nav-cta" type="button" onClick={onSignInClick}>Sign In</button>
      </div>
    </nav>
  );
}

// ------------------------------------------------------------------
// Left hero panel — background image + headline + trust badges.
// ------------------------------------------------------------------
function HeroVisual() {
  return (
    <div className="hero-visual">
      <span className="hero-badge">Join the network</span>
      <h1>
        Start your <span className="accent">professional</span> journey today.
      </h1>
      <p className="hero-sub">
        Connect with leading tech companies, secure internships, and build the
        foundation for your dream career — all verified through a secure,
        multi-method authentication system.
      </p>
      <div className="trust-list">
        <div className="trust-item"><span className="dot" /> Verified student profiles</div>
        <div className="trust-item"><span className="dot" /> Email &amp; SMS OTP verification</div>
        <div className="trust-item"><span className="dot" /> Secure, encrypted sessions</div>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {BRAND_NAME}. Empowering the next generation.</span>
      <div className="footer-links">
        <span>Privacy Policy</span>
        <span>Terms of Service</span>
        <span>Help Center</span>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------------
// Segmented toggle: switches which card (Create Account / Log In) is
// visible on the page. Only one panel renders at a time.
// ------------------------------------------------------------------
function SegmentedToggle({ options, selected, onChange }) {
  return (
    <div className="segmented-toggle">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segmented-toggle-btn ${selected === option.value ? 'active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Reusable 6-character OTP input (format: e.g. "SHI124").
// ------------------------------------------------------------------
function OtpInput({ value, onChange }) {
  const refs = useRef([]);

  const setDigit = (index, digit) => {
    const chars = value.split('');
    chars[index] = digit;
    onChange(chars.join('').slice(0, 6));
  };

  const handleChange = (index, e) => {
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
    <p className="mono" style={{ fontSize: 12, color: expired ? 'var(--danger)' : 'var(--text-dim)', marginTop: -8, marginBottom: 16 }}>
      {expired ? 'Code expired — request a new one' : `Expires in ${formatMMSS(secondsLeft)}`}
    </p>
  );
}

// ------------------------------------------------------------------
// Registration panel: register -> verify OTP -> done.
// ------------------------------------------------------------------
function RegisterPanel({ onRegistered }) {
  const [step, setStep] = useState('form');
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

  const StepDots = ({ current }) => (
    <div className="step-dots">
      <span className={`d ${current >= 1 ? 'active' : ''}`} />
      <span className={`d ${current >= 2 ? 'active' : ''}`} />
    </div>
  );

  if (step === 'done') {
    return (
      <>
        <div className="panel-head">
          <div>
            <div className="panel-label">Step 02 / 02</div>
            <h3 className="panel-title">Account verified</h3>
          </div>
          <StepDots current={2} />
        </div>
        <div className="msg msg-success">
          Your account is active. Switch to the Log In tab above to continue.
        </div>
      </>
    );
  }

  if (step === 'otp') {
    return (
      <>
        <div className="panel-head">
          <div>
            <div className="panel-label">Step 02 / 02</div>
            <h3 className="panel-title">Verify your email</h3>
          </div>
          <StepDots current={2} />
        </div>
        {error && <div className="msg msg-error">{error}</div>}
        <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
          Verification code sent to <span className="mono" style={{ color: 'var(--text)' }}>{form.email}</span>
        </p>
        <OtpExpiryTimer resetKey={otpIssuedAt} />
        <form onSubmit={handleVerify}>
          <OtpInput value={otp} onChange={setOtp} />
          <button className="btn btn-primary" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & activate'}
          </button>
        </form>
        <div className="link-row">
          <button className="btn-link" onClick={() => setStep('form')} type="button">← Edit details</button>
          <button
            className="btn-link"
            onClick={handleResend}
            disabled={cooldown > 0}
            type="button"
            style={{ opacity: cooldown > 0 ? 0.5 : 1 }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="panel-head">
        <div>
          <div className="panel-label">Step 01 / 02</div>
          <h3 className="panel-title">Create account</h3>
        </div>
        <StepDots current={1} />
      </div>
      {error && <div className="msg msg-error">{error}</div>}
      <form onSubmit={handleSubmitForm}>
        <div className="field">
          <label>Full name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Piya Sharma" />
        </div>
        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label>Phone (10-digit)</label>
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" />
        </div>
        <div className="field">
          <label>Password (min. 8 characters)</label>
          <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating…' : 'Create account & send OTP →'}
        </button>
        <p className="terms-note">By signing up, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.</p>
      </form>
    </>
  );
}

// ------------------------------------------------------------------
// Login panel: 3 tabs (password / email OTP / phone OTP) + forgot flow.
// ------------------------------------------------------------------
function LoginPanel({ onAuthSuccess, prefillEmail, justRegistered, onCreateAccountClick }) {
  const [tab, setTab] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [pwEmail, setPwEmail] = useState(prefillEmail || '');
  const [pwPassword, setPwPassword] = useState('');

  useEffect(() => {
    if (prefillEmail) setPwEmail(prefillEmail);
  }, [prefillEmail]);

  const [emailOtpStep, setEmailOtpStep] = useState('request');
  const [emailOtpEmail, setEmailOtpEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpIssuedAt, setEmailOtpIssuedAt] = useState(0);
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);

  const [phoneOtpStep, setPhoneOtpStep] = useState('request');
  const [phone, setPhone] = useState('');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpIssuedAt, setPhoneOtpIssuedAt] = useState(0);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  const [forgotStep, setForgotStep] = useState('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotOtpIssuedAt, setForgotOtpIssuedAt] = useState(0);

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

  const handleSendEmailOtp = (e) => { e.preventDefault(); requestEmailOtp(); };

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

  const handleSendPhoneOtp = (e) => { e.preventDefault(); requestPhoneOtp(); };

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

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword({ email: forgotEmail });
      setForgotStep('reset');
      setForgotOtpIssuedAt(Date.now());
      setInfo(`Reset code sent to ${forgotEmail}`);
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
      <div className="panel-head">
        <div>
          <div className="panel-label">Access</div>
          <h3 className="panel-title">Log in</h3>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'password' ? 'active' : ''}`} onClick={() => switchTab('password')} type="button">Password</button>
        <button className={`tab ${tab === 'email-otp' ? 'active' : ''}`} onClick={() => switchTab('email-otp')} type="button">Email OTP</button>
        <button className={`tab ${tab === 'phone-otp' ? 'active' : ''}`} onClick={() => switchTab('phone-otp')} type="button">Phone OTP</button>
      </div>

      {error && <div className="msg msg-error">{error}</div>}
      {info && !error && <div className="msg msg-success">{info}</div>}
      {justRegistered && !error && !info && (
        <div className="handoff-banner">✓ Account created — sign in below to continue</div>
      )}

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
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          <div className="link-row">
            <button type="button" className="btn-link" onClick={() => { setForgotEmail(pwEmail); switchTab('forgot'); }}>Forgot password?</button>
          </div>

          <div className="social-divider">or continue with</div>
          <div className="social-row">
            <button type="button" className="social-btn" disabled title="Coming soon">
              <span className="icon">G</span> Google
            </button>
            <button type="button" className="social-btn" disabled title="Coming soon">
              <span className="icon">in</span> LinkedIn
            </button>
          </div>

          <p className="switch-note">
            New here? <button type="button" className="btn-link" onClick={onCreateAccountClick}>Create an account</button>
          </p>
        </form>
      )}

      {tab === 'email-otp' && emailOtpStep === 'request' && (
        <form onSubmit={handleSendEmailOtp}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={emailOtpEmail} onChange={(e) => setEmailOtpEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send login OTP'}</button>
        </form>
      )}
      {tab === 'email-otp' && emailOtpStep === 'verify' && (
        <form onSubmit={handleVerifyEmailOtp}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
            Code sent to <span className="mono" style={{ color: 'var(--text)' }}>{emailOtpEmail}</span>
          </p>
          <OtpExpiryTimer resetKey={emailOtpIssuedAt} />
          <OtpInput value={emailOtpCode} onChange={setEmailOtpCode} />
          <button className="btn btn-primary" disabled={loading || emailOtpCode.length !== 6}>{loading ? 'Verifying…' : 'Verify & sign in'}</button>
          <div className="link-row">
            <button type="button" className="btn-link" onClick={() => setEmailOtpStep('request')}>← Different email</button>
            <button type="button" className="btn-link" onClick={requestEmailOtp} disabled={emailResendCooldown > 0 || loading} style={{ opacity: emailResendCooldown > 0 ? 0.5 : 1 }}>
              {emailResendCooldown > 0 ? `Resend in ${emailResendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      {tab === 'phone-otp' && phoneOtpStep === 'request' && (
        <form onSubmit={handleSendPhoneOtp}>
          <div className="field">
            <label>Phone (10-digit)</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send SMS OTP'}</button>
        </form>
      )}
      {tab === 'phone-otp' && phoneOtpStep === 'verify' && (
        <form onSubmit={handleVerifyPhoneOtp}>
          <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 4 }}>
            Code sent to <span className="mono" style={{ color: 'var(--text)' }}>+91 {phone}</span>
          </p>
          <OtpExpiryTimer resetKey={phoneOtpIssuedAt} />
          <OtpInput value={phoneOtpCode} onChange={setPhoneOtpCode} />
          <button className="btn btn-primary" disabled={loading || phoneOtpCode.length !== 6}>{loading ? 'Verifying…' : 'Verify & sign in'}</button>
          <div className="link-row">
            <button type="button" className="btn-link" onClick={() => setPhoneOtpStep('request')}>← Different number</button>
            <button type="button" className="btn-link" onClick={requestPhoneOtp} disabled={phoneResendCooldown > 0 || loading} style={{ opacity: phoneResendCooldown > 0 ? 0.5 : 1 }}>
              {phoneResendCooldown > 0 ? `Resend in ${phoneResendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      {tab === 'forgot' && forgotStep === 'request' && (
        <form onSubmit={handleForgotRequest}>
          <div className="field">
            <label>Email</label>
            <input required type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button>
          <button type="button" className="btn-link" style={{ marginTop: 10 }} onClick={() => switchTab('password')}>← Back to login</button>
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
          <button className="btn btn-primary" disabled={loading || forgotOtp.length !== 6}>{loading ? 'Resetting…' : 'Reset password'}</button>
        </form>
      )}
    </>
  );
}

// ------------------------------------------------------------------
// Profile view: shown once authenticated.
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

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) await logoutUser({ refreshToken });
    } catch {
      // fall through — clear local state regardless
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
      <button className="btn btn-ghost" onClick={handleLogout} style={{ marginTop: 20 }}>Log out</button>
    </div>
  );
}

// ------------------------------------------------------------------
// Root page. `activeView` ('register' | 'login') decides which single
// card is shown; the two toggle buttons switch between them.
// ------------------------------------------------------------------
export default function AuthPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [activeView, setActiveView] = useState('register');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [justRegistered, setJustRegistered] = useState(false);

  const handleAuthSuccess = (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setIsAuthenticated(true);
  };

  const handleLoggedOut = () => {
    setIsAuthenticated(false);
    setJustRegistered(false);
    setActiveView('register');
  };

  const handleRegistered = (email) => {
    setPrefillEmail(email);
    setJustRegistered(true);
    setActiveView('login'); // auto-switch to the Log In card
    setTimeout(() => setJustRegistered(false), 6000);
  };

  if (isAuthenticated) {
    return (
      <>
        <Navbar onSignInClick={() => {}} />
        <div className="hero-form-side" style={{ minHeight: 'calc(100vh - 130px)' }}>
          <ProfileView onLoggedOut={handleLoggedOut} />
        </div>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Navbar onSignInClick={() => setActiveView('login')} />
      <div className="hero">
        <HeroVisual />
        <div className="hero-form-side">
          <div style={{ width: '100%', maxWidth: 460 }}>
            <div className="page-header">
              <div className="eyebrow">Checkpoint · Identity Verification</div>
              <h1>{activeView === 'register' ? 'Create your account' : 'Welcome back'}</h1>
              <p>Register a new account or sign in with a method of your choice.</p>
            </div>

            <ViewToggle active={activeView} onChange={setActiveView} />

            <div
              key={activeView}
              className={`single-card ${activeView === 'login' && justRegistered ? 'just-registered' : ''}`}
            >
              {activeView === 'register' ? (
                <RegisterPanel onRegistered={handleRegistered} />
              ) : (
                <LoginPanel
                  onAuthSuccess={handleAuthSuccess}
                  prefillEmail={prefillEmail}
                  justRegistered={justRegistered}
                  onCreateAccountClick={() => setActiveView('register')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}