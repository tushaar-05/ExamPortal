import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import {
  Trophy,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText,
  MessageSquare,
  BarChart2,
  ShieldAlert
} from 'lucide-react';

interface SubjectBreakdown {
  subjectId: string;
  subjectName: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
}

interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string | null;
}

interface QuestionAnalysis {
  questionId: string;
  subjectId: string;
  subjectName: string;
  questionText: string;
  imageUrl?: string | null;
  difficulty: string;
  type: 'MCQ' | 'SUBJECTIVE';
  points: number;
  pointsEarned: number;
  status: 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'SKIPPED';
  options: QuestionOption[];
  correctOptionId?: string | null;
  correctAnswerText?: string | null;
  studentOptionId?: string | null;
  studentSubjectiveAnswer?: string | null;
  feedback?: string | null;
}

interface ResultData {
  examTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  rank: number;
  totalCandidates: number;
  overallFeedback?: string | null;
  subjectBreakdown: SubjectBreakdown[];
  questionAnalysis: QuestionAnalysis[];
}

export const FinalExamResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('ALL');

  const fetchResult = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/student/final-exam/${id}/result`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
      } else {
        setError(data.message || 'Failed to load result analysis.');
      }
    } catch {
      setError('Network error connecting to API.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <h3 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Loading Exam Result Analysis...</h3>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ padding: '60px 20px', minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="neo-card" style={{ maxWidth: '540px', background: '#fff', padding: '40px', textAlign: 'center' }}>
          <ShieldAlert size={56} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Result Not Available</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error || 'Could not load exam result.'}</p>
          <Link to="/student" className="neo-btn" style={{ padding: '10px 24px', textDecoration: 'none', display: 'inline-flex' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const filteredQuestions = activeSubjectTab === 'ALL'
    ? result.questionAnalysis
    : result.questionAnalysis.filter(q => q.subjectId === activeSubjectTab);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', padding: '40px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Back header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <button onClick={() => navigate('/student')} className="neo-btn neo-btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <span style={{ backgroundColor: 'var(--primary)', color: '#1a1a1a', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase' }}>
              Final Exam Performance Analysis
            </span>
            <h1 className="header-title" style={{ margin: '4px 0 0', fontSize: '2.2rem' }}>{result.examTitle}</h1>
          </div>
        </div>

        {/* ── OVERALL PERFORMANCE SUMMARY ───────────────────────────────────── */}
        <div className="neo-card" style={{ background: '#1a1a1a', color: '#fff', padding: '32px', marginBottom: '32px', borderLeft: '10px solid var(--primary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', alignItems: 'center' }}>

            {/* Total Marks */}
            <div style={{ background: '#262626', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Marks Obtained</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                {result.score} <span style={{ fontSize: '1.2rem', color: '#9ca3af', fontWeight: 500 }}>/ {result.totalPoints}</span>
              </div>
            </div>

            {/* Percentage */}
            <div style={{ background: '#262626', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Percentage Score</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {result.percentage}%
              </div>
            </div>

            {/* Pass/Fail Status */}
            <div style={{ background: '#262626', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Final Result Status</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: result.passed ? '#dcfce7' : '#fee2e2',
                color: result.passed ? '#166534' : '#991b1b',
                padding: '6px 16px', borderRadius: '20px', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', marginTop: '4px'
              }}>
                {result.passed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                {result.passed ? 'PASSED' : 'FAILED'}
              </div>
            </div>

            {/* Rank Badge */}
            <div style={{ background: '#262626', padding: '20px', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '4px' }}>Final Exam Rank</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1 }}>
                <Trophy size={24} /> #{result.rank} <span style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: 500 }}>of {result.totalCandidates} candidates</span>
              </div>
            </div>

          </div>

          {/* Admin Overall Feedback */}
          {result.overallFeedback && (
            <div style={{ marginTop: '24px', background: '#262626', border: '1.5px solid var(--primary)', borderRadius: '8px', padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} /> Evaluator Overall Feedback
              </div>
              <p style={{ margin: 0, color: '#e5e7eb', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {result.overallFeedback}
              </p>
            </div>
          )}
        </div>

        {/* ── SUBJECT-WISE PERFORMANCE BREAKDOWN ────────────────────────────── */}
        <div className="neo-card" style={{ background: '#fff', padding: '28px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={20} /> Subject-Wise Marks Breakdown
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--primary)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Subject Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Marks Obtained</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Maximum Marks</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Percentage</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', textAlign: 'center' }}>Subject Status</th>
                </tr>
              </thead>
              <tbody>
                {result.subjectBreakdown.map(subj => (
                  <tr key={subj.subjectId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800 }}>{subj.subjectName}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 900 }}>{subj.score}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{subj.totalPoints}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 900 }}>{subj.percentage}%</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        background: subj.passed ? '#dcfce7' : '#fee2e2',
                        color: subj.passed ? '#166534' : '#991b1b',
                        padding: '3px 10px', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase'
                      }}>
                        {subj.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── QUESTION-WISE DETAILED ANALYSIS ────────────────────────────────── */}
        <div className="neo-card" style={{ background: '#fff', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} /> Question-Wise Analysis
            </h3>

            {/* Subject Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveSubjectTab('ALL')}
                className="neo-btn"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  backgroundColor: activeSubjectTab === 'ALL' ? 'var(--primary)' : '#f3f4f6',
                  color: '#1a1a1a',
                  boxShadow: 'none'
                }}
              >
                All Subjects
              </button>
              {result.subjectBreakdown.map(subj => (
                <button
                  key={subj.subjectId}
                  onClick={() => setActiveSubjectTab(subj.subjectId)}
                  className="neo-btn"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    backgroundColor: activeSubjectTab === subj.subjectId ? 'var(--primary)' : '#f3f4f6',
                    color: '#1a1a1a',
                    boxShadow: 'none'
                  }}
                >
                  {subj.subjectName}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredQuestions.map((q, idx) => {
              const isMcq = q.type === 'MCQ';
              const statusBadgeStyle = {
                background:
                  q.status === 'CORRECT' ? '#dcfce7' :
                  q.status === 'PARTIAL' ? '#fef3c7' :
                  q.status === 'SKIPPED' ? '#f1f5f9' :
                  '#fee2e2',
                color:
                  q.status === 'CORRECT' ? '#166534' :
                  q.status === 'PARTIAL' ? '#92400e' :
                  q.status === 'SKIPPED' ? '#64748b' :
                  '#991b1b',
                border: `1.5px solid ${
                  q.status === 'CORRECT' ? '#166534' :
                  q.status === 'PARTIAL' ? '#92400e' :
                  q.status === 'SKIPPED' ? '#94a3b8' :
                  '#ef4444'
                }`,
                padding: '4px 12px',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '0.75rem',
                textTransform: 'uppercase' as const,
              };

              // Left border color for the card
              const cardBorderLeft =
                q.status === 'CORRECT' ? '4px solid #22c55e' :
                q.status === 'PARTIAL' ? '4px solid #f59e0b' :
                q.status === 'SKIPPED' ? '4px solid #94a3b8' :
                '4px solid #ef4444';

              return (
                <div key={q.questionId} style={{ border: '2px solid var(--border-color)', borderLeft: cardBorderLeft, borderRadius: '8px', padding: '24px', background: q.status === 'SKIPPED' ? '#f8fafc' : '#fafafa' }}>
                  
                  {/* Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Q{idx + 1} · {q.subjectName}
                      </span>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        {q.type}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={statusBadgeStyle}>
                        {q.status === 'CORRECT' ? '✓ Correct' :
                         q.status === 'PARTIAL' ? '⚠ Partial' :
                         q.status === 'SKIPPED' ? '— Skipped' :
                         '✗ Incorrect'}
                      </span>
                      <span style={{ fontWeight: 900, fontSize: '0.9rem' }}>
                        {q.pointsEarned} / {q.points} Points
                      </span>
                    </div>
                  </div>

                  {/* Question Statement */}
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 14px', color: '#111827', lineHeight: 1.5 }}>
                    {q.questionText}
                  </h4>

                  {q.imageUrl && (
                    <img src={q.imageUrl} alt="Question diagram" style={{ maxHeight: '200px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #ccc' }} />
                  )}

                  {/* MCQ Options Display */}
                  {isMcq ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        const isStudentPick = opt.id === q.studentOptionId;

                        let optionBg = '#ffffff';
                        let optionBorder = '#e5e7eb';

                        if (isCorrect) { optionBg = '#dcfce7'; optionBorder = '#166534'; }
                        else if (isStudentPick) { optionBg = '#fee2e2'; optionBorder = '#ef4444'; }

                        return (
                          <div
                            key={opt.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              border: `1.5px solid ${optionBorder}`,
                              backgroundColor: optionBg,
                              fontWeight: isCorrect || isStudentPick ? 800 : 500,
                              fontSize: '0.9rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 900 }}>{String.fromCharCode(65 + optIdx)}.</span>
                              <span>{opt.text}</span>
                              {opt.imageUrl && <img src={opt.imageUrl} alt="Option" style={{ height: '32px', borderRadius: '4px' }} />}
                            </div>

                            <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                              {isCorrect && <span style={{ color: '#166534' }}>✓ Correct Answer</span>}
                              {isStudentPick && !isCorrect && <span style={{ color: '#991b1b' }}>✗ Your Choice</span>}
                              {isStudentPick && isCorrect && <span style={{ color: '#166534' }}> (Your Choice)</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Subjective Answer Display */
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>Your Response:</div>
                      <div style={{ background: '#fff', border: '1.5px solid #d1d5db', padding: '14px', borderRadius: '6px', fontSize: '0.92rem', whiteSpace: 'pre-line', marginBottom: '10px' }}>
                        {q.studentSubjectiveAnswer || <span style={{ color: '#991b1b', fontStyle: 'italic' }}>No answer provided.</span>}
                      </div>

                      {q.correctAnswerText && (
                        <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                          💡 Expected Answer / Keywords: {q.correctAnswerText}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Individual Question Feedback */}
                  {q.feedback && (
                    <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: '6px', padding: '10px 14px', fontSize: '0.85rem', color: '#92400e', fontWeight: 700 }}>
                      💬 Teacher Feedback: {q.feedback}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinalExamResult;
