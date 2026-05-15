import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext.jsx';
import { authApi } from '../services/api.js';
import kriscelLogoUrl from '../assets/kriscel-logo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showTask, setShowTask] = useState(false);
  const [showEasy, setShowEasy] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 10,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 10
        });
      }
    };

    const hero = heroRef.current;
    if (hero) {
      hero.addEventListener('mousemove', handleMouseMove);
      return () => hero.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  useEffect(() => {
    const timer1 = setTimeout(() => setShowTask(true), 800);
    const timer2 = setTimeout(() => setShowEasy(true), 1400);
    const timer3 = setTimeout(() => setShowTagline(true), 2000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const normalizedUserId = userId.trim();
      const res = await authApi.login(normalizedUserId, password);
      if (!res.isValid) {
        setError(res.error || 'Invalid credentials.');
        return;
      }

      const isAppAdmin = Boolean(res.isAppAdmin || res.role === 'App Admin');
      if (isAppAdmin) {
        setError('Use secret App Admin login page for platform access.');
        return;
      }

      login({
        name: res.userName,
        role: res.role,
        roleName: res.roleName,
        isAppAdmin,
        companyId: res.companyId,
        loginScope: res.loginScope
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <aside className="freeform-hero" ref={heroRef}>
          <div className="freeform-canvas">
            {/* Colorful Gradient Orbs */}
            <div className="freeform-orb freeform-orb-pink" />
            <div className="freeform-orb freeform-orb-blue" />
            <div className="freeform-orb freeform-orb-yellow" />
            <div className="freeform-orb freeform-orb-green" />
            <div className="freeform-orb freeform-orb-purple" />

            {/* Sketchy Doodles */}
            <svg className="freeform-doodle freeform-doodle-1" viewBox="0 0 120 100" fill="none">
              <path d="M10 90 Q 30 10 60 50 T 110 30" stroke="#FF6B9D" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 4"/>
            </svg>
            <svg className="freeform-doodle freeform-doodle-2" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="32" stroke="#7C3AED" strokeWidth="2" strokeDasharray="6 4"/>
            </svg>
            <svg className="freeform-doodle freeform-doodle-3" viewBox="0 0 70 70" fill="none">
              <rect x="8" y="8" width="54" height="54" stroke="#22D3EE" strokeWidth="2" strokeDasharray="5 3" rx="6"/>
            </svg>

            {/* Color Palette - Top Left */}
            <div className="freeform-palette">
              <span className="palette-dot palette-pink" />
              <span className="palette-dot palette-purple" />
              <span className="palette-dot palette-blue" />
              <span className="palette-dot palette-yellow" />
            </div>

            {/* Sticky Notes - Positioned like image */}
            <div className="freeform-sticky freeform-sticky-yellow">
              <span className="sticky-text">Design First!</span>
            </div>

            <div className="freeform-sticky freeform-sticky-pink">
              <span className="sticky-text">Innovation</span>
            </div>

            <div className="freeform-sticky freeform-sticky-green">
              <span className="sticky-text">Growth</span>
            </div>

            <div className="freeform-sticky freeform-sticky-blue">
              <span className="sticky-text">Team Work</span>
            </div>

            {/* Floating Wow Tag */}
            <div className="freeform-wow-tag">
              <span>Wow!</span>
            </div>

            {/* Main Content - Centered like image */}
            <div className="freeform-content" style={{ transform: `translate(-50%, -50%) perspective(1000px) rotateY(${mousePos.x * 0.08}deg) rotateX(${-mousePos.y * 0.08}deg)` }}>

              {/* Logo */}
              <div className="freeform-logo-wrap">
                <img src={kriscelLogoUrl} alt="KRISCEL TECH" className="freeform-logo-img" />
              </div>

              {/* Badge with pulse */}
              <div className="freeform-badge">
                <span className="badge-dot" />
                <span className="badge-text">WORK OPERATING SYSTEM</span>
              </div>

              {/* TaskEasy Title with Typewriter */}
              <h1 className="freeform-title">
                <span className={`title-task ${showTask ? 'typewriter' : ''}`}>
                  <span className="title-char">T</span>
                  <span className="title-char">a</span>
                  <span className="title-char">s</span>
                  <span className="title-char">k</span>
                </span>
                <span className={`title-easy ${showEasy ? 'typewriter' : ''}`}>
                  <span className="title-char">E</span>
                  <span className="title-char">a</span>
                  <span className="title-char">s</span>
                  <span className="title-char">y</span>
                </span>
              </h1>

              {/* Tagline with Typewriter */}
              <p className={`freeform-tagline ${showTagline ? 'typewriter' : ''}`}>
                <span className="tagline-text">Streamline your workflow, automate your processes, and amplify your results.</span>
              </p>

              {/* Feature Pills */}
              <div className="freeform-features">
                <div className="feature-tag tag-pink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h6M14 7h6M4 17h6M14 17h6M9 7l6 10" strokeLinecap="round"/>
                  </svg>
                  <span>Automation</span>
                </div>
                <div className="feature-tag tag-purple">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round"/>
                  </svg>
                  <span>Collaboration</span>
                </div>
                <div className="feature-tag tag-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round"/>
                  </svg>
                  <span>Tracking</span>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="freeform-trust">
                <div className="trust-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                  <span>Secure</span>
                </div>
                <div className="trust-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                  </svg>
                  <span>Cloud</span>
                </div>
                <div className="trust-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-mobile-logo">
            <img src={kriscelLogoUrl} alt="KRISCEL TECH" />
          </div>
          <h1 className="login-title">Welcome Back!</h1>
          <form onSubmit={onSubmit}>
            <div className="input-block">
              <input
                id="userId"
                className="input-field"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID"
                autoComplete="username"
                required
              />
              <label htmlFor="userId" className="input-label">User ID</label>
            </div>

            <div className="input-block">
              <input
                id="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <label htmlFor="password" className="input-label">Password</label>
            </div>

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? 'LOGGING IN...' : 'LOG IN'}
            </button>
            {error ? <p className="login-error">{error}</p> : null}
          </form>

          <div className="login-powered-by">
            <p>Powered by</p>
            <strong>KRISCEL TECH</strong>
          </div>
        </section>
      </section>
    </main>
  );
}
