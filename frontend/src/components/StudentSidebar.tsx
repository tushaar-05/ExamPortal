import React from 'react';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Lock, LogOut, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileAvatar from './ProfileAvatar';

type StudentSidebarItem = 'exams' | 'scores' | 'leaderboard' | 'change-password';

interface StudentSidebarProps {
  activeItem?: StudentSidebarItem;
}

const linkBaseStyle: React.CSSProperties = {
  justifyContent: 'flex-start',
  border: '2px solid var(--border-color)',
  width: '100%',
  textDecoration: 'none',
  transform: 'none',
};

const getLinkStyle = (active: boolean): React.CSSProperties => ({
  ...linkBaseStyle,
  boxShadow: active ? 'var(--box-shadow-sm)' : 'none',
  backgroundColor: active ? 'var(--primary)' : 'transparent',
});

const StudentSidebar: React.FC<StudentSidebarProps> = ({ activeItem = 'exams' }) => {
  const { logout } = useAuth();

  const items = [
    { id: 'exams', to: '/student', icon: <BookOpen size={18} />, label: 'Exams List' },
    { id: 'scores', to: '/student/scores', icon: <Award size={18} />, label: 'My Scores' },
    { id: 'leaderboard', to: '/student/leaderboard', icon: <Trophy size={18} />, label: 'Leaderboard' },
    { id: 'change-password', to: '/student/change-password', icon: <Lock size={18} />, label: 'Change Password' },
  ] as const;

  return (
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
        <ProfileAvatar />

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => {
            const active = item.id === activeItem;
            return (
              <Link
                key={item.id}
                to={item.to}
                className={active ? 'neo-btn' : 'neo-btn neo-btn-secondary'}
                style={getLinkStyle(active)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button onClick={logout} className="neo-btn neo-btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
        <LogOut size={18} />
        Sign Out
      </button>
    </aside>
  );
};

export default StudentSidebar;
