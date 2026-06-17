import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  FileText, 
  Award, 
  LogOut, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ChangePasswordProps {
  role: 'ADMIN' | 'STUDENT';
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ role }) => {
  const { user, logout } = useAuth();

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Frontend validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5002/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Your password has been changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        // Handle validation array from zod or single message
        if (data.errors && Array.isArray(data.errors)) {
          setError(data.errors.join(' '));
        } else {
          setError(data.message || 'Failed to change password.');
        }
      }
    } catch (err) {
      console.error('Change password network error:', err);
      setError('Network error: Could not reach the API.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'ADMIN';
  const accentColor = isAdmin ? 'var(--primary)' : 'var(--secondary)';
  const sidebarBadgeClass = isAdmin ? 'neo-badge-admin' : 'neo-badge-student';
  const sidebarTitle = isAdmin ? 'Admin Panel' : 'Student Hub';
  const homeRoute = isAdmin ? '/admin' : '/student';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar matching the dashboard */}
      <aside style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: 'var(--border-width) solid var(--border-color)',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '24px',
            borderBottom: '2px solid #e1e1e1',
            marginBottom: '30px'
          }}>
            <div style={{
              backgroundColor: accentColor,
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              padding: '6px',
              display: 'inline-flex'
            }}>
              {isAdmin ? <Shield size={24} /> : <GraduationCap size={24} />}
            </div>
            <div>
              <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', display: 'block' }}>
                {isAdmin ? 'Exam Portal' : 'Student Portal'}
              </span>
              <span className={`neo-badge ${sidebarBadgeClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                {sidebarTitle}
              </span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to={homeRoute} className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              transform: 'none'
            }}>
              {isAdmin ? <LayoutDashboard size={18} /> : <BookOpen size={18} />}
              Dashboard
            </Link>
            
            {isAdmin ? (
              <>
                <Link to="/admin/exams" className="neo-btn neo-btn-secondary" style={{
                  justifyContent: 'flex-start',
                  boxShadow: 'none',
                  border: '2px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  width: '100%',
                  textDecoration: 'none',
                  transform: 'none'
                }}>
                  <FileText size={18} />
                  Exams List
                </Link>
                <Link to="/admin/students" className="neo-btn neo-btn-secondary" style={{
                  justifyContent: 'flex-start',
                  boxShadow: 'none',
                  border: '2px solid var(--border-color)',
                  backgroundColor: 'transparent',
                  width: '100%',
                  textDecoration: 'none',
                  transform: 'none'
                }}>
                  <Users size={18} />
                  Students
                </Link>
              </>
            ) : (
              <button onClick={() => alert('Future Feature: Review History & Analytics')} className="neo-btn neo-btn-secondary" style={{
                justifyContent: 'flex-start',
                boxShadow: 'none',
                border: '2px solid var(--border-color)',
                backgroundColor: 'transparent',
                width: '100%'
              }}>
                <Award size={18} />
                My Scores
              </button>
            )}

            {/* Active Link */}
            <Link to={isAdmin ? '/admin/change-password' : '/student/change-password'} className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              backgroundColor: accentColor
            }}>
              <Lock size={18} />
              Change Password
            </Link>
          </nav>
        </div>

        <button onClick={logout} className="neo-btn neo-btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '3px solid var(--border-color)'
        }}>
          <div>
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Security Settings</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Update your account credentials for <strong>{user?.name}</strong> ({user?.email})
            </p>
          </div>
          <Link to={homeRoute} className="neo-btn neo-btn-accent" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} />
            Back
          </Link>
        </header>

        <div style={{ maxWidth: '600px' }}>
          {error && (
            <div className="neo-card" style={{
              backgroundColor: 'var(--danger)',
              color: '#fff',
              marginBottom: '30px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="neo-card" style={{
              backgroundColor: 'var(--accent-green)',
              color: 'var(--text-color)',
              marginBottom: '30px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          <div className="neo-card" style={{ backgroundColor: '#ffffff' }}>
            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '24px', fontSize: '1.4rem' }}>
              Change Password
            </h2>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.85rem' }}>
                  Current Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="neo-input"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.85rem' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="neo-input"
                    placeholder="Min 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.85rem' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="neo-input"
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="neo-btn"
                  style={{ flex: 1, backgroundColor: accentColor }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <Link
                  to={homeRoute}
                  className="neo-btn neo-btn-secondary"
                  style={{ textDecoration: 'none', backgroundColor: '#e1e1e1' }}
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
