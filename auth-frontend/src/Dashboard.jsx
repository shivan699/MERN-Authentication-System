import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile, logoutUser } from './api/auth';
import { sendChatMessage } from './api/chat';
import { logout as logoutAction } from './features/auth/authSlice';
import { disconnectSocket } from './socket/socket';

const QUICK_PROMPTS = [
  { label: 'Optimize my resume', prompt: 'Can you review and optimize my resume?' },
  { label: 'Find remote Dev roles', prompt: 'Find remote developer roles that match my profile.' },
  { label: 'Mock interview', prompt: "Let's do a mock interview." },
];

const ALERTS = [
  { title: 'Upcoming Interview: Google', sub: 'Tomorrow, 2:00 PM • Google Meet' },
  { title: 'New Match: Senior Frontend Dev', sub: 'Vercel • 98% Match Score • Remote' },
];

const TRENDS = [
  { label: 'AI Engineering', change: '+24%', width: '78%' },
  { label: 'Next.js Specialists', change: '+18%', width: '62%' },
];

// ------------------------------------------------------------------
// Circular profile-strength ring, built with plain SVG.
// ------------------------------------------------------------------
function ProgressRing({ percent }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border-strong)" strokeWidth="8" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
      <text x="60" y="56" textAnchor="middle" className="mono" fontSize="22" fontWeight="700" fill="var(--accent)">
        {percent}%
      </text>
      <text x="60" y="74" textAnchor="middle" fontSize="10" fill="var(--text-dim)">
        Expert
      </text>
    </svg>
  );
}

// ------------------------------------------------------------------
// Chat tab: message list + composer. Talks to POST /api/chat/message.
// Also consumes a "pendingPrompt" queued from a Home quick-action card.
// ------------------------------------------------------------------
function ChatPanel({ userName, pendingPrompt, onPromptConsumed }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${userName || 'there'}! I'm scanning 12,400+ new opportunities since your last visit. Based on your profile, I found a few strong matches — want to review them, or work on your resume first?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => {
      const next = [...prev, { role: 'user', content: trimmed }];
      // Fire the request using the up-to-date history captured here.
      setSending(true);
      sendChatMessage(trimmed, prev)
        .then((res) => setMessages((p) => [...p, { role: 'assistant', content: res.data.reply }]))
        .catch(() => setMessages((p) => [...p, { role: 'assistant', content: "Sorry, I couldn't process that. Please try again." }]))
        .finally(() => setSending(false));
      return next;
    });
    setInput('');
  }, []);

  // Auto-send a prompt queued from a Home quick-action card, once.
  useEffect(() => {
    if (pendingPrompt) {
      send(pendingPrompt);
      onPromptConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="chat-card">
      <div className="chat-header">
        <span className="chat-icon">🧠</span>
        <div className="chat-title">How can I help you today?</div>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="chat-typing">
            <span /><span /><span /> Pulse AI is analyzing…
          </div>
        )}
      </div>

      <div className="chat-quick-row">
        {QUICK_PROMPTS.map((q) => (
          <button key={q.label} type="button" className="chat-quick-chip" onClick={() => send(q.prompt)} disabled={sending}>
            {q.label}
          </button>
        ))}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your request here…"
          disabled={sending}
        />
        <button type="submit" className="chat-send" disabled={sending || !input.trim()} aria-label="Send">➤</button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------
// Home tab: alerts, quick actions, profile strength, trends.
// ------------------------------------------------------------------
function HomePanel({ profile, onQuickAction }) {
  const profileStrength = profile?.isVerified ? 85 : 45; // placeholder metric

  return (
    <>
      <section className="dash-section">
        <div className="dash-section-head">
          <h3>🔔 Urgent Alerts</h3>
          <span className="dash-link">View All</span>
        </div>
        {ALERTS.map((a) => (
          <div key={a.title} className="alert-card">
            <div className="alert-bar" />
            <div>
              <div className="alert-title">{a.title}</div>
              <div className="alert-sub">{a.sub}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="dash-section quick-actions">
        <button type="button" className="quick-action-card" onClick={() => onQuickAction('Scan and score my resume against current job market demand.')}>
          <span className="qa-icon">🧾</span> Resume Scan
        </button>
        <button type="button" className="quick-action-card" onClick={() => onQuickAction("Let's do a mock interview.")}>
          <span className="qa-icon">🗣️</span> Interview Prep
        </button>
        <button type="button" className="quick-action-card" onClick={() => onQuickAction('Show me the status of my job applications.')}>
          <span className="qa-icon">📋</span> App Tracker
        </button>
      </section>

      <section className="dash-section" style={{ textAlign: 'center' }}>
        <div className="dash-section-head" style={{ justifyContent: 'center' }}>
          <h3 style={{ color: 'var(--text-dim)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Profile Strength</h3>
        </div>
        <ProgressRing percent={profileStrength} />
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '10px 0 16px' }}>
          Complete your profile skills to reach 100%.
        </p>
        <button type="button" className="btn btn-primary" style={{ maxWidth: 220, margin: '0 auto' }}>
          Complete Profile
        </button>
      </section>

      <section className="dash-section">
        <div className="dash-section-head"><h3>📈 Trends</h3></div>
        {TRENDS.map((t) => (
          <div key={t.label} className="trend-row">
            <div className="trend-label-row">
              <span>{t.label}</span>
              <span className="trend-change">{t.change}</span>
            </div>
            <div className="trend-bar-track"><div className="trend-bar-fill" style={{ width: t.width }} /></div>
          </div>
        ))}
        <p className="trend-note">Market demand for your core stack is High this month.</p>
      </section>
    </>
  );
}

// ------------------------------------------------------------------
// Root dashboard: bottom-nav-driven tabs (Home / Chat / Alerts / Jobs / Profile).
// ------------------------------------------------------------------
export default function Dashboard({ onLoggedOut }) {
  const dispatch = useDispatch();
  const { refreshToken } = useSelector((state) => state.auth);
  const [tab, setTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [pendingPrompt, setPendingPrompt] = useState(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      setProfile(res.data);
    } catch {
      // Non-fatal for the dashboard shell; chat/home still render.
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleLogout = async () => {
    try {
      if (refreshToken) await logoutUser({ refreshToken });
    } catch {
      // fall through
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch(logoutAction());
      disconnectSocket();
      onLoggedOut();
    }
  };

  const goToChatWith = (prompt) => {
    setTab('chat');
    setPendingPrompt(prompt);
  };

  return (
    <div className="dash-shell">
      <header className="dash-topbar">
        <div className="dash-avatar">🧑‍💻</div>
        <span className="dash-brand">CareerPulse AI</span>
        <span className="dash-trend-icon">📈</span>
      </header>

      <main className="dash-main">
        {/* Chat stays mounted (hidden via CSS, not unmounted) so
            conversation state survives switching tabs. */}
        <div style={{ display: tab === 'chat' ? 'block' : 'none' }}>
          <ChatPanel
            userName={profile?.name}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={() => setPendingPrompt(null)}
          />
        </div>

        {tab === 'home' && <HomePanel profile={profile} onQuickAction={goToChatWith} />}

        {tab === 'alerts' && (
          <section className="dash-section">
            <div className="dash-section-head"><h3>🔔 All Alerts</h3></div>
            {ALERTS.map((a) => (
              <div key={a.title} className="alert-card">
                <div className="alert-bar" />
                <div>
                  <div className="alert-title">{a.title}</div>
                  <div className="alert-sub">{a.sub}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'jobs' && (
          <section className="dash-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: 'var(--text-dim)' }}>Job listings are coming soon.</p>
          </section>
        )}

        {tab === 'profile' && profile && (
          <div className="stamp-card" style={{ margin: '0 auto' }}>
            <div className="stamp">✓ VERIFIED</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>🟢 Live session active</div>
            <div className="profile-row"><span className="k">Name</span><span className="v">{profile.name}</span></div>
            <div className="profile-row"><span className="k">Email</span><span className="v">{profile.email}</span></div>
            <div className="profile-row"><span className="k">Phone</span><span className="v">{profile.phone}</span></div>
            <div className="profile-row"><span className="k">Status</span><span className="v">{profile.isVerified ? 'Active' : 'Pending'}</span></div>
            <button className="btn btn-ghost" onClick={handleLogout} style={{ marginTop: 20 }}>Log out</button>
          </div>
        )}
      </main>

      <nav className="dash-bottom-nav">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><span>🏠</span>Home</button>
        <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}><span>💬</span>Chat</button>
        <button className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}><span>🔔</span>Alerts</button>
        <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}><span>💼</span>Jobs</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><span>👤</span>Profile</button>
      </nav>
    </div>
  );
}