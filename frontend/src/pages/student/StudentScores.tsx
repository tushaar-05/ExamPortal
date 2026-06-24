import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, LogOut, RefreshCw, Lock, Calendar, AlertTriangle, ChevronDown, ChevronUp, Award as AwardIcon, TrendingUp, CheckSquare, Trophy } from 'lucide-react';
import ProfileAvatar from '../../components/ProfileAvatar';
import { apiFetch } from '../../utils/api';

interface ExamDetail {
  id: string;
  title: string;
  totalPoints: number;
  score: number | null;
  graded?: boolean;
  status: 'AVAILABLE' | 'COMPLETED' | 'TERMINATED' | 'SCHEDULED' | 'EXPIRED';
  dateTaken: string | null;
}

interface SubjectStat {
  subject: string;
  totalExams: number;
  examsCompleted: number;
  averagePercentage: number;
  exams: ExamDetail[];
}

interface ScoresPayload {
  subjects: SubjectStat[];
  unassigned: SubjectStat | null;
}

const StudentScores: React.FC = () => {
  const { logout } = useAuth();
  const [data, setData] = useState<ScoresPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track open/collapsed subjects
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const fetchScores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/student/scores', {
        credentials: 'include',
      });
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
        
        // Expand subjects by default if they have exams
        const initialExpand: Record<string, boolean> = {};
        payload.subjects.forEach((subj: SubjectStat) => {
          initialExpand[subj.subject] = subj.totalExams > 0;
        });
        if (payload.unassigned) {
          initialExpand['Unassigned'] = true;
        }
        setExpandedSubjects(initialExpand);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to load score reports.');
      }
    } catch (err) {
      console.error('Fetch scores error:', err);
      setError('Network error: Could not connect to API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const toggleSubject = (subjName: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjName]: !prev[subjName]
    }));
  };

  // Calculate high-level overview metrics
  const getOverviewMetrics = () => {
    if (!data) return { overallAvg: 0, completedCount: 0, totalAvailable: 0 };
    
    let totalEarned = 0;
    let totalPossible = 0;
    let completedCount = 0;
    let totalAvailable = 0;

    const allStats = [...data.subjects];
    if (data.unassigned) allStats.push(data.unassigned);

    allStats.forEach(stat => {
      totalAvailable += stat.totalExams;
      stat.exams.forEach(exam => {
        if (exam.score !== null) {
          totalEarned += exam.score;
          totalPossible += exam.totalPoints;
          completedCount++;
        }
      });
    });

    const overallAvg = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    return { overallAvg, completedCount, totalAvailable };
  };

  const { overallAvg, completedCount, totalAvailable } = getOverviewMetrics();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
      {/* Sidebar navigation */}
      <aside style={{
        width: '280px',
        backgroundColor: '#ffffff',
        borderRight: '3px solid var(--border-color)',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          {/* Profile avatar with upload */}
          <ProfileAvatar />

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/student" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <BookOpen size={18} />
              Exams List
            </Link>
            <Link to="/student/scores" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              textDecoration: 'none'
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
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Performance Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Detailed overview of your assessment scores by subject
            </p>
          </div>
          <button onClick={fetchScores} className="neo-btn neo-btn-accent" style={{ padding: '8px 12px' }}>
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
            Error retrieving scores: {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Compiling performance reports...</h3>
          </div>
        ) : !data ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>No Performance Records Available</h3>
          </div>
        ) : (
          <div>
            {/* Overview Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
              marginBottom: '40px'
            }}>
              <div className="neo-card" style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px' }}>
                <div style={{
                  backgroundColor: 'var(--accent)',
                  border: '2px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Average</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '2px' }}>{overallAvg}%</div>
                </div>
              </div>

              <div className="neo-card" style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px' }}>
                <div style={{
                  backgroundColor: 'var(--accent-green)',
                  border: '2px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckSquare size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exams Completed</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '2px' }}>{completedCount} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {totalAvailable}</span></div>
                </div>
              </div>

              <div className="neo-card" style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px' }}>
                <div style={{
                  backgroundColor: 'var(--secondary)',
                  border: '2px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AwardIcon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gained Score (Avg)</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '2px' }}>
                    {completedCount > 0 ? `${Math.round(overallAvg * 0.1)}/10` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Panels */}
            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '24px', fontSize: '1.4rem' }}>
              Subject-wise Breakdown
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
              {(() => {
                const subjectList = [...data.subjects];
                if (data.unassigned) {
                  subjectList.push(data.unassigned);
                }
                
                return subjectList.map((subj) => {
                  const isExpanded = !!expandedSubjects[subj.subject];
                  const hasExams = subj.totalExams > 0;
                  
                  return (
                    <div 
                      key={subj.subject} 
                      className="neo-card" 
                      style={{ 
                        backgroundColor: '#ffffff', 
                        padding: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {/* Subject Card Header */}
                      <div 
                        onClick={() => toggleSubject(subj.subject)}
                        style={{ 
                          padding: '20px 24px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          backgroundColor: '#fbfbfb',
                          borderBottom: isExpanded && hasExams ? '2px solid var(--border-color)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase' }}>
                            {subj.subject}
                          </h3>
                          <span style={{ 
                            backgroundColor: subj.examsCompleted > 0 ? 'var(--accent-green)' : '#e1e1e1',
                            color: '#1a1a1a',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {subj.examsCompleted} / {subj.totalExams} Exams Completed
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Subject Average</span>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>
                              {subj.examsCompleted > 0 ? `${subj.averagePercentage}%` : 'N/A'}
                            </div>
                          </div>
                          {hasExams && (
                            <div style={{ border: '2px solid var(--border-color)', borderRadius: '4px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subject Card Body (Exam List) */}
                      {isExpanded && (
                        <div style={{ padding: '24px' }}>
                          {!hasExams ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                              No exams have been configured or assigned to this subject yet.
                            </div>
                          ) : (
                            <div style={{ overflowX: 'auto', border: '2px solid var(--border-color)', borderRadius: '6px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', textAlign: 'left', fontSize: '0.9rem' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'var(--primary)', borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Exam Name</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', width: '20%' }}>Status</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', width: '20%' }}>Date Taken</th>
                                    <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', width: '20%' }}>Your Score</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subj.exams.map((exam) => {
                                    const isCompleted = exam.status === 'COMPLETED';
                                    const isTerminated = exam.status === 'TERMINATED';
                                    
                                    let badgeColor = '#f0f0f0';
                                    let badgeTextColor = '#555';
                                    let label: string = exam.status;
                                    
                                    if (isCompleted) {
                                      badgeColor = 'var(--accent-green)';
                                      badgeTextColor = '#1a1a1a';
                                      label = 'Completed';
                                    } else if (isTerminated) {
                                      badgeColor = '#ffe0e0';
                                      badgeTextColor = '#b22222';
                                      label = 'Terminated';
                                    } else if (exam.status === 'SCHEDULED') {
                                      badgeColor = '#dbeafe';
                                      badgeTextColor = '#1e40af';
                                      label = 'Scheduled';
                                    } else if (exam.status === 'EXPIRED') {
                                      badgeColor = '#fef3c7';
                                      badgeTextColor = '#92400e';
                                      label = 'Expired';
                                    } else if (exam.status === 'AVAILABLE') {
                                      badgeColor = '#e6fffa';
                                      badgeTextColor = '#006d77';
                                      label = 'Available';
                                    }

                                    return (
                                      <tr key={exam.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '14px 16px', fontWeight: 700 }}>{exam.title}</td>
                                        <td style={{ padding: '14px 16px' }}>
                                          <span style={{
                                            backgroundColor: badgeColor,
                                            color: badgeTextColor,
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            padding: '2px 8px',
                                            fontSize: '0.72rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            display: 'inline-block'
                                          }}>
                                            {label}
                                          </span>
                                        </td>
                                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                                          {exam.dateTaken ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <Calendar size={14} />
                                              {new Date(exam.dateTaken).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </div>
                                          ) : (
                                            '—'
                                          )}
                                        </td>
                                        <td style={{ padding: '14px 16px', fontWeight: 800 }}>
                                          {exam.score !== null ? (
                                            exam.graded === false ? (
                                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Grading</span>
                                            ) : (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1rem', color: 'var(--primary)' }}>{exam.score}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>/ {exam.totalPoints} pts</span>
                                                <span style={{
                                                  backgroundColor: 'var(--accent)',
                                                  borderRadius: '4px',
                                                  border: '1px solid var(--border-color)',
                                                  padding: '1px 5px',
                                                  fontSize: '0.72rem',
                                                  fontWeight: 800
                                                }}>
                                                  {Math.round((exam.score / exam.totalPoints) * 100)}%
                                                </span>
                                              </div>
                                            )
                                          ) : isTerminated ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)' }}>
                                              <AlertTriangle size={14} />
                                              <span>0 / {exam.totalPoints}</span>
                                            </div>
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>No attempt</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentScores;
