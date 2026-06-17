import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, LogOut, RefreshCw, BarChart2, Shield, Lock, Search, HelpCircle } from 'lucide-react';

interface StudentSubjectMark {
  id: string;
  name: string;
  email: string;
  overallScore: string;
  subjectScores: Record<string, string>;
}

interface ScoresPayload {
  subjects: string[];
  studentMarks: StudentSubjectMark[];
}

const StudentSubjectScores: React.FC = () => {
  const { logout } = useAuth();
  const [data, setData] = useState<ScoresPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubjectMarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5002/api/admin/students/subject-scores', {
        credentials: 'include',
      });
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to load subject scores sheet.');
      }
    } catch (err) {
      console.error('Fetch subject scores error:', err);
      setError('Network error: Could not reach the API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjectMarks();
  }, []);

  // Filter students based on search query
  const filteredStudents = data?.studentMarks.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Helper to color-code score percentages
  const getScoreBadgeStyle = (scoreStr: string) => {
    if (scoreStr === 'N/A') {
      return { backgroundColor: '#f0f0f0', color: '#777', border: '1px solid var(--border-color)' };
    }
    const val = parseInt(scoreStr.replace('%', ''), 10);
    if (isNaN(val)) {
      return { backgroundColor: '#f0f0f0', color: '#777', border: '1px solid var(--border-color)' };
    }
    if (val >= 80) {
      return { backgroundColor: 'var(--accent-green)', color: '#1a1a1a', border: '2px solid var(--border-color)' };
    }
    if (val >= 50) {
      return { backgroundColor: '#fef3c7', color: '#92400e', border: '2px solid var(--border-color)' };
    }
    return { backgroundColor: '#ffe0e0', color: '#b22222', border: '2px solid var(--border-color)' };
  };

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
        justifyContent: 'space-between',
        flexShrink: 0
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
            <Link to="/admin" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
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
            <Link to="/admin/subject-scores" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              textDecoration: 'none'
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
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Subject Marks Matrix</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Consolidated subject averages for all registered students
            </p>
          </div>
          <button onClick={fetchSubjectMarks} className="neo-btn neo-btn-accent" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="neo-card" style={{
            backgroundColor: 'var(--danger)',
            color: '#fff',
            marginBottom: '30px',
            fontWeight: 700
          }}>
            Error loading marks matrix: {error}
          </div>
        )}

        {/* Toolbar & Search */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input"
              style={{ paddingLeft: '44px', width: '100%' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Assembling performance grid...</h3>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="neo-card" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff' }}>
            <HelpCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}>No Student Records</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'No student matches your search.' : 'Add students to the database to populate this scores matrix.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: 'var(--border-width) solid var(--border-color)', boxShadow: 'var(--box-shadow)', borderRadius: 'var(--border-radius)' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#ffffff',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--primary)',
                  borderBottom: 'var(--border-width) solid var(--border-color)'
                }}>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '20%' }}>Student Name</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '15%' }}>Git & Github</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '15%' }}>AI Fundamentals</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '15%' }}>Automation with N8N</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '18%' }}>AI tools & Productivity</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '17%' }}>Overall Average</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{
                    borderBottom: '2px solid var(--border-color)',
                    transition: 'var(--transition)'
                  }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700 }}>{student.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{student.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="neo-badge" style={{
                        ...getScoreBadgeStyle(student.subjectScores['Git and Github']),
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        {student.subjectScores['Git and Github']}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="neo-badge" style={{
                        ...getScoreBadgeStyle(student.subjectScores['AI fundamentals']),
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        {student.subjectScores['AI fundamentals']}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="neo-badge" style={{
                        ...getScoreBadgeStyle(student.subjectScores['Automation with N8N']),
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        {student.subjectScores['Automation with N8N']}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="neo-badge" style={{
                        ...getScoreBadgeStyle(student.subjectScores['AI tools and Productivity']),
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        {student.subjectScores['AI tools and Productivity']}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="neo-badge" style={{
                        ...getScoreBadgeStyle(student.overallScore),
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        padding: '4px 10px',
                        textTransform: 'uppercase'
                      }}>
                        {student.overallScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentSubjectScores;
