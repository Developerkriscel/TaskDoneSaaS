import { useState } from 'react';
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
        <aside className="login-branding">
          <div className="login-brand-logo">
            <img src={kriscelLogoUrl} alt="KRISCEL TECH" />
          </div>
          <p className="login-brand-eyebrow">Work operating system</p>
          <h1 className="brand-title">TaskEasy</h1>
          <p className="brand-subtitle">Streamline your workflow, amplify your results.</p>
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
