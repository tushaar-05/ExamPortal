import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Fetch session to get role for routing
      const response = await fetch(apiUrl('/auth/me'), { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const role = data.user.role;
        const target = from || (role === 'ADMIN' ? '/admin' : '/student');
        navigate(target, { replace: true });
      }
    } else {
      setError(result.error || 'Invalid email or password.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
    }}>
      {/* Left accent panel */}
      <div style={{
        display: 'none',
        width: '420px',
        backgroundColor: 'var(--primary)',
        border: '3px solid var(--border-color)',
        borderTop: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        padding: '60px 40px',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
        className="accent-panel"
      >
        <div>
          <div style={{
            backgroundColor: '#ffffff',
            border: '3px solid var(--border-color)',
            borderRadius: '4px',
            boxShadow: '4px 4px 0px #1a1a1a',
            padding: '10px 16px',
            display: 'inline-block',
            marginBottom: '40px',
          }}>
            <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem' }}>Exam Portal</span>
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '2rem', textTransform: 'uppercase', lineHeight: 1.2, marginBottom: '20px' }}>
            Welcome back.
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#333' }}>
            Sign in to access your assessments, view scores, and continue where you left off.
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#444', fontWeight: 700 }}>
          Are you an admin?{' '}
          <Link to="/admin-login" style={{ color: 'var(--text-color)', textDecoration: 'underline' }}>
            Admin portal →
          </Link>
        </div>
      </div>

      {/* Form panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
      }}>
        <div style={{ maxWidth: '420px', width: '100%' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '10px',
              backgroundColor: 'var(--primary)',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--box-shadow-sm)',
              marginBottom: '16px',
            }}>
              <LogIn size={28} />
            </div>
            <h1 style={{
              fontWeight: 900,
              fontSize: '2rem',
              textTransform: 'uppercase',
              letterSpacing: '-1px',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              Student Sign In
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Access your exams and assessment history.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              backgroundColor: 'var(--danger)',
              color: '#ffffff',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: '12px 16px',
              marginBottom: '24px',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: 'var(--box-shadow-sm)',
            }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Email */}
            <div>
              <label htmlFor="login-email" style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Mail size={17} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  className="neo-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Lock size={17} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="neo-input"
                  style={{ paddingLeft: '40px', paddingRight: '44px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', padding: 0,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="neo-btn"
              style={{ width: '100%', marginTop: '8px', padding: '13px', fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Signing In…' : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div style={{
            textAlign: 'center',
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '2px dashed #d4d4d4',
            fontSize: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
              <Link to="/register" style={{ fontWeight: 700, color: 'var(--text-color)', textDecoration: 'underline' }}>
                Register here
              </Link>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Are you an administrator? </span>
              <Link to="/admin-login" style={{ fontWeight: 700, color: 'var(--text-color)', textDecoration: 'underline', fontSize: '0.85rem' }}>
                Admin portal →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
