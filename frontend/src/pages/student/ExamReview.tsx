import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Award,
  Clock,
  Calendar,
  BookOpen,
  HelpCircle,
  TrendingUp,
  Lock,
  LogOut,
  Trophy,
} from 'lucide-react';
import ProfileAvatar from '../../components/ProfileAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OptionData {
  id: string;
  text: string;
}

interface QuestionReview {
  id: string;
  text: string;
  imageUrl?: string | null;
  difficulty?: string | null;
  points: number;
  options: OptionData[];
  correctOptionId: string;
  selectedOptionId: string | null;
}

interface ReviewPayload {
  examTitle: string;
  totalPoints: number;
  score: number;
  durationMinutes: number;
  dateSubmitted: string;
  questions: QuestionReview[];
}

// ─── Helper: Badge for difficulty ─────────────────────────────────────────────
const DifficultyBadge: React.FC<{ level?: string | null }> = ({ level }) => {
  if (!level) return null;
  const map: Record<string, { bg: string; text: string }> = {
    EASY:   { bg: '#d1fae5', text: '#065f46' },
    MEDIUM: { bg: '#fef3c7', text: '#78350f' },
    HARD:   { bg: '#fee2e2', text: '#991b1b' },
  };
  const style = map[level.toUpperCase()] ?? { bg: '#e5e7eb', text: '#374151' };
  return (
    <span style={{
      backgroundColor: style.bg,
      color: style.text,
      border: '1px solid var(--border-color)',
      borderRadius: '4px',
      padding: '2px 8px',
      fontSize: '0.7rem',
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    }}>
      {level}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ExamReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { logout } = useAuth();

  const [data, setData] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`http://localhost:5002/api/student/exams/${id}/review`, {
          credentials: 'include',
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          const err = await res.json();
          setError(err.message || 'Failed to load exam review.');
        }
      } catch {
        setError('Network error: Could not connect to API server.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = data ? (() => {
    let correct = 0, incorrect = 0, skipped = 0;
    data.questions.forEach(q => {
      if (!q.selectedOptionId) { skipped++; return; }
      if (q.selectedOptionId === q.correctOptionId) correct++;
      else incorrect++;
    });
    const pct = data.totalPoints > 0
      ? Math.round((data.score / data.totalPoints) * 100)
      : 0;
    return { correct, incorrect, skipped, pct };
  })() : null;

  // ── Score colour ──────────────────────────────────────────────────────────
  const scoreColor = (pct: number) => {
    if (pct >= 80) return 'var(--accent-green)';
    if (pct >= 50) return '#fef3c7';
    return '#fee2e2';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>

      {/* ─── Sidebar ───────────────────────────────────────────────────── */}
      <aside style={{
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '3px solid var(--border-color)',
        padding: '30px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          {/* Profile avatar with upload */}
          <ProfileAvatar />

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/student" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start', boxShadow: 'none',
              border: '2px solid var(--border-color)', backgroundColor: 'transparent',
              width: '100%', textDecoration: 'none', transform: 'none',
            }}>
              <BookOpen size={18} /> Exams List
            </Link>
            <Link to="/student/scores" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start', boxShadow: 'none',
              border: '2px solid var(--border-color)', backgroundColor: 'transparent',
              width: '100%', textDecoration: 'none', transform: 'none',
            }}>
              <Award size={18} /> My Scores
            </Link>
            <Link to="/student/leaderboard" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start', boxShadow: 'none',
              border: '2px solid var(--border-color)', backgroundColor: 'transparent',
              width: '100%', textDecoration: 'none', transform: 'none',
            }}>
              <Trophy size={18} /> Leaderboard
            </Link>
            <Link to="/student/change-password" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start', boxShadow: 'none',
              border: '2px solid var(--border-color)', backgroundColor: 'transparent',
              width: '100%', textDecoration: 'none', transform: 'none',
            }}>
              <Lock size={18} /> Change Password
            </Link>
          </nav>
        </div>

        <button onClick={logout} className="neo-btn neo-btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      {/* ─── Main Content ──────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        {/* Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '40px', paddingBottom: '20px',
          borderBottom: '3px solid var(--border-color)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <Link to="/student" style={{ textDecoration: 'none' }}>
                <button className="neo-btn neo-btn-secondary" style={{
                  padding: '6px 12px', boxShadow: 'none', transform: 'none',
                  border: '2px solid var(--border-color)',
                }}>
                  <ArrowLeft size={16} /> Back
                </button>
              </Link>
              <h1 className="header-title" style={{ margin: 0, fontSize: '2rem' }}>
                Exam Review
              </h1>
            </div>
            {data && (
              <p style={{ color: 'var(--text-muted)', marginTop: '4px', fontSize: '1rem', fontWeight: 700 }}>
                {data.examTitle}
              </p>
            )}
          </div>
        </header>

        {/* ── Error state ── */}
        {error && (
          <div className="neo-card" style={{ backgroundColor: 'var(--danger)', color: '#fff', fontWeight: 700, marginBottom: '30px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Loading state ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Loading Review…</h3>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && data && stats && (
          <div>
            {/* ── Summary Cards ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '40px',
            }}>
              {/* Score */}
              <div className="neo-card" style={{
                backgroundColor: scoreColor(stats.pct),
                display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px',
              }}>
                <div style={{
                  backgroundColor: '#fff', border: '2px solid var(--border-color)',
                  borderRadius: '4px', padding: '10px', display: 'flex', alignItems: 'center',
                }}>
                  <TrendingUp size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Final Score</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                    {data.score} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {data.totalPoints}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>{stats.pct}%</div>
                </div>
              </div>

              {/* Correct */}
              <div className="neo-card" style={{ backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px' }}>
                <div style={{ backgroundColor: '#fff', border: '2px solid var(--border-color)', borderRadius: '4px', padding: '10px', display: 'flex', alignItems: 'center' }}>
                  <CheckCircle size={22} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Correct</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{stats.correct}</div>
                </div>
              </div>

              {/* Incorrect */}
              <div className="neo-card" style={{ backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px' }}>
                <div style={{ backgroundColor: '#fff', border: '2px solid var(--border-color)', borderRadius: '4px', padding: '10px', display: 'flex', alignItems: 'center' }}>
                  <XCircle size={22} color="#dc2626" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Incorrect</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{stats.incorrect}</div>
                </div>
              </div>

              {/* Skipped */}
              <div className="neo-card" style={{ backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px' }}>
                <div style={{ backgroundColor: '#fff', border: '2px solid var(--border-color)', borderRadius: '4px', padding: '10px', display: 'flex', alignItems: 'center' }}>
                  <MinusCircle size={22} color="#6b7280" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Skipped</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{stats.skipped}</div>
                </div>
              </div>

              {/* Duration */}
              <div className="neo-card" style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px' }}>
                <div style={{ backgroundColor: 'var(--accent)', border: '2px solid var(--border-color)', borderRadius: '4px', padding: '10px', display: 'flex', alignItems: 'center' }}>
                  <Clock size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Duration</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{data.durationMinutes} min</div>
                </div>
              </div>

              {/* Date submitted */}
              <div className="neo-card" style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 24px' }}>
                <div style={{ backgroundColor: 'var(--secondary)', border: '2px solid var(--border-color)', borderRadius: '4px', padding: '10px', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Submitted On</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}>
                    {new Date(data.dateSubmitted).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Legend ── */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
              <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.4rem', margin: 0 }}>
                <HelpCircle size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Questions ({data.questions.length})
              </h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <div style={{ width: 14, height: 14, backgroundColor: '#d1fae5', border: '2px solid #059669', borderRadius: 3 }} /> Your Correct Answer
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <div style={{ width: 14, height: 14, backgroundColor: '#fee2e2', border: '2px solid #dc2626', borderRadius: 3 }} /> Your Wrong Answer
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <div style={{ width: 14, height: 14, backgroundColor: '#dbeafe', border: '2px solid #2563eb', borderRadius: 3 }} /> Correct Answer
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                  <div style={{ width: 14, height: 14, backgroundColor: '#f3f4f6', border: '2px solid var(--border-color)', borderRadius: 3 }} /> Other Option
                </div>
              </div>
            </div>

            {/* ── Question Cards ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {data.questions.map((q, idx) => {
                const isCorrect = q.selectedOptionId === q.correctOptionId;
                const isSkipped = !q.selectedOptionId;

                // Header color
                const headerBg = isSkipped
                  ? '#f3f4f6'
                  : isCorrect
                    ? '#d1fae5'
                    : '#fee2e2';
                const headerBorder = isSkipped ? '#9ca3af' : isCorrect ? '#059669' : '#dc2626';

                return (
                  <div
                    key={q.id}
                    className="neo-card"
                    style={{ padding: 0, overflow: 'hidden', backgroundColor: '#ffffff' }}
                  >
                    {/* Question header */}
                    <div style={{
                      backgroundColor: headerBg,
                      borderBottom: `3px solid ${headerBorder}`,
                      padding: '16px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                        <span style={{
                          backgroundColor: '#ffffff',
                          border: `2px solid ${headerBorder}`,
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          Q{idx + 1}
                        </span>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', lineHeight: '1.5' }}>
                          {q.text}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                        <DifficultyBadge level={q.difficulty} />
                        <span style={{
                          backgroundColor: '#ffffff',
                          border: '2px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}>
                          {q.points} {q.points === 1 ? 'pt' : 'pts'}
                        </span>
                        {isSkipped ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 800, color: '#6b7280' }}>
                            <MinusCircle size={14} /> Skipped
                          </span>
                        ) : isCorrect ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 800, color: '#059669' }}>
                            <CheckCircle size={14} /> Correct
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 800, color: '#dc2626' }}>
                            <XCircle size={14} /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Optional image */}
                    {q.imageUrl && (
                      <div style={{ padding: '12px 24px 0' }}>
                        <img
                          src={q.imageUrl}
                          alt="Question visual"
                          style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', border: '2px solid var(--border-color)', borderRadius: '6px' }}
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {q.options.map((opt) => {
                        const isSelected = opt.id === q.selectedOptionId;
                        const isCorrectOpt = opt.id === q.correctOptionId;

                        let optBg = '#f9f9f9';
                        let optBorder = 'var(--border-color)';
                        let optBorderWidth = '2px';
                        let icon: React.ReactNode = null;
                        let labelText = '';

                        if (isCorrectOpt && isSelected) {
                          // Student chose correctly
                          optBg = '#d1fae5';
                          optBorder = '#059669';
                          optBorderWidth = '3px';
                          icon = <CheckCircle size={18} color="#059669" />;
                          labelText = 'Your answer ✓';
                        } else if (isSelected && !isCorrectOpt) {
                          // Student chose wrong
                          optBg = '#fee2e2';
                          optBorder = '#dc2626';
                          optBorderWidth = '3px';
                          icon = <XCircle size={18} color="#dc2626" />;
                          labelText = 'Your answer ✗';
                        } else if (isCorrectOpt) {
                          // Correct answer (student didn't pick it)
                          optBg = '#dbeafe';
                          optBorder = '#2563eb';
                          optBorderWidth = '3px';
                          icon = <CheckCircle size={18} color="#2563eb" />;
                          labelText = 'Correct answer';
                        }

                        return (
                          <div
                            key={opt.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '12px 16px',
                              backgroundColor: optBg,
                              border: `${optBorderWidth} solid ${optBorder}`,
                              borderRadius: '6px',
                              transition: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              {icon ? icon : (
                                <div style={{ width: 18, height: 18, border: '2px solid var(--border-color)', borderRadius: '50%', flexShrink: 0 }} />
                              )}
                              <span style={{ fontWeight: (isCorrectOpt || isSelected) ? 800 : 500, fontSize: '0.95rem' }}>
                                {opt.text}
                              </span>
                            </div>
                            {labelText && (
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                color: isSelected && !isCorrectOpt ? '#dc2626' : isCorrectOpt && isSelected ? '#059669' : '#2563eb',
                                whiteSpace: 'nowrap',
                                border: `1px solid currentColor`,
                                borderRadius: '4px',
                                padding: '2px 6px',
                              }}>
                                {labelText}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Bottom CTA ── */}
            <div style={{ marginTop: '48px', textAlign: 'center' }}>
              <Link to="/student" style={{ textDecoration: 'none' }}>
                <button className="neo-btn" style={{ padding: '14px 40px', fontSize: '1rem' }}>
                  <ArrowLeft size={18} /> Back to Dashboard
                </button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamReview;
