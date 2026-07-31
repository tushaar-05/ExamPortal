import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, LogOut, RefreshCw, Clock, HelpCircle, Lock, Calendar, Trophy, AlertTriangle, CheckCircle, Zap, ShieldAlert, ArrowRight } from 'lucide-react';
import ProfileAvatar from '../../components/ProfileAvatar';
import { apiFetch } from '../../utils/api';

interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  questionsCount: number;
  status: 'AVAILABLE' | 'COMPLETED' | 'TERMINATED' | 'SCHEDULED' | 'EXPIRED';
  startTime?: string | null;
  endTime?: string | null;
  score?: string;
  type?: 'MCQ' | 'SUBJECTIVE' | null;
}

const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [finalExam, setFinalExam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res1, res2] = await Promise.all([
        apiFetch('/student/exams', { credentials: 'include' }),
        apiFetch('/student/final-exam', { credentials: 'include' }),
      ]);
      if (res1.ok) {
        const data = await res1.json();
        setExams(data.exams);
      } else {
        const errData = await res1.json();
        setError(errData.message || 'Failed to load exam modules');
      }
      if (res2.ok) {
        const data2 = await res2.json();
        setFinalExam(data2.finalExam);
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

  const availableExams = exams.filter(e => e.status === 'AVAILABLE').length;
  const completedExams = exams.filter(e => e.status === 'COMPLETED').length;
  const upcomingExams = exams.filter(e => e.status === 'SCHEDULED').length;

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
          <ProfileAvatar />
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/student" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              border: '2px solid var(--border-color)',
              backgroundColor: 'var(--primary)',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <BookOpen size={18} />
              Exams List
            </Link>
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
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}>
          <div>
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.4rem' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '1rem', fontWeight: 700 }}>
              Welcome back, <strong>{user?.name}</strong>! Let's get to work.
            </p>
          </div>
          <button onClick={fetchStudentExams} className="neo-btn" style={{ padding: '8px 16px', backgroundColor: '#fff' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {error && (
          <div className="neo-card" style={{
            backgroundColor: 'var(--danger)',
            color: '#fff',
            marginBottom: '30px',
            fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <ShieldAlert size={20} />
            Error retrieving exam modules: {error}
          </div>
        )}

        {/* ── FINAL EXAM PROMINENT BANNER ───────────────────────────────────── */}
        {finalExam && (
          <div className="neo-card" style={{
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            marginBottom: '32px',
            padding: '28px',
            borderLeft: '10px solid var(--primary)',
            boxShadow: 'var(--box-shadow)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{
                    backgroundColor: finalExam.submitted ? '#dcfce7' : finalExam.status === 'LIVE' ? '#ef4444' : '#3b82f6',
                    color: finalExam.submitted ? '#166534' : '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {finalExam.submitted ? '✓ Submitted' : finalExam.status === 'LIVE' ? '🔴 Live Now' : finalExam.status === 'ENDED' ? '⏰ Ended' : '🗓 Upcoming'}
                  </span>
                  <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Official Final Examination
                  </span>
                </div>

                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#fff' }}>
                  {finalExam.title}
                </h2>

                {finalExam.description && (
                  <p style={{ color: '#d1d5db', margin: '0 0 16px 0', fontSize: '0.95rem' }}>
                    {finalExam.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} color="var(--primary)" /> {finalExam.durationMinutes} Minutes
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={15} color="var(--primary)" /> {finalExam.subjects?.length || 0} Subjects Included
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="var(--primary)" /> Starts: {new Date(finalExam.startTime).toLocaleString()}
                  </span>
                </div>

                {/* Subject Pills */}
                {finalExam.subjects?.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                    {finalExam.subjects.map((sub: any) => (
                      <span key={sub.id} style={{
                        backgroundColor: '#374151',
                        color: '#f9fafb',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        {sub.name} ({sub.questions?.length || 0} Qs)
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', justifyContent: 'center' }}>
                {finalExam.submitted ? (
                  finalExam.isPublished ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase' }}>RESULT PUBLISHED</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '8px' }}>
                        {finalExam.score}
                      </div>
                      <Link
                        to={`/student/final-exam/${finalExam.id}/result`}
                        className="neo-btn"
                        style={{
                          padding: '10px 20px',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          backgroundColor: '#4ade80',
                          color: '#064e3b',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '2px 2px 0px 0px #ffffff'
                        }}
                      >
                        View Result & Analysis <ArrowRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <div style={{ maxWidth: '320px', backgroundColor: '#262626', border: '1.5px solid #f59e0b', borderRadius: '8px', padding: '14px', textAlign: 'left' }}>
                      <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⏳ Under Evaluation
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: '#d1d5db', lineHeight: 1.4 }}>
                        Your exam has been submitted successfully. Results are currently under evaluation. They will be available here once the admin completes the grading process.
                      </p>
                    </div>
                  )
                ) : finalExam.status === 'ENDED' ? (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: '#374151', border: '1.5px solid #6b7280',
                      color: '#9ca3af', padding: '10px 18px', borderRadius: '6px',
                      fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase'
                    }}>
                      ⏰ Exam Ended
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '6px' }}>
                      This exam has concluded and is no longer accessible.
                    </div>
                  </div>
                ) : (
                  <Link
                    to={`/student/final-exam/${finalExam.id}`}
                    className="neo-btn"
                    style={{
                      padding: '14px 28px',
                      fontSize: '1rem',
                      fontWeight: 900,
                      backgroundColor: 'var(--primary)',
                      color: '#1a1a1a',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '4px 4px 0px 0px #ffffff'
                    }}
                  >
                    Enter Exam Hall <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}


        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div className="neo-card animate-fade-in-up" style={{ animationDelay: '0.05s', backgroundColor: 'var(--accent)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '50%', border: '2px solid var(--border-color)' }}>
                <Zap size={24} color="#1a1a1a" />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>{availableExams}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#333' }}>To Do</div>
              </div>
            </div>
            
            <div className="neo-card animate-fade-in-up" style={{ animationDelay: '0.1s', backgroundColor: '#dbeafe', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '50%', border: '2px solid var(--border-color)' }}>
                <Calendar size={24} color="#1e40af" />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#1e40af' }}>{upcomingExams}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#1e3a8a' }}>Upcoming</div>
              </div>
            </div>

            <div className="neo-card animate-fade-in-up" style={{ animationDelay: '0.15s', backgroundColor: 'var(--accent-green)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '50%', border: '2px solid var(--border-color)' }}>
                <CheckCircle size={24} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: '#064e3b' }}>{completedExams}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#064e3b' }}>Completed</div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.05em' }}>Loading Assessments...</h3>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.4rem', margin: 0 }}>
                My Assessments
              </h2>
            </div>

            {exams.length === 0 ? (
              <div className="neo-card" style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff' }}>
                <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>No exams found</h3>
                <p style={{ color: 'var(--text-muted)' }}>You don't have any exams assigned to you yet.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '24px',
                marginBottom: '40px'
              }}>
                {exams.map((exam, index) => {
                  const isAvailable = exam.status === 'AVAILABLE';
                  const isTerminated = exam.status === 'TERMINATED';
                  const isScheduled = exam.status === 'SCHEDULED';
                  const isExpired = exam.status === 'EXPIRED';

                  const hasEndTime = !!exam.endTime;
                  const isBeforeDeadline = hasEndTime && new Date() < new Date(exam.endTime!);
                  const isReviewBlocked = isBeforeDeadline;

                  const badgeStyle: React.CSSProperties = {
                    ...(
                      isAvailable ? { background: 'var(--accent-green)', color: '#064e3b', borderColor: '#064e3b' } :
                      isScheduled ? { background: '#dbeafe', color: '#1e40af', borderColor: '#1e40af' } :
                      isExpired   ? { background: '#fef3c7', color: '#92400e', borderColor: '#92400e' } :
                      isTerminated? { background: '#fee2e2', color: '#991b1b', borderColor: '#991b1b' } :
                                    { background: '#f3f4f6', color: '#374151', borderColor: '#374151' }
                    ),
                    border: '1.5px solid',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
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
                    <div key={exam.id} className="neo-card neo-card-hover animate-fade-in-up" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: isAvailable ? '#fffbeb' : '#ffffff',
                      borderWidth: isAvailable ? '3px' : '2px',
                      opacity: isExpired || isTerminated ? 0.8 : 1,
                      padding: '24px',
                      animationDelay: `${0.15 + (index * 0.05)}s`
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <span style={badgeStyle}>{statusLabel}</span>
                        </div>

                        <h3 style={{ fontWeight: 900, fontSize: '1.35rem', marginBottom: '16px', textTransform: 'uppercase', lineHeight: 1.2 }}>
                          {exam.title}
                        </h3>

                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '20px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <Clock size={14} />
                            {exam.durationMinutes} mins
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <HelpCircle size={14} />
                            {exam.questionsCount} Qs
                          </span>
                        </div>

                        {(exam.startTime || exam.endTime) && (
                          <div style={{
                            background: isScheduled ? '#eff6ff' : isExpired ? '#fffbeb' : '#fafafa',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            marginBottom: '24px',
                            fontSize: '0.82rem',
                          }}>
                            <div style={{ fontWeight: 900, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', color: '#1a1a1a' }}>
                              <Calendar size={14} /> Exam Window
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {exam.startTime && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Opens:</span>
                                  <strong style={{ color: '#1a1a1a' }}>{formatDt(exam.startTime)}</strong>
                                </div>
                              )}
                              {exam.endTime && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Closes:</span>
                                  <strong style={{ color: '#1a1a1a' }}>{formatDt(exam.endTime)}</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {isAvailable ? (
                        <Link
                          to={`/student/exam/${exam.id}`}
                          className="neo-btn neo-btn-primary"
                          style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '0.95rem' }}
                        >
                          Start Assessment <ArrowRight size={18} />
                        </Link>
                      ) : isScheduled ? (
                        <button disabled className="neo-btn" style={{ width: '100%', padding: '12px', backgroundColor: '#dbeafe', boxShadow: 'none', cursor: 'not-allowed', transform: 'none', color: '#1e40af' }}>
                          Not Started Yet
                        </button>
                      ) : isExpired ? (
                        <button disabled className="neo-btn" style={{ width: '100%', padding: '12px', backgroundColor: '#fef3c7', boxShadow: 'none', cursor: 'not-allowed', transform: 'none', color: '#92400e' }}>
                          Window Closed
                        </button>
                      ) : isTerminated ? (
                        <button disabled className="neo-btn" style={{ width: '100%', padding: '12px', backgroundColor: '#fee2e2', boxShadow: 'none', cursor: 'not-allowed', transform: 'none', color: '#991b1b' }}>
                          <AlertTriangle size={16} /> Session Terminated
                        </button>
                      ) : isReviewBlocked ? (
                        <button disabled className="neo-btn" style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: '#f3f4f6',
                          color: 'var(--text-muted)',
                          boxShadow: 'none',
                          border: '2px solid var(--border-color)',
                          cursor: 'not-allowed',
                          transform: 'none',
                        }}>
                          Review after {formatDt(exam.endTime!)}
                        </button>
                      ) : (
                        <Link
                          to={`/student/exam/${exam.id}/review`}
                          className="neo-btn"
                          style={{
                            width: '100%',
                            padding: '12px',
                            display: 'flex',
                            justifyContent: 'center',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            boxShadow: '2px 2px 0 var(--border-color)',
                            border: '2px solid var(--border-color)',
                          }}
                        >
                          Review Answers
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="neo-card animate-fade-in-up" style={{ 
              borderLeftWidth: '8px', 
              borderLeftColor: 'var(--primary)', 
              backgroundColor: '#fff',
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
              animationDelay: `${0.2 + (exams.length * 0.05)}s`
            }}>
              <div style={{ backgroundColor: '#fff7d6', padding: '10px', borderRadius: '50%', border: '2px solid var(--border-color)', flexShrink: 0 }}>
                <ShieldAlert size={24} color="#d97706" />
              </div>
              <div>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.2rem', margin: '0 0 10px 0', color: '#1a1a1a' }}>
                  Important Exam Rules
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.95rem', color: '#444', lineHeight: '1.6', fontWeight: 600 }}>
                  <li style={{ marginBottom: '6px' }}>Do not switch tabs or minimize the browser window. Tab switching is strictly monitored.</li>
                  <li style={{ marginBottom: '6px' }}>Ensure you have a stable internet connection before starting.</li>
                  <li>Your exam session will automatically submit once the countdown timer reaches zero.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
