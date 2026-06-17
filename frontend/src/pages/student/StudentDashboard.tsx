import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, LogOut, RefreshCw, Clock, HelpCircle, Lock, Calendar, Trophy } from 'lucide-react';
import ProfileAvatar from '../../components/ProfileAvatar';
import { apiUrl } from '../../utils/api';

interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  questionsCount: number;
  status: 'AVAILABLE' | 'COMPLETED' | 'TERMINATED' | 'SCHEDULED' | 'EXPIRED';
  startTime?: string | null;
  endTime?: string | null;
  score?: string;
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/student/exams'), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to load exam modules');
      }
    } catch (err) {
      console.error('Fetch exams error:', err);
      setError('Network error: Could not connect to Express API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentExams();
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
          {/* Profile avatar with upload */}
          <ProfileAvatar />

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <a href="#exams" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%'
            }}>
              <BookOpen size={18} />
              Exams List
            </a>
            <Link to="/student/scores" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <Award size={18} />
              My Scores
            </Link>
            <Link to="/student/leaderboard" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <Trophy size={18} />
              Leaderboard
            </Link>
            <Link to="/student/change-password" className="neo-btn neo-btn-secondary" style={{
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

      {/* Main Content */}
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
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Student Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Welcome back, <strong>{user?.name}</strong> ({user?.email})
            </p>
          </div>
          <button onClick={fetchStudentExams} className="neo-btn neo-btn-accent" style={{ padding: '8px 12px' }}>
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
            Error retrieving exam modules: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Loading available assessments...</h3>
          </div>
        ) : (
          <div>
            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '20px', fontSize: '1.4rem' }}>
              Active Assessments
            </h2>

            {/* Exam Modules Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              {exams.map((exam) => {
                const isAvailable = exam.status === 'AVAILABLE';
                const isTerminated = exam.status === 'TERMINATED';
                const isScheduled = exam.status === 'SCHEDULED';
                const isExpired = exam.status === 'EXPIRED';

                // Badge color
                const badgeStyle: React.CSSProperties = {
                  ...(
                    isAvailable ? { background: 'var(--accent-green)', color: '#1a1a1a' } :
                    isScheduled ? { background: '#dbeafe', color: '#1e40af' } :
                    isExpired   ? { background: '#fef3c7', color: '#92400e' } :
                    isTerminated? { background: '#ffe0e0', color: '#b22222' } :
                                  { background: '#f0f0f0', color: '#555' }
                ),
                  border: 'var(--border-width) solid var(--border-color)',
                  borderRadius: 4,
                  padding: '2px 10px',
                  fontWeight: 900,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                };

                const statusLabel = {
                  AVAILABLE: '✓ Available',
                  COMPLETED: '✓ Completed',
                  TERMINATED: '⛔ Terminated',
                  SCHEDULED: '🗓 Scheduled',
                  EXPIRED: '⏰ Expired',
                }[exam.status] ?? exam.status;

                const formatDt = (iso: string) =>
                  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

                return (
                  <div key={exam.id} className="neo-card neo-card-hover" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    opacity: isExpired || isTerminated ? 0.75 : 1,
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <span style={badgeStyle}>{statusLabel}</span>
                        {exam.score && (
                          <span style={{ fontWeight: 900, fontSize: '1.1rem', backgroundColor: 'var(--accent)', border: '2px solid var(--border-color)', padding: '2px 8px', borderRadius: '4px' }}>
                            Score: {exam.score}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: '12px', textTransform: 'uppercase' }}>
                        {exam.title}
                      </h3>

                      <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={16} />
                          {exam.durationMinutes} mins
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <HelpCircle size={16} />
                          {exam.questionsCount} Questions
                        </span>
                      </div>

                      {/* Schedule window info */}
                      {(exam.startTime || exam.endTime) && (
                        <div style={{
                          background: isScheduled ? '#eff6ff' : isExpired ? '#fffbeb' : '#f8f8f8',
                          border: 'var(--border-width) solid var(--border-color)',
                          borderRadius: 'var(--border-radius)',
                          padding: '10px 12px',
                          marginBottom: 16,
                          fontSize: '0.82rem',
                        }}>
                          <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={13} /> Exam Window
                          </div>
                          {exam.startTime && (
                            <div style={{ color: 'var(--text-muted)' }}>From: <strong>{formatDt(exam.startTime)}</strong></div>
                          )}
                          {exam.endTime && (
                            <div style={{ color: 'var(--text-muted)' }}>Until: <strong>{formatDt(exam.endTime)}</strong></div>
                          )}
                        </div>
                      )}
                    </div>

                    {isAvailable ? (
                      <Link
                        to={`/student/exam/${exam.id}`}
                        className="neo-btn"
                        style={{ width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', textDecoration: 'none' }}
                      >
                        Start Assessment
                      </Link>
                    ) : isScheduled ? (
                      <button disabled className="neo-btn" style={{ width: '100%', padding: '10px', backgroundColor: '#dbeafe', boxShadow: 'none', cursor: 'not-allowed', transform: 'none', color: '#1e40af' }}>
                        Not Started Yet
                      </button>
                    ) : isExpired ? (
                      <button disabled className="neo-btn" style={{ width: '100%', padding: '10px', backgroundColor: '#fef3c7', boxShadow: 'none', cursor: 'not-allowed', transform: 'none', color: '#92400e' }}>
                        Window Closed
                      </button>
                    ) : isTerminated ? (
                      <button disabled className="neo-btn" style={{ width: '100%', padding: '10px', backgroundColor: '#ffe0e0', boxShadow: 'none', cursor: 'not-allowed', transform: 'none', color: '#b22222' }}>
                        ⛔ Session Terminated
                      </button>
                    ) : (
                      <Link
                        to={`/student/exam/${exam.id}/review`}
                        className="neo-btn"
                        style={{
                          width: '100%',
                          padding: '10px',
                          display: 'flex',
                          justifyContent: 'center',
                          textDecoration: 'none',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          boxShadow: 'none',
                          border: '2px solid var(--border-color)',
                          transform: 'none',
                        }}
                      >
                        Review Answers
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Assessment Rules notice */}
            <div className="neo-card" style={{ borderLeftWidth: '10px', borderLeftColor: 'var(--secondary)', backgroundColor: '#ffffff' }}>
              <h3 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.1rem', marginBottom: '8px' }}>
                Assessment Rules Checklist
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                <li>Do not switch tabs or minimize the browser window (monitored).</li>
                <li>Your exam session will automatically submit once the countdown timer reaches zero.</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
