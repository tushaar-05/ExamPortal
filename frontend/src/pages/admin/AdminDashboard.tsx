import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, LogOut, RefreshCw, BarChart2, Shield, Lock } from 'lucide-react';

interface AdminStats {
  totalExams: number;
  activeStudents: number;
  pendingReviews: number;
  recentViolations: number;
}

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5002/api/dashboard/admin', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
      setError('Network error: Could not reach the API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar */}
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
              backgroundColor: 'var(--primary)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              padding: '6px',
              display: 'inline-flex'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', display: 'block' }}>Exam Portal</span>
              <span className="neo-badge neo-badge-admin" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Admin Panel</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a href="#dashboard" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              backgroundColor: 'var(--primary)'
            }}>
              <LayoutDashboard size={18} />
              Dashboard
            </a>
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
            <Link to="/admin/subject-scores" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <BarChart2 size={18} />
              Subject Marks
            </Link>
            <Link to="/admin/change-password" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
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
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Administrator Console</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Welcome back, <strong>{user?.name}</strong> ({user?.email})
            </p>
          </div>
          <button onClick={fetchAdminStats} className="neo-btn neo-btn-accent" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
            Sync
          </button>
        </header>

        {error && (
          <div className="neo-card" style={{
            backgroundColor: 'var(--danger)',
            color: '#fff',
            marginBottom: '30px',
            fontWeight: 700
          }}>
            Error loading credentials stats: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Retrieving analytical metrics...</h3>
          </div>
        ) : (
          <div>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              <div className="neo-card neo-card-hover" style={{ backgroundColor: 'var(--card-bg)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Created Exams</span>
                <h2 style={{ fontSize: '3rem', fontWeight: 900, margin: '10px 0' }}>{stats?.totalExams}</h2>
                <div className="neo-badge neo-badge-admin">Active modules</div>
              </div>

              <div className="neo-card neo-card-hover" style={{ backgroundColor: 'var(--card-bg)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Registered Students</span>
                <h2 style={{ fontSize: '3rem', fontWeight: 900, margin: '10px 0' }}>{stats?.activeStudents}</h2>
                <div className="neo-badge neo-badge-student">Assessment ready</div>
              </div>

              <div className="neo-card neo-card-hover" style={{ backgroundColor: 'var(--card-bg)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending Evaluations</span>
                <h2 style={{ fontSize: '3rem', fontWeight: 900, margin: '10px 0' }}>{stats?.pendingReviews}</h2>
                <div className="neo-badge" style={{ backgroundColor: '#fed1c9' }}>Needs attention</div>
              </div>

              <div className="neo-card neo-card-hover" style={{ backgroundColor: 'var(--card-bg)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Alerts / Violations</span>
                <h2 style={{ fontSize: '3rem', fontWeight: 900, margin: '10px 0 5px 0', color: 'var(--danger)' }}>{stats?.recentViolations}</h2>
                <div className="neo-badge" style={{ backgroundColor: '#ffdede', color: '#b22222' }}>Tab switches</div>
              </div>
            </div>

            {/* Platform Information Card */}
            <div className="neo-card" style={{ borderLeftWidth: '10px', borderLeftColor: 'var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <BarChart2 size={24} />
                <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.25rem' }}>Foundation Verification Status</h2>
              </div>
              <p style={{ marginBottom: '14px', color: 'var(--text-muted)' }}>
                The core system architecture has been loaded successfully. Role-based routing guard verification checks are online.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className="neo-badge neo-badge-admin" style={{ padding: '6px 12px' }}>Role: {user?.role}</span>
                <span className="neo-badge neo-badge-student" style={{ padding: '6px 12px' }}>Database: MongoDB via Prisma</span>
                <span className="neo-badge" style={{ padding: '6px 12px', backgroundColor: 'var(--accent)' }}>Auth: HTTP-Only Token Cookies</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
