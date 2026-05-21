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
  const [showTask, setShowTask] = useState(false);
  const [showEasy, setShowEasy] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const modalRef = useRef(null);
  const heroRef = useRef(null);

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

  // Close modal on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setActiveModal(null);
      }
    }
    if (activeModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeModal]);

  // Close modal on Escape key
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    }
    if (activeModal) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [activeModal]);

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
    <main className="login-page-new">
      {/* Left Panel - Branding (Reference Style) */}
      <section className="login-brand-panel">
          {/* Apple Freeform Style Background Elements */}
          <div className="freeform-canvas">
            <div className="freeform-orb freeform-orb-pink"></div>
            <div className="freeform-orb freeform-orb-blue"></div>
            <div className="freeform-orb freeform-orb-yellow"></div>
            <div className="freeform-orb freeform-orb-green"></div>
            <div className="freeform-orb freeform-orb-purple"></div>
            
            {/* Floating Sticky Notes with App Functions */}
            <div className="freeform-sticky freeform-sticky-yellow">
              <span className="sticky-text">Task Management</span>
            </div>
            <div className="freeform-sticky freeform-sticky-pink">
              <span className="sticky-text">Work Approvals</span>
            </div>
            <div className="freeform-sticky freeform-sticky-green">
              <span className="sticky-text">Checklist Delegations</span>
            </div>
            <div className="freeform-sticky freeform-sticky-blue">
              <span className="sticky-text">MIS Reports</span>
            </div>
            <div className="freeform-sticky freeform-sticky-fms">
              <span className="sticky-text">FMS</span>
            </div>
            
            {/* Corner Links - Terms, Privacy, Support */}
            <div className="login-corner-links">
              <button className="corner-link" onClick={() => setActiveModal('terms')}>Terms of Service</button>
              <span className="corner-separator">|</span>
              <button className="corner-link" onClick={() => setActiveModal('privacy')}>Privacy Policy</button>
              <span className="corner-separator">|</span>
              <button className="corner-link" onClick={() => setActiveModal('support')}>Support</button>
            </div>
          </div>

          <div className="login-brand-content">
            {/* TaskEasy Title - Centered */}
            <div className="login-center-section">
              <h1 className="freeform-title">
                <span className="title-task">Task</span><span className="title-easy">Easy</span>
              </h1>
            </div>
          </div>

          {/* Modal Popup */}
          {activeModal && (
            <div className="login-modal-overlay" onClick={() => setActiveModal(null)}>
              <div className="login-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <button className="login-modal-close" onClick={() => setActiveModal(null)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
                <div className="login-modal-content">
                  {activeModal === 'terms' && (
                    <>
                      <h2>Terms & Conditions</h2>
                      <div className="login-modal-body" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                        <p><strong>Effective Date:</strong> May 2025</p>
                        <p>These Terms & Conditions ("Terms") constitute a legally binding agreement between you ("Client") and Kriscel Tech Pvt. Ltd. ("Company"). By accessing or using our website or services, you agree to be bound by these Terms.</p>
                        
                        <h3>1. Services</h3>
                        <p><strong>1.1 Services Provided:</strong> Kriscel Tech Pvt. Ltd. provides Business Development, Digital Marketing, Web & App Development, Brand Management, and Performance Marketing services.</p>
                        <p><strong>1.2 Service Scope:</strong> The specific services, deliverables, timelines, and fees for each project will be defined in a separate Service Agreement or Statement of Work (SOW).</p>
                        
                        <h3>2. Payment Terms</h3>
                        <p><strong>2.1 Invoicing:</strong> Invoices will be issued within the first 5 days of each month. Payment is due within 15 days of the invoice date.</p>
                        <p><strong>2.2 Late Payment:</strong> A monthly interest of 2% will be charged on payments outstanding beyond 15 days. Services may be suspended if payment remains outstanding for more than 30 days and terminated if unpaid for more than 60 days.</p>
                        
                        <h3>3. Intellectual Property</h3>
                        <p><strong>3.1 Client's IP:</strong> Ownership of the Client's existing trademarks and brand assets remains with the Client.</p>
                        <p><strong>3.2 Developed Work:</strong> Ownership of final deliverables will be transferred to the Client only upon receipt of full payment.</p>
                        
                        <h3>4. Termination</h3>
                        <p><strong>4.1 By Client:</strong> The Client may terminate by providing 30 days' written notice.</p>
                        <p><strong>4.2 By Company:</strong> The Company may terminate for payment default, material breach, or fraudulent activities.</p>
                        
                        <h3>5. Governing Law</h3>
                        <p>These Terms are governed by the laws of India. The courts of Delhi shall have exclusive jurisdiction over any disputes.</p>
                        
                        <p><strong>For full terms, contact:</strong> legal@kriscel.com</p>
                      </div>
                    </>
                  )}
                  {activeModal === 'privacy' && (
                    <>
                      <h2>Privacy Policy</h2>
                      <div className="login-modal-body" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                        <p><strong>Effective Date:</strong> May 2025</p>
                        <p>Kriscel Tech Pvt. Ltd. ("Company") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and protect your data when you visit our website or use our services.</p>
                        
                        <h3>1. Information We Collect</h3>
                        <p><strong>1.1 Personal Information:</strong> Full name, email address, phone number, company name, billing details, and business requirements.</p>
                        <p><strong>1.2 Automatically Collected Information:</strong> IP address, browser type, cookies, log files, and analytics data through Google Analytics.</p>
                        
                        <h3>2. How We Use Your Information</h3>
                        <ul>
                          <li>Providing and managing services</li>
                          <li>Processing payments and invoices</li>
                          <li>Providing customer support</li>
                          <li>Sending marketing communications (opt-out available)</li>
                          <li>Fraud prevention and security monitoring</li>
                          <li>Complying with legal obligations</li>
                        </ul>
                        
                        <h3>3. Data Security</h3>
                        <p>We implement industry-standard security measures including SSL/TLS encryption, secure servers, firewalls, regular security audits, and employee training on data privacy.</p>
                        
                        <h3>4. Your Rights</h3>
                        <ul>
                          <li>Access to your personal information</li>
                          <li>Correction of inaccurate data</li>
                          <li>Deletion of your information</li>
                          <li>Data portability</li>
                          <li>Marketing opt-out</li>
                        </ul>
                        
                        <h3>5. Data Retention</h3>
                        <p>We retain your information while your account is active and for 3 years after account closure for legal compliance purposes.</p>
                        
                        <p><strong>To exercise your rights, contact:</strong> legal@kriscel.com</p>
                      </div>
                    </>
                  )}
                  {activeModal === 'support' && (
                    <>
                      <h2>Support</h2>
                      <div className="login-modal-body" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
                        <p>Need help? We're here to assist you!</p>
                        
                        <h3>Contact Information</h3>
                        <p><strong>Company:</strong> Kriscel Tech Pvt. Ltd.</p>
                        <p><strong>Website:</strong> www.kriscel.com</p>
                        <p><strong>Email:</strong> legal@kriscel.com</p>
                        <p><strong>Response Time:</strong> Within 7 business days</p>
                        
                        <h3>Support for Legal Inquiries</h3>
                        <p>For questions regarding our Privacy Policy or Terms & Conditions, please contact our legal team at legal@kriscel.com.</p>
                        
                        <h3>General Support</h3>
                        <p>For technical support and general inquiries, visit our website at www.kriscel.com or email us directly.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
      </section>

      {/* Right Panel - Login Form */}
      <section className="login-form-panel-new">
        <div className="login-form-container">
          <h1 className="login-heading">Welcome back!</h1>

          <form onSubmit={onSubmit} className="login-form">
            <div className="input-wrapper">
              <div className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <input
                id="userId"
                type="text"
                className="login-input"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID"
                autoComplete="username"
                required
              />
            </div>

            <div className="input-wrapper">
              <div className="input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input
                id="password"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'LOGGING IN...' : 'LOG IN'}
            </button>

            {error && <p className="login-error-msg">{error}</p>}
          </form>

          <div className="login-footer">
            <p>Powered by</p>
            <img src={kriscelLogoUrl} alt="KRISCEL TECH" className="login-footer-logo" />
          </div>
        </div>
      </section>
    </main>
  );
}
