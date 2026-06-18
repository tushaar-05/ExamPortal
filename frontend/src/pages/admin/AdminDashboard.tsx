import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Clock,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface AdminStats {
  totalExams: number;
  activeModules: number;
  activeStudents: number;
  pendingReviews: number;
  recentViolations: number;
  totalSubmissions: number;
  totalAttempts: number;
}

interface RecentExam {
  id: string;
  title: string;
  subject: string;
  totalPoints: number;
  durationMinutes: number;
  createdAt: string;
  submissionsCount: number;
  attemptsCount: number;
}

interface LatestViolation {
  id: string;
  type: string;
  timestamp: string;
  studentName: string;
  studentEmail: string | null;
}

interface DashboardData {
  stats: AdminStats;
  recentExams: RecentExam[];
  latestViolations: LatestViolation[];
}

const sidebarLinkStyle: React.CSSProperties = {
  justifyContent: 'flex-start',
  boxShadow: 'none',
  border: '2px solid var(--border-color)',
  backgroundColor: 'transparent',
  width: '100%',
  textDecoration: 'none',
  transform: 'none',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: 'var(--border-width) solid var(--border-color)',
  borderRadius: 'var(--border-radius)',
  boxShadow: 'var(--box-shadow-sm)',
};

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/admin/dashboard');
      const data = await response.json();
      if (response.ok) {
        setDashboard(data);
      } else {
        setError(data.message || 'Failed to load dashboard data');
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

  const stats = dashboard?.stats;
  const completionRate = stats && stats.totalAttempts > 0
    ? Math.round((stats.totalSubmissions / stats.totalAttempts) * 100)
    : 0;

  const metricCards = [
    {
      label: 'Created Exams',
      value: stats?.totalExams ?? 0,
      detail: `${stats?.activeModules ?? 0} active now`,
      icon: <FileText size={22} />,
      tone: 'var(--primary)',
    },
    {
      label: 'Registered Students',
      value: stats?.activeStudents ?? 0,
      detail: 'Assessment ready',
      icon: <Users size={22} />,
      tone: 'var(--secondary)',
    },
    {
      label: 'Pending Evaluations',
      value: stats?.pendingReviews ?? 0,
      detail: 'In-progress attempts',
      icon: <Clock size={22} />,
      tone: 'var(--accent)',
    },
    {
      label: 'Alerts / Violations',
      value: stats?.recentViolations ?? 0,
      detail: 'Last 24 hours',
      icon: <AlertTriangle size={22} />,
      tone: 'var(--danger)',
      danger: true,
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      <aside style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: 'var(--border-width) solid var(--border-color)',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '24px',
            borderBottom: '2px solid #e1e1e1',
            marginBottom: '30px',
          }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              padding: '6px',
              display: 'inline-flex',
            }}>
              <Shield size={24} />
            </div>
            <div>
              <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', display: 'block' }}>Exam Portal</span>
              <span className="neo-badge neo-badge-admin" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Admin Panel</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/admin" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              backgroundColor: 'var(--primary)',
              textDecoration: 'none',
            }}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
            <Link to="/admin/exams" className="neo-btn neo-btn-secondary" style={sidebarLinkStyle}>
              <FileText size={18} />
              Exams List
            </Link>
            <Link to="/admin/students" className="neo-btn neo-btn-secondary" style={sidebarLinkStyle}>
              <Users size={18} />
              Students
            </Link>
            <Link to="/admin/subject-scores" className="neo-btn neo-btn-secondary" style={sidebarLinkStyle}>
              <BarChart2 size={18} />
              Subject Marks
            </Link>
            <Link to="/admin/change-password" className="neo-btn neo-btn-secondary" style={sidebarLinkStyle}>
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

      <main style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
          marginBottom: '28px',
          paddingBottom: '22px',
          borderBottom: '3px solid var(--border-color)',
        }}>
          <div>
            <div className="neo-badge neo-badge-admin" style={{ marginBottom: '10px', padding: '5px 10px' }}>
              Live administration
            </div>
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Administrator Console</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
              Welcome back, <strong>{user?.name}</strong>. Monitor assessments, students, and integrity events from one place.
            </p>
          </div>
          <button onClick={fetchAdminStats} className="neo-btn neo-btn-accent" style={{ padding: '9px 13px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="neo-card" style={{
            backgroundColor: 'var(--danger)',
            color: '#fff',
            marginBottom: '24px',
            fontWeight: 800,
          }}>
            Error loading dashboard: {error}
          </div>
        )}

        {loading ? (
          <div style={{ ...cardStyle, padding: '44px', textAlign: 'center' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: 8 }}>Retrieving dashboard metrics...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Fetching live exam, student, and violation data.</p>
          </div>
        ) : (
          <>
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '18px',
              marginBottom: '22px',
            }}>
              {metricCards.map(card => (
                <div key={card.label} style={{ ...cardStyle, padding: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      border: '2px solid var(--border-color)',
                      borderRadius: 6,
                      backgroundColor: card.tone,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.danger ? '#fff' : 'var(--text-color)',
                    }}>
                      {card.icon}
                    </div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                    }}>
                      Live
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    {card.label}
                  </span>
                  <h2 style={{ fontSize: '2.55rem', fontWeight: 900, margin: '8px 0 4px', lineHeight: 1 }}>
                    {card.value}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontWeight: 700, margin: 0 }}>{card.detail}</p>
                </div>
              ))}
            </section>

            <section style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)',
              gap: '22px',
              alignItems: 'start',
            }}>
              <div style={{ ...cardStyle, padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
                  <div>
                    <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.15rem', marginBottom: 4 }}>Recent Exam Activity</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Latest modules and their participation counts.</p>
                  </div>
                  <Link to="/admin/exams" className="neo-btn neo-btn-secondary" style={{ padding: '7px 10px', height: 'fit-content', textDecoration: 'none' }}>
                    <FileText size={15} />
                    Manage
                  </Link>
                </div>

                {dashboard?.recentExams.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {dashboard.recentExams.map(exam => (
                      <div key={exam.id} style={{
                        border: '2px solid var(--border-color)',
                        borderRadius: 6,
                        padding: '14px',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto',
                        gap: 14,
                        backgroundColor: '#fbfbfb',
                      }}>
                        <div>
                          <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 5, textTransform: 'uppercase' }}>{exam.title}</h3>
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontWeight: 700 }}>
                            {exam.subject} · {exam.durationMinutes} mins · {exam.totalPoints} pts
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span className="neo-badge neo-badge-student" style={{ padding: '5px 9px' }}>{exam.attemptsCount} attempts</span>
                          <span className="neo-badge neo-badge-admin" style={{ padding: '5px 9px' }}>{exam.submissionsCount} submissions</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ border: '2px dashed var(--border-color)', borderRadius: 6, padding: '28px', textAlign: 'center' }}>
                    <FileText size={28} />
                    <h3 style={{ textTransform: 'uppercase', fontWeight: 900, margin: '10px 0 4px' }}>No exams yet</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Create an exam to start tracking activity here.</p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div style={{ ...cardStyle, padding: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <Activity size={22} />
                    <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.1rem' }}>System Throughput</h2>
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                        <span>Completion Rate</span>
                        <span>{completionRate}%</span>
                      </div>
                      <div style={{ height: 12, border: '2px solid var(--border-color)', borderRadius: 4, marginTop: 8, overflow: 'hidden', background: '#fff' }}>
                        <div style={{ width: `${completionRate}%`, height: '100%', background: 'var(--accent-green)' }} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="neo-badge neo-badge-student" style={{ padding: '8px 10px', justifyContent: 'center' }}>{stats?.totalAttempts ?? 0} attempts</div>
                      <div className="neo-badge neo-badge-admin" style={{ padding: '8px 10px', justifyContent: 'center' }}>{stats?.totalSubmissions ?? 0} submitted</div>
                    </div>
                  </div>
                </div>

                <div style={{ ...cardStyle, padding: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <AlertTriangle size={22} />
                    <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.1rem' }}>Latest Alerts</h2>
                  </div>
                  {dashboard?.latestViolations.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dashboard.latestViolations.map(alert => (
                        <div key={alert.id} style={{ border: '2px solid var(--border-color)', borderRadius: 6, padding: '11px 12px', backgroundColor: '#fff7f7' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                            <strong style={{ textTransform: 'uppercase', fontSize: '0.82rem' }}>{alert.type.replace(/_/g, ' ')}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
                              {new Date(alert.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p style={{ margin: '5px 0 0', color: 'var(--text-muted)', fontWeight: 700 }}>
                            {alert.studentName}{alert.studentEmail ? ` · ${alert.studentEmail}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontWeight: 800 }}>
                      <CheckCircle2 size={20} />
                      No integrity alerts recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
