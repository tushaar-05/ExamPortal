import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Camera, Loader } from 'lucide-react';
import { apiUrl } from '../utils/api';

const DEFAULT_PIC = '/profilePic.png';

const ProfileAvatar: React.FC = () => {
  const { user, updateProfilePic } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarSrc = user?.profilePic || DEFAULT_PIC;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('profilePic', file);

    try {
      const res = await fetch(apiUrl('/student/profile/pic'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        updateProfilePic(data.profilePic);
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch {
      setError('Network error during upload.');
    } finally {
      setUploading(false);
      // reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
      {/* Avatar wrapper */}
      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        title="Click to change profile picture"
        style={{
          position: 'relative',
          width: 90,
          height: 90,
          borderRadius: '50%',
          border: '3px solid var(--border-color)',
          overflow: 'hidden',
          cursor: uploading ? 'wait' : 'pointer',
          boxShadow: '4px 4px 0 var(--border-color)',
          flexShrink: 0,
        }}
      >
        <img
          src={avatarSrc}
          alt="Profile"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_PIC; }}
        />

        {/* Hover overlay */}
        <div
          className="avatar-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: uploading ? 1 : 0,
            transition: 'opacity 0.2s ease',
            gap: 4,
          }}
        >
          {uploading
            ? <Loader size={20} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
            : <Camera size={20} color="#fff" />
          }
          {!uploading && (
            <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>
              Change
            </span>
          )}
        </div>
      </div>

      {/* Name below avatar */}
      <div style={{ marginTop: 10, fontWeight: 900, fontSize: '0.95rem', textAlign: 'center', maxWidth: '200px', wordBreak: 'break-word' }}>
        {user?.name}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, textAlign: 'center', maxWidth: '200px', wordBreak: 'break-word' }}>
        {user?.email}
      </div>

      {/* Explicit upload button */}
      <button
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '7px 10px',
          fontSize: '0.75rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          backgroundColor: uploading ? '#e5e7eb' : 'var(--primary)',
          color: '#1a1a1a',
          border: '2px solid var(--border-color)',
          borderRadius: '4px',
          boxShadow: uploading ? 'none' : '3px 3px 0 var(--border-color)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'box-shadow 0.1s ease, transform 0.1s ease',
        }}
        onMouseEnter={e => { if (!uploading) { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(-1px,-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 var(--border-color)'; }}}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = uploading ? 'none' : '3px 3px 0 var(--border-color)'; }}
      >
        {uploading
          ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
          : <><Camera size={13} /> Change Profile Pic</>
        }
      </button>

      {error && (
        <div style={{
          marginTop: 8,
          backgroundColor: '#ffe0e0',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#b22222',
          textAlign: 'center',
          maxWidth: '200px',
        }}>
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ProfileAvatar;
