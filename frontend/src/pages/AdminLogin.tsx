import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      const response = await fetch(apiUrl('/auth/me'), { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.user.role !== 'ADMIN') {
          setError('This portal is restricted to administrators only.');
          // Log them back out
          await fetch(apiUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
          return;
        }
        navigate('/admin', { replace: true });
      }
    } else {
      setError(result.error || 'Invalid admin credentials.');
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '440px', width: '100%' }}>

        {/* Restricted access banner */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--box-shadow)',
          padding: '10px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          <ShieldCheck size={16} />
          Restricted Access — Authorised Personnel Only
        </div>

        {/* Card */}
        <div className="neo-card" style={{ backgroundColor: '#ffffff', padding: '36px' }}>

          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '10px',
              backgroundColor: 'var(--primary)',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--box-shadow-sm)',
              marginBottom: '16px',
            }}>
              <ShieldCheck size={28} />
            </div>
            <h1 style={{
              fontWeight: 900,
              fontSize: '2rem',
              textTransform: 'uppercase',
              letterSpacing: '-1px',
              lineHeight: 1,
              marginBottom: '8px',
            }}>
              Admin Portal
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Sign in with your administrator credentials.
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
              marginBottom: '20px',
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
              <label htmlFor="admin-email" style={{
                display: 'block', fontWeight: 700, marginBottom: '8px',
                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Admin Email
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Mail size={17} />
                </span>
                <input
                  id="admin-email"
                  type="email"
                  required
                  className="neo-input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="admin@examportal.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" style={{
                display: 'block', fontWeight: 700, marginBottom: '8px',
                fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                Admin Password
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                  <Lock size={17} />
                </span>
                <input
                  id="admin-password"
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
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', padding: 0,
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-submit"
              type="submit"
              className="neo-btn"
              style={{ width: '100%', marginTop: '8px', padding: '13px', fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Verifying…' : (
                <>
                  <ShieldCheck size={18} />
                  Access Admin Console
                </>
              )}
            </button>
          </form>

          {/* Back link */}
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '2px dashed #d4d4d4',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            Not an admin?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--text-color)', textDecoration: 'underline' }}>
              Student sign in →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
