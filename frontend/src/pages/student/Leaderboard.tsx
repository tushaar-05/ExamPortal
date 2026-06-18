import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ProfileAvatar from '../../components/ProfileAvatar';
import { apiFetch } from '../../utils/api';
import {
  BookOpen, Award, LogOut, RefreshCw, Lock,
  Trophy, TrendingUp, CheckSquare, BarChart2, Crown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SubjectScore {
  subject: string;
  earned: number;
  possible: number;
  pct: number | null;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  profilePic: string | null;
  examsCompleted: number;
  totalEarned: number;
  totalPossible: number;
  overallPct: number;
  subjectScores: SubjectScore[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEFAULT_PIC = '/profilePic.png';

const RANK_STYLES: Record<number, { bg: string; border: string; label: string }> = {
  1: { bg: '#fff7d6', border: '#f5c518', label: '1st' },
  2: { bg: '#f0f0f0', border: '#9ca3af', label: '2nd' },
  3: { bg: '#fff0e6', border: '#f97316', label: '3rd' },
};

const pctColor = (pct: number) => {
  if (pct >= 80) return '#059669';
  if (pct >= 50) return '#d97706';
  return '#dc2626';
};

const SubjectBar: React.FC<{ label: string; pct: number | null }> = ({ label, pct }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: 3 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: pct !== null ? pctColor(pct) : '#9ca3af' }}>
        {pct !== null ? `${pct}%` : '—'}
      </span>
    </div>
    <div style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <div style={{
        height: '100%',
        width: `${pct ?? 0}%`,
        backgroundColor: pct !== null ? pctColor(pct) : '#e5e7eb',
        borderRadius: 99,
        transition: 'width 0.6s ease',
      }} />
    </div>
  </div>
);

// ─── Podium column (top 3) ───────────────────────────────────────────────────
const PodiumColumn: React.FC<{ entry: LeaderboardEntry; rank: number; isSelf: boolean }> = ({ entry, rank, isSelf }) => {
  const [hovered, setHovered] = useState(false);
  
  // Height & colors configuration
  const config = {
    1: {
      pedestalHeight: 140,
      pedestalBg: 'var(--primary)',
      badgeBg: '#ffd600',
      avatarSize: 72,
      order: 2,
      pedestalTextColor: '#1a1a1a',
    },
    2: {
      pedestalHeight: 100,
      pedestalBg: 'var(--secondary)',
      badgeBg: '#a6e3e9',
      avatarSize: 64,
      order: 1,
      pedestalTextColor: '#1a1a1a',
    },
    3: {
      pedestalHeight: 70,
      pedestalBg: 'var(--accent)',
      badgeBg: '#d3c5f5',
      avatarSize: 56,
      order: 3,
      pedestalTextColor: '#1a1a1a',
    }
  }[rank as 1 | 2 | 3] || {
    pedestalHeight: 70,
    pedestalBg: '#e5e7eb',
    badgeBg: '#e5e7eb',
    avatarSize: 56,
    order: 3,
    pedestalTextColor: '#1a1a1a',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '210px',
        order: config.order,
        transform: hovered ? 'translateY(-12px)' : 'none',
        transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        cursor: 'default',
      }}
    >
      {/* ── Floating User Card ── */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '3px solid var(--border-color)',
        borderRadius: '8px 8px 0 0',
        borderBottom: 'none',
        padding: '24px 16px 12px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        position: 'relative',
        boxShadow: hovered ? '6px 0 0 var(--border-color), -6px 0 0 var(--border-color)' : 'none',
        transition: 'all 0.25s ease',
      }}>
        {/* Crown for 1st Place */}
        {rank === 1 && (
          <div style={{
            position: 'absolute',
            top: -24,
            left: '50%',
            transform: 'translateX(-50%) rotate(-12deg)',
            filter: 'drop-shadow(3px 3px 0px var(--border-color))',
            zIndex: 10,
          }}>
            <Crown size={36} fill="#ffd600" color="var(--border-color)" strokeWidth={2.5} />
          </div>
        )}

        {/* You Badge */}
        {isSelf && (
          <span style={{
            position: 'absolute',
            top: -12,
            right: 8,
            backgroundColor: 'var(--primary)',
            border: '2px solid var(--border-color)',
            borderRadius: '4px',
            padding: '1px 6px',
            fontSize: '0.65rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            boxShadow: '1px 1px 0 var(--border-color)',
          }}>
            YOU
          </span>
        )}

        {/* Profile Picture */}
        <div style={{ position: 'relative' }}>
          <img
            src={entry.profilePic || DEFAULT_PIC}
            alt={entry.name}
            onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PIC; }}
            style={{
              width: config.avatarSize,
              height: config.avatarSize,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--border-color)',
              boxShadow: '2px 2px 0 var(--border-color)',
              backgroundColor: '#fff',
            }}
          />
          <div style={{
            position: 'absolute',
            bottom: -6,
            right: -6,
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: config.badgeBg,
            border: '2px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 900,
          }}>
            {rank}
          </div>
        </div>

        {/* User Name */}
        <div style={{
          fontWeight: 900,
          fontSize: '0.95rem',
          textAlign: 'center',
          lineHeight: 1.2,
          marginTop: 4,
          wordBreak: 'break-word',
          width: '100%',
        }}>
          {entry.name}
        </div>

        {/* Overall Score Badge */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '4px',
          border: '2px solid var(--border-color)',
          fontWeight: 900,
          fontSize: '1.2rem',
          boxShadow: '2px 2px 0 var(--border-color)',
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span style={{ color: pctColor(entry.overallPct) }}>{entry.overallPct}%</span>
        </div>

        {/* Completed exams info */}
        <div style={{
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}>
          {entry.examsCompleted} Assessment{entry.examsCompleted !== 1 ? 's' : ''}
        </div>
      </div>

      {/* ── Pedestal Base ── */}
      <div style={{
        height: `${config.pedestalHeight}px`,
        backgroundColor: config.pedestalBg,
        border: '3px solid var(--border-color)',
        borderRadius: '0 0 8px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: hovered ? '8px 8px 0px 0px var(--border-color)' : '4px 4px 0px 0px var(--border-color)',
        transition: 'all 0.25s ease',
        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.02) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.02) 75%, transparent 75%, transparent)',
        backgroundSize: '16px 16px',
      }}>
        {/* Large stylized Rank Number inside pedestal */}
        <div style={{
          fontSize: rank === 1 ? '4.5rem' : rank === 2 ? '3.5rem' : '2.8rem',
          fontWeight: 950,
          color: config.pedestalTextColor,
          lineHeight: 1,
          fontStyle: 'italic',
          letterSpacing: '-2px',
          textShadow: '2px 2px 0px #fff, 4px 4px 0px var(--border-color)',
          WebkitTextStroke: '1.5px var(--border-color)',
        }}>
          {rank}
        </div>
        
        {/* Suffix */}
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop: -6,
          color: '#1a1a1a',
          textShadow: '1px 1px 0px #fff',
        }}>
          {rank === 1 ? 'ST PLACE' : rank === 2 ? 'ND PLACE' : 'RD PLACE'}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Leaderboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const myRank = entries.findIndex(e => e.id === user?.id) + 1;
  const top3 = entries.slice(0, 3);

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
              { to: '/student',          icon: <BookOpen size={18} />,   label: 'Exams List' },
              { to: '/student/scores',   icon: <Award size={18} />,      label: 'My Scores' },
              { to: '/student/leaderboard', icon: <Trophy size={18} />,  label: 'Leaderboard', active: true },
              { to: '/student/change-password', icon: <Lock size={18} />, label: 'Change Password' },
            ].map(({ to, icon, label, active }) => (
              <Link
                key={to}
                to={to}
                className="neo-btn"
                style={{
                  justifyContent: 'flex-start',
                  boxShadow: active ? 'var(--box-shadow-sm)' : 'none',
                  border: '2px solid var(--border-color)',
                  backgroundColor: active ? 'var(--primary)' : 'transparent',
                  width: '100%',
                  textDecoration: 'none',
                  transform: 'none',
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
          marginBottom: '40px', paddingBottom: '20px', borderBottom: '3px solid var(--border-color)',
        }}>
          <div>
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>
              Leaderboard
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
              See how you stack up against your peers across all subjects
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
            {myRank > 0 && (
              <div className="neo-card" style={{
                backgroundColor: 'var(--primary)', marginBottom: 36,
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '16px 24px', flexWrap: 'wrap',
              }}>
                <Trophy size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase' }}>Your Current Rank</div>
                  <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 2 }}>
                    You are ranked <strong>#{myRank}</strong> out of <strong>{entries.length}</strong> students
                    with an overall score of <strong>{entries[myRank - 1]?.overallPct}%</strong>
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#1a1a1a', color: '#fff',
                  borderRadius: 4, border: '2px solid var(--border-color)',
                  padding: '8px 20px', fontWeight: 900, fontSize: '1.5rem',
                }}>
                  #{myRank}
                </div>
              </div>
            )}

            {/* ── Podium (top 3) ── */}
            {top3.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.3rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={20} /> Top Performers
                </h2>
                <div style={{
                  display: 'flex',
                  gap: '24px',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  padding: '40px 24px',
                  backgroundColor: '#ffffff',
                  border: '3px solid var(--border-color)',
                  borderRadius: '8px',
                  boxShadow: 'var(--box-shadow)',
                  backgroundImage: 'radial-gradient(var(--border-color) 1.5px, transparent 1.5px)',
                  backgroundSize: '16px 16px',
                }}>
                  {top3.map((e, i) => (
                    <PodiumColumn key={e.id} entry={e} rank={i + 1} isSelf={e.id === user?.id} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Full Ranking Table ── */}
            <section>
              <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.2rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={20} /> Full Rankings
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {entries.map((entry, idx) => {
                  const rank = idx + 1;
                  const isSelf = entry.id === user?.id;
                  const rankStyle = RANK_STYLES[rank];

                  return (
                    <div
                      key={entry.id}
                      className="neo-card"
                      style={{
                        backgroundColor: isSelf ? '#fffbeb' : '#ffffff',
                        border: isSelf ? '3px solid var(--primary)' : '3px solid var(--border-color)',
                        padding: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Row header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 20px',
                        borderBottom: '2px solid var(--border-color)',
                        backgroundColor: rankStyle ? rankStyle.bg : isSelf ? '#fffde7' : '#fafafa',
                        flexWrap: 'wrap',
                      }}>
                        {/* Rank badge */}
                        <div style={{
                          minWidth: 44, height: 44, borderRadius: 4,
                          backgroundColor: rankStyle ? rankStyle.border : '#e5e7eb',
                          border: '2px solid var(--border-color)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 900, fontSize: '1.1rem', color: rank <= 3 ? '#fff' : '#1a1a1a',
                          flexShrink: 0,
                        }}>
                          {`#${rank}`}
                        </div>

                        {/* Avatar */}
                        <img
                          src={entry.profilePic || DEFAULT_PIC}
                          alt={entry.name}
                          onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PIC; }}
                          style={{
                            width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                            border: '2px solid var(--border-color)', flexShrink: 0,
                          }}
                        />

                        {/* Name + stats */}
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {entry.name}
                            {isSelf && (
                              <span style={{
                                backgroundColor: 'var(--primary)', border: '1px solid var(--border-color)',
                                borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 900,
                              }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckSquare size={13} /> {entry.examsCompleted} exam{entry.examsCompleted !== 1 ? 's' : ''}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <TrendingUp size={13} /> {entry.totalEarned} / {entry.totalPossible} pts
                            </span>
                          </div>
                        </div>

                        {/* Overall % */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontSize: '1.8rem', fontWeight: 900,
                            color: pctColor(entry.overallPct),
                          }}>
                            {entry.overallPct}%
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Overall</div>
                        </div>
                      </div>

                      {/* Subject mini-bars */}
                      <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px' }}>
                        {entry.subjectScores.map(s => (
                          <SubjectBar key={s.subject} label={s.subject} pct={s.pct} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
