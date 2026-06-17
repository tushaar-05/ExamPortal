import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: 'var(--bg-color)'
    }}>
      <div className="neo-card" style={{
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        padding: '40px 30px'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '16px',
          backgroundColor: 'var(--danger)',
          border: 'var(--border-width) solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--box-shadow-sm)',
          marginBottom: '24px',
          color: '#ffffff'
        }}>
          <ShieldAlert size={48} />
        </div>
        
        <h1 className="header-title" style={{ fontSize: '2rem', marginBottom: '16px' }}>
          Access Blocked
        </h1>
        
        <p className="subtitle" style={{ fontSize: '1rem', marginBottom: '32px' }}>
          You do not have the required permissions to view this page. This area is restricted based on your role.
        </p>

        <button onClick={handleGoHome} className="neo-btn" style={{ width: '100%' }}>
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
