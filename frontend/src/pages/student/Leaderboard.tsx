import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileAvatar from '../../components/ProfileAvatar';
import { apiFetch } from '../../utils/api';
import {
  BookOpen, Award, LogOut, RefreshCw, Lock,
  Trophy, TrendingUp, CheckSquare, BarChart2, Crown,
  Info, Users, ChevronDown, ChevronUp, Target, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubjectScore {
  subject: string;
  earned: number;
  possible: number;
  pct: number | null;
}

interface RankingBreakdown {
  avgPctContribution: number;
  completionContribution: number;
  consistencyContribution: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  profilePic: string | null;
  examsCompleted: number;
  totalExams: number;
  totalEarned: number;
  totalPossible: number;
  avgPct: number;
  completionRate: number;
  leaderboardScore: number;
  inactive: boolean;
  rankingBreakdown: RankingBreakdown;
  subjectScores: SubjectScore[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEFAULT_PIC = '/profilePic.png';

const scoreColor = (score: number) => {
  if (score >= 75) return '#059669';
  if (score >= 50) return '#d97706';
  if (score >= 25) return '#ea580c';
  return '#dc2626';
};

const pctColor = (pct: number) => {
  if (pct >= 80) return '#059669';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
};

// Check if two entries have the same leaderboard score (tie group)
const isTied = (a: LeaderboardEntry, b: LeaderboardEntry) =>
  a.leaderboardScore === b.leaderboardScore &&
  a.examsCompleted === b.examsCompleted &&
  a.totalEarned === b.totalEarned;

// ─── Subject mini-bar ─────────────────────────────────────────────────────────
const SubjectBar: React.FC<{ label: string; pct: number | null }> = ({ label, pct }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: 3 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: pct !== null ? pctColor(pct) : '#c4c4c4', fontStyle: pct === null ? 'italic' : 'normal' }}>
        {pct !== null ? `${pct}%` : 'Not taken'}
      </span>
    </div>
    <div style={{
      height: 6,
      backgroundColor: '#e5e7eb',
      borderRadius: 99,
      overflow: 'hidden',
      border: pct === null ? '1px dashed #c4c4c4' : '1px solid var(--border-color)',
    }}>
      {pct !== null && (
        <div style={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: pctColor(pct),
          borderRadius: 99,
          transition: 'width 0.6s ease',
        }} />
      )}
    </div>
  </div>
);

// ─── Score breakdown tooltip ──────────────────────────────────────────────────
const ScoreBreakdown: React.FC<{ breakdown: RankingBreakdown; score: number }> = ({ breakdown, score }) => (
  <div style={{
    backgroundColor: '#1a1a1a',
    border: '2px solid var(--border-color)',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#fff',
    minWidth: 200,
  }}>
    <div style={{ fontWeight: 900, fontSize: '0.8rem', marginBottom: 8, borderBottom: '1px solid #333', paddingBottom: 6 }}>
      Score Breakdown — {score} pts
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#9ca3af' }}>55% × Avg Score</span>
        <span style={{ color: '#34d399' }}>+{breakdown.avgPctContribution}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#9ca3af' }}>30% × Completion</span>
        <span style={{ color: '#60a5fa' }}>+{breakdown.completionContribution}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: '#9ca3af' }}>15% × Consistency</span>
        <span style={{ color: '#f59e0b' }}>+{breakdown.consistencyContribution}</span>
      </div>
    </div>
  </div>
);

// ─── Podium column ────────────────────────────────────────────────────────────
const PodiumColumn: React.FC<{
  entry: LeaderboardEntry;
  rank: number;
  isSelf: boolean;
  tiedWithNext?: boolean;
}> = ({ entry, rank, isSelf, tiedWithNext }) => {
  const [hovered, setHovered] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const config = ({
    1: { pedestalHeight: 140, pedestalBg: 'var(--primary)', badgeBg: '#ffd600', avatarSize: 72, order: 2 },
    2: { pedestalHeight: 100, pedestalBg: 'var(--secondary)', badgeBg: '#a6e3e9', avatarSize: 64, order: 1 },
    3: { pedestalHeight: 70,  pedestalBg: 'var(--accent)',    badgeBg: '#d3c5f5', avatarSize: 56, order: 3 },
  } as Record<number, { pedestalHeight: number; pedestalBg: string; badgeBg: string; avatarSize: number; order: number }>)[rank] ?? {
    pedestalHeight: 70, pedestalBg: '#e5e7eb', badgeBg: '#e5e7eb', avatarSize: 56, order: 3,
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowBreakdown(false); }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        width: '210px', order: config.order,
        transform: hovered ? 'translateY(-12px)' : 'none',
        transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        cursor: 'default',
      }}
    >
      {/* Floating User Card */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '3px solid var(--border-color)',
        borderRadius: '8px 8px 0 0',
        borderBottom: 'none',
        padding: '24px 16px 12px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        position: 'relative',
        boxShadow: hovered ? '6px 0 0 var(--border-color), -6px 0 0 var(--border-color)' : 'none',
        transition: 'all 0.25s ease',
      }}>
        {/* Crown */}
        {rank === 1 && (
          <div style={{ position: 'absolute', top: -24, left: '50%', transform: 'translateX(-50%) rotate(-12deg)', filter: 'drop-shadow(3px 3px 0px var(--border-color))', zIndex: 10 }}>
            <Crown size={36} fill="#ffd600" color="var(--border-color)" strokeWidth={2.5} />
          </div>
        )}

        {/* You Badge */}
        {isSelf && (
          <span style={{
            position: 'absolute', top: -12, right: 8,
            backgroundColor: 'var(--primary)', border: '2px solid var(--border-color)',
            borderRadius: '4px', padding: '1px 6px',
            fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
            boxShadow: '1px 1px 0 var(--border-color)',
          }}>YOU</span>
        )}

        {/* Tied badge */}
        {tiedWithNext && (
          <span style={{
            position: 'absolute', top: -12, left: 8,
            backgroundColor: '#f3f4f6', border: '2px solid var(--border-color)',
            borderRadius: '4px', padding: '1px 6px',
            fontSize: '0.6rem', fontWeight: 900, color: '#6b7280',
          }}>= TIED</span>
        )}

        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <img
            src={entry.profilePic || DEFAULT_PIC}
            alt={entry.name}
            onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PIC; }}
            style={{
              width: config.avatarSize, height: config.avatarSize,
              borderRadius: '50%', objectFit: 'cover',
              border: '3px solid var(--border-color)',
              boxShadow: '2px 2px 0 var(--border-color)', backgroundColor: '#fff',
            }}
          />
          <div style={{
            position: 'absolute', bottom: -6, right: -6,
            width: 24, height: 24, borderRadius: '50%',
            backgroundColor: config.badgeBg, border: '2px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 900,
          }}>{rank}</div>
        </div>

        {/* Name */}
        <div style={{ fontWeight: 900, fontSize: '0.95rem', textAlign: 'center', lineHeight: 1.2, marginTop: 4, wordBreak: 'break-word', width: '100%' }}>
          {entry.name}
        </div>

        {/* Composite Score */}
        <div
          onClick={() => setShowBreakdown(s => !s)}
          style={{
            backgroundColor: '#1a1a1a', color: '#ffffff',
            padding: '6px 12px', borderRadius: '4px',
            border: '2px solid var(--border-color)', fontWeight: 900, fontSize: '1.2rem',
            boxShadow: '2px 2px 0 var(--border-color)', marginTop: 2,
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          }}
          title="Click to see score breakdown"
        >
          <span style={{ color: scoreColor(entry.leaderboardScore) }}>{entry.leaderboardScore}</span>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700 }}>pts</span>
          <Info size={12} color="#9ca3af" />
        </div>

        {showBreakdown && (
          <div style={{ position: 'absolute', top: '100%', zIndex: 100, marginTop: 4 }}>
            <ScoreBreakdown breakdown={entry.rankingBreakdown} score={entry.leaderboardScore} />
          </div>
        )}

        {/* Completion pill */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{
            fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.02em',
            backgroundColor: '#f3f4f6', border: '1px solid var(--border-color)',
            borderRadius: 4, padding: '2px 8px',
          }}>
            {entry.examsCompleted}/{entry.totalExams} exams
          </span>
          <span style={{
            fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
            backgroundColor: '#f3f4f6', border: '1px solid var(--border-color)',
            borderRadius: 4, padding: '2px 8px',
            color: pctColor(entry.avgPct),
          }}>
            avg {entry.avgPct}%
          </span>
        </div>
      </div>

      {/* Pedestal */}
      <div style={{
        height: `${config.pedestalHeight}px`,
        backgroundColor: config.pedestalBg,
        border: '3px solid var(--border-color)',
        borderRadius: '0 0 8px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        boxShadow: hovered ? '8px 8px 0px 0px var(--border-color)' : '4px 4px 0px 0px var(--border-color)',
        transition: 'all 0.25s ease',
        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.02) 75%, transparent 75%, transparent)',
        backgroundSize: '16px 16px',
      }}>
        <div style={{
          fontSize: rank === 1 ? '4.5rem' : rank === 2 ? '3.5rem' : '2.8rem',
          fontWeight: 950, color: '#1a1a1a', lineHeight: 1, fontStyle: 'italic', letterSpacing: '-2px',
          textShadow: '2px 2px 0px #fff, 4px 4px 0px var(--border-color)',
          WebkitTextStroke: '1.5px var(--border-color)',
        }}>{rank}</div>
        <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: -6, color: '#1a1a1a', textShadow: '1px 1px 0px #fff' }}>
          {rank === 1 ? 'ST PLACE' : rank === 2 ? 'ND PLACE' : 'RD PLACE'}
        </div>
      </div>
    </div>
  );
};

// ─── Ranking Criteria Panel ───────────────────────────────────────────────────
const RankingCriteriaPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '3px solid var(--border-color)',
      borderRadius: 8,
      marginBottom: 32,
      overflow: 'hidden',
      boxShadow: '3px 3px 0 var(--border-color)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 900, fontSize: '0.9rem',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          borderBottom: open ? '2px solid var(--border-color)' : 'none',
        }}
      >
        <Info size={16} />
        How Rankings Work
        <span style={{ marginLeft: 'auto' }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {/* Formula */}
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target size={14} /> Composite Score Formula
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: '55% × Avg Exam Score', color: '#059669', desc: 'Your average % across completed exams' },
                { label: '30% × Completion Rate', color: '#2563eb', desc: 'Exams done ÷ total exams in system' },
                { label: '15% × Consistency Bonus', color: '#d97706', desc: 'Penalises high variance between subjects' },
              ].map(({ label, color, desc }) => (
                <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tie-breakers */}
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} /> Tie-Breakers (in order)
            </div>
            <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                'Composite Score (higher = better)',
                'Exams Completed (more = better)',
                'Total Points Earned (more = better)',
                'Earliest Last Submission (faster = better)',
                'Name (alphabetical)',
              ].map((rule, i) => (
                <li key={i} style={{ fontSize: '0.78rem', fontWeight: 700, color: i === 0 ? '#1a1a1a' : 'var(--text-muted)' }}>
                  {rule}
                </li>
              ))}
            </ol>
          </div>

          {/* What it means */}
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} /> How to Climb
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                '✅ Complete more exams — completion adds 30% to your score',
                '🎯 Score consistently across subjects — the consistency bonus rewards it',
                '⚡ Scoring 100% in one exam is never enough — take all of them',
              ].map(tip => (
                <div key={tip} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Ranking Row Component ──────────────────────────────────────────────────────
const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  rank: number;
  isSelf: boolean;
  tieSize: number;
}> = ({ entry, rank, isSelf, tieSize }) => {
  const [expanded, setExpanded] = useState(false);
  const rankStyle = ({
    1: { bg: '#fff7d6', border: '#f5c518' },
    2: { bg: '#f0f0f0', border: '#9ca3af' },
    3: { bg: '#fff0e6', border: '#f97316' },
  } as Record<number, { bg: string; border: string }>)[rank];
  const isTiedRow = tieSize > 1;

  return (
    <div
      className="neo-card"
      style={{
        backgroundColor: isSelf ? '#fffbeb' : '#ffffff',
        border: isSelf ? '3px solid var(--primary)' : '3px solid var(--border-color)',
        padding: 0, overflow: 'hidden',
      }}
    >
      {/* Row header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px',
        borderBottom: '2px solid var(--border-color)',
        backgroundColor: rankStyle ? rankStyle.bg : isSelf ? '#fffde7' : '#fafafa',
        flexWrap: 'wrap',
      }}>
        {/* Rank badge */}
        <div style={{
          minWidth: 48, height: 48, borderRadius: 4,
          backgroundColor: rankStyle ? rankStyle.border : '#e5e7eb',
          border: '2px solid var(--border-color)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: '0.95rem', color: rank <= 3 ? '#fff' : '#1a1a1a',
          flexShrink: 0, lineHeight: 1,
        }}>
          <span>{isTiedRow ? '=' : ''}{`#${rank}`}</span>
          {isTiedRow && <span style={{ fontSize: '0.55rem', fontWeight: 700, opacity: 0.8, marginTop: 1 }}>TIED</span>}
        </div>

        {/* Avatar */}
        <img
          src={entry.profilePic || DEFAULT_PIC}
          alt={entry.name}
          onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PIC; }}
          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)', flexShrink: 0 }}
        />

        {/* Name + quick stats */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {entry.name}
            {isSelf && (
              <span style={{ backgroundColor: 'var(--primary)', border: '1px solid var(--border-color)', borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 900 }}>
                YOU
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <CheckSquare size={12} />
              {entry.examsCompleted}/{entry.totalExams} exams
              {/* Inline completion bar */}
              <span style={{
                display: 'inline-block', width: 40, height: 5,
                backgroundColor: '#e5e7eb', borderRadius: 99,
                marginLeft: 4, overflow: 'hidden', border: '1px solid var(--border-color)',
                verticalAlign: 'middle',
              }}>
                <span style={{
                  display: 'block', height: '100%', borderRadius: 99,
                  width: `${entry.completionRate}%`,
                  backgroundColor: entry.completionRate >= 75 ? '#059669' : entry.completionRate >= 40 ? '#d97706' : '#dc2626',
                }} />
              </span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <TrendingUp size={12} />
              {entry.totalEarned} / {entry.totalPossible} pts
            </span>
          </div>
        </div>

        {/* Metric chips */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Avg score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: pctColor(entry.avgPct) }}>{entry.avgPct}%</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Avg Score</div>
          </div>

          <div style={{ width: 1, height: 36, backgroundColor: 'var(--border-color)' }} />

          {/* Composite score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: scoreColor(entry.leaderboardScore) }}>{entry.leaderboardScore}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Score</div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-muted)', flexShrink: 0 }}
          title="Show subject breakdown"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expandable: Subject mini-bars + score breakdown */}
      {expanded && (
        <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 32px' }}>
          {/* Subject bars */}
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px 24px' }}>
              {entry.subjectScores.map(s => (
                <SubjectBar key={s.subject} label={s.subject} pct={s.pct} />
              ))}
            </div>
          </div>
          {/* Score breakdown */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
            {[
              { label: 'Avg Score (55%)', val: `+${entry.rankingBreakdown.avgPctContribution}`, color: '#059669' },
              { label: 'Completion (30%)', val: `+${entry.rankingBreakdown.completionContribution}`, color: '#2563eb' },
              { label: 'Consistency (15%)', val: `+${entry.rankingBreakdown.consistencyContribution}`, color: '#d97706' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                border: '1px solid var(--border-color)', borderRadius: 4,
                padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800,
                backgroundColor: '#f9f9f9',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                <span style={{ color }}>{val} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Leaderboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/student/leaderboard', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard);
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to load leaderboard.');
      }
    } catch {
      setError('Network error: Could not connect to API server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaderboard(); }, []);

  const active   = entries.filter(e => !e.inactive);
  const inactive = entries.filter(e => e.inactive);
  const myEntry  = entries.find(e => e.id === user?.id);
  const myRank   = active.findIndex(e => e.id === user?.id) + 1;
  const top3     = active.slice(0, 3);

  // Build tie-group info: for each entry, find size of its tie group
  const tieGroupSize = (entry: LeaderboardEntry): number =>
    active.filter(e => isTied(e, entry)).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '260px', backgroundColor: '#ffffff',
        borderRight: '3px solid var(--border-color)',
        padding: '30px 20px', display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div>
          <ProfileAvatar />
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { to: '/student',              icon: <BookOpen size={18} />,  label: 'Exams List' },
              { to: '/student/scores',       icon: <Award size={18} />,     label: 'My Scores' },
              { to: '/student/leaderboard',  icon: <Trophy size={18} />,    label: 'Leaderboard', active: true },
              { to: '/student/change-password', icon: <Lock size={18} />,   label: 'Change Password' },
            ].map(({ to, icon, label, active: isActive }) => (
              <Link
                key={to}
                to={to}
                className="neo-btn"
                style={{
                  justifyContent: 'flex-start',
                  boxShadow: isActive ? 'var(--box-shadow-sm)' : 'none',
                  border: '2px solid var(--border-color)',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  width: '100%', textDecoration: 'none', transform: 'none',
                }}
              >
                {icon} {label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={logout} className="neo-btn neo-btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOut size={18} /> Sign Out
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

        {/* Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '32px', paddingBottom: '20px', borderBottom: '3px solid var(--border-color)',
        }}>
          <div>
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Leaderboard</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
              Ranked by composite score — quality, breadth, and consistency all count
            </p>
          </div>
          <button onClick={fetchLeaderboard} className="neo-btn neo-btn-accent" style={{ padding: '8px 12px' }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="neo-card" style={{ backgroundColor: 'var(--danger)', color: '#fff', fontWeight: 700, marginBottom: 30 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Calculating Rankings…</h3>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="neo-card" style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff' }}>
            <Trophy size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>No students yet</h3>
            <p style={{ color: 'var(--text-muted)' }}>Complete some exams to appear on the leaderboard.</p>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <>
            {/* ── Your Rank Banner ── */}
            {myEntry && !myEntry.inactive && myRank > 0 && (
              <div className="neo-card" style={{
                backgroundColor: 'var(--primary)', marginBottom: 28,
                padding: '16px 24px', flexWrap: 'wrap',
                display: 'flex', alignItems: 'flex-start', gap: 20,
              }}>
                <Trophy size={28} style={{ flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase' }}>Your Current Rank</div>
                  <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 2 }}>
                    You are ranked <strong>#{myRank}</strong> out of <strong>{active.length}</strong> active students
                    {tieGroupSize(myEntry) > 1 && (
                      <span style={{ marginLeft: 6, fontSize: '0.78rem', color: '#6b7280' }}>
                        (tied with {tieGroupSize(myEntry) - 1} other{tieGroupSize(myEntry) > 2 ? 's' : ''})
                      </span>
                    )}
                  </div>
                  {/* Score breakdown inline */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Avg Score', val: `${myEntry.avgPct}%`, color: '#059669' },
                      { label: 'Completion', val: `${myEntry.examsCompleted}/${myEntry.totalExams} exams`, color: '#2563eb' },
                      { label: 'Total Points', val: `${myEntry.totalEarned} pts`, color: '#d97706' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{
                        backgroundColor: '#fff', border: '1px solid var(--border-color)',
                        borderRadius: 4, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 800,
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                        <span style={{ color }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#1a1a1a', color: '#fff',
                  borderRadius: 4, border: '2px solid var(--border-color)',
                  padding: '8px 20px', fontWeight: 900, fontSize: '1.5rem', flexShrink: 0,
                }}>
                  #{myRank}
                </div>
              </div>
            )}

            {myEntry?.inactive && (
              <div className="neo-card" style={{
                backgroundColor: '#f3f4f6', marginBottom: 28, padding: '16px 24px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <Info size={20} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>You haven't taken any exams yet</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Complete an exam to earn a rank. Students who take more exams climb faster.
                  </div>
                </div>
              </div>
            )}

            {/* ── Ranking Criteria Panel ── */}
            <RankingCriteriaPanel />

            {/* ── Podium ── */}
            {top3.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.3rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={20} /> Top Performers
                </h2>
                <div style={{
                  display: 'flex', gap: '24px', alignItems: 'flex-end', justifyContent: 'center',
                  flexWrap: 'wrap', padding: '40px 24px',
                  backgroundColor: '#ffffff', border: '3px solid var(--border-color)', borderRadius: '8px',
                  boxShadow: 'var(--box-shadow)',
                  backgroundImage: 'radial-gradient(var(--border-color) 1.5px, transparent 1.5px)',
                  backgroundSize: '16px 16px',
                }}>
                  {top3.map((e, i) => (
                    <PodiumColumn
                      key={e.id}
                      entry={e}
                      rank={i + 1}
                      isSelf={e.id === user?.id}
                      tiedWithNext={i < top3.length - 1 && isTied(e, top3[i + 1])}
                    />
                  ))}
                </div>
                {/* Tie notice */}
                {top3.length > 1 && isTied(top3[0], top3[1]) && (
                  <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 10, fontWeight: 700 }}>
                    ⚡ Top students are tied — ranked by exams completed, then total points earned
                  </p>
                )}
              </section>
            )}

            {/* ── Full Rankings Table ── */}
            <section>
              <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.2rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={20} /> Full Rankings
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: 8, textTransform: 'none' }}>
                  {active.length} active student{active.length !== 1 ? 's' : ''}
                </span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {active.map((entry, idx) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    rank={idx + 1}
                    isSelf={entry.id === user?.id}
                    tieSize={tieGroupSize(entry)}
                  />
                ))}
              </div>
            </section>

            {/* ── Inactive Students ── */}
            {inactive.length > 0 && (
              <section style={{ marginTop: 40 }}>
                <button
                  onClick={() => setShowInactive(s => !s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: '2px solid var(--border-color)',
                    borderRadius: 6, padding: '10px 16px', cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 900, fontSize: '0.85rem',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: 'var(--text-muted)', marginBottom: 14,
                  }}
                >
                  <Users size={16} />
                  Not Yet Active ({inactive.length})
                  {showInactive ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showInactive && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {inactive.map(entry => {
                      const isSelf = entry.id === user?.id;
                      return (
                        <div
                          key={entry.id}
                          className="neo-card"
                          style={{
                            backgroundColor: isSelf ? '#fffbeb' : '#f9f9f9',
                            border: `2px dashed ${isSelf ? 'var(--primary)' : 'var(--border-color)'}`,
                            padding: '12px 20px',
                            display: 'flex', alignItems: 'center', gap: 14, opacity: 0.75,
                          }}
                        >
                          <img
                            src={entry.profilePic || DEFAULT_PIC}
                            alt={entry.name}
                            onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PIC; }}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {entry.name}
                            {isSelf && <span style={{ marginLeft: 8, fontSize: '0.65rem', fontWeight: 900, backgroundColor: 'var(--primary)', border: '1px solid var(--border-color)', borderRadius: 4, padding: '1px 6px' }}>YOU</span>}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, fontStyle: 'italic' }}>
                            No exams taken — unranked
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
