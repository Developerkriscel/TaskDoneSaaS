import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext.jsx';
import { authApi } from '../services/api.js';

export default function AppAdminSecretLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.login(userId.trim(), password);
      if (!res.isValid) {
        setError(res.error || 'Invalid credentials.');
        return;
      }

      const isAppAdmin = Boolean(res.isAppAdmin || res.role === 'App Admin');
      if (!isAppAdmin) {
        setError('This page is restricted to App Admin only.');
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
      navigate('/platform');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <aside className="login-branding">
          <div>
            <h1 className="brand-title">TaskEasy</h1>
            <p className="brand-subtitle">Restricted Platform Access</p>
          </div>
        </aside>

        <section className="login-form-panel">
          <h1 className="login-title">Secret App Admin Login</h1>
          <form onSubmit={onSubmit}>
            <div className="input-block">
              <input
                id="userId"
                className="input-field"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="App Admin User ID"
                autoComplete="username"
                required
              />
              <label htmlFor="userId" className="input-label">App Admin User ID</label>
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

            <button type="submit" className="login-button">ENTER PLATFORM</button>
            {error ? <p className="login-error">{error}</p> : null}
          </form>

          <div className="login-powered-by">
            <p>Powered by</p>
            <strong>Kriscel Tech Pvt Ltd</strong>
          </div>
        </section>
      </section>
    </main>
  );
}
