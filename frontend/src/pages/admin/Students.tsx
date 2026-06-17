import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import { 
  Shield, 
  GraduationCap, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Lock, 
  LogOut, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  BarChart2
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  role: string;
  score?: string;
  createdAt: string;
}

const Students: React.FC = () => {
    const { logout } = useAuth();
  
  // Student list states
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formScore, setFormScore] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Delete confirm modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Results modal state
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/admin/students'), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to load students list');
      }
    } catch (err) {
      console.error('Fetch students error:', err);
      setError('Network error: Could not reach the API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenCreateModal = () => {
    setModalType('create');
    setSelectedStudent(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormScore('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (student: Student) => {
    setModalType('edit');
    setSelectedStudent(student);
    setFormName(student.name);
    setFormEmail(student.email);
    setFormPassword(''); // blank for optional reset
    setFormScore(student.score || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenDeleteConfirm = (student: Student) => {
    setStudentToDelete(student);
    setDeleteConfirmOpen(true);
  };

  const handleOpenResultsModal = async (student: Student) => {
    setSelectedStudent(student);
    setResultsModalOpen(true);
    setResultsLoading(true);
    setResultsError(null);
    setStudentResults([]);
    setExpandedAttemptId(null);
    try {
      const response = await fetch(apiUrl(`/admin/students/${student.id}/results`), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStudentResults(data.results);
      } else {
        const errData = await response.json();
        setResultsError(errData.message || 'Failed to fetch exam results.');
      }
    } catch (err) {
      console.error('Fetch student results error:', err);
      setResultsError('Network error: Could not reach the API.');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Name and Email are required.');
      setFormLoading(false);
      return;
    }

    if (modalType === 'create' && (!formPassword || formPassword.length < 6)) {
      setFormError('Password must be at least 6 characters.');
      setFormLoading(false);
      return;
    }

    if (modalType === 'edit' && formPassword && formPassword.length < 6) {
      setFormError('Password must be at least 6 characters if resetting.');
      setFormLoading(false);
      return;
    }

    try {
      const url = modalType === 'create' 
        ? apiUrl('/admin/students') 
        : apiUrl(`/admin/students/${selectedStudent?.id}`);
      
      const method = modalType === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          score: formScore,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || `Student successfully ${modalType === 'create' ? 'added' : 'updated'}`);
        setModalOpen(false);
        fetchStudents();
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setFormError(data.errors.join(' '));
        } else {
          setFormError(data.message || 'Failed to submit student details.');
        }
      }
    } catch (err) {
      console.error('Submit form error:', err);
      setFormError('Network error: Could not reach the API.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteExecute = async () => {
    if (!studentToDelete) return;
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(apiUrl(`/admin/students/${studentToDelete.id}`), {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Student successfully removed');
        setDeleteConfirmOpen(false);
        setStudentToDelete(null);
        fetchStudents();

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'Failed to delete student.');
        setDeleteConfirmOpen(false);
        setStudentToDelete(null);
      }
    } catch (err) {
      console.error('Delete student error:', err);
      setError('Network error: Could not complete deletion.');
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '24px',
            borderBottom: '2px solid #e1e1e1',
            marginBottom: '30px'
          }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              border: '2px solid var(--border-color)',
              borderRadius: '4px',
              padding: '6px',
              display: 'inline-flex'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', display: 'block' }}>Exam Portal</span>
              <span className="neo-badge neo-badge-admin" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>Admin Panel</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/admin" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <LayoutDashboard size={18} />
              Dashboard
            </Link>
            
            <Link to="/admin/exams" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <FileText size={18} />
              Exams List
            </Link>
            
            {/* Active Link */}
            <Link to="/admin/students" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              backgroundColor: 'var(--primary)'
            }}>
              <Users size={18} />
              Students
            </Link>

            <Link to="/admin/subject-scores" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <BarChart2 size={18} />
              Subject Marks
            </Link>

            <Link to="/admin/change-password" className="neo-btn neo-btn-secondary" style={{
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
            <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Student Management</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
              Add, update, or remove registered students from the exam portal
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={fetchStudents} className="neo-btn neo-btn-secondary" style={{ padding: '8px 12px' }}>
              <RefreshCw size={16} />
              Reload
            </button>
            <button onClick={handleOpenCreateModal} className="neo-btn" style={{ padding: '8px 16px' }}>
              <Plus size={16} />
              Add Student
            </button>
          </div>
        </header>

        {error && (
          <div className="neo-card" style={{
            backgroundColor: 'var(--danger)',
            color: '#fff',
            marginBottom: '30px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="neo-card" style={{
            backgroundColor: 'var(--accent-green)',
            color: 'var(--text-color)',
            marginBottom: '30px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* Search & Statistics */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input"
              placeholder="Search by name or email..."
              style={{ paddingLeft: '40px' }}
            />
            <Search size={18} style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
          </div>

          <div className="neo-badge neo-badge-student" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
            Total Students: {filteredStudents.length}
          </div>
        </div>

        {/* Student Records Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Retrieving student directory...</h3>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="neo-card" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff' }}>
            <GraduationCap size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
            <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}>No Students Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery ? 'No student matches your search terms.' : 'Get started by clicking the "Add Student" button above.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: 'var(--border-width) solid var(--border-color)', boxShadow: 'var(--box-shadow)', borderRadius: 'var(--border-radius)' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: '#ffffff',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--primary)',
                  borderBottom: 'var(--border-width) solid var(--border-color)'
                }}>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '25%' }}>Name</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '35%' }}>Email Address</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '15%' }}>Score</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '15%' }}>Joined Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '10%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{
                    borderBottom: '2px solid var(--border-color)',
                    transition: 'var(--transition)'
                  }}>
                    <td style={{ padding: '16px 20px', fontWeight: 700 }}>{student.name}</td>
                    <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontSize: '0.95rem' }}>{student.email}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="neo-badge" style={{
                        backgroundColor: student.score && student.score !== 'N/A' ? 'var(--accent-green)' : '#e1e1e1',
                        fontSize: '0.75rem',
                        padding: '2px 8px'
                      }}>
                        {student.score || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {new Date(student.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleOpenResultsModal(student)}
                          className="neo-btn"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none', backgroundColor: 'var(--accent)' }}
                          title="View Exam Results"
                        >
                          <BarChart2 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(student)}
                          className="neo-btn neo-btn-accent"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none' }}
                          title="Edit Student"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteConfirm(student)}
                          className="neo-btn neo-btn-danger"
                          style={{ padding: '6px 10px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none' }}
                          title="Delete Student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{
            width: '90%',
            maxWidth: '500px',
            backgroundColor: '#ffffff',
            boxShadow: 'var(--box-shadow-lg)',
            position: 'relative'
          }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-color)'
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '24px', fontSize: '1.4rem' }}>
              {modalType === 'create' ? 'Add New Student' : 'Edit Student Details'}
            </h2>

            {formError && (
              <div className="neo-card" style={{
                backgroundColor: 'var(--danger)',
                color: '#fff',
                padding: '12px',
                marginBottom: '20px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--box-shadow-sm)'
              }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.9rem' }}>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="neo-input"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="neo-input"
                  placeholder="e.g. john@university.edu"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  {modalType === 'create' ? 'Password' : 'Reset Password (Optional)'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="neo-input"
                  placeholder={modalType === 'create' ? 'Min 6 characters' : 'Leave blank to keep current password'}
                  required={modalType === 'create'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Exam Score (Optional)
                </label>
                <input
                  type="text"
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  className="neo-input"
                  placeholder="e.g. 85%, Pending, or N/A"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="neo-btn"
                  style={{ flex: 1 }}
                >
                  {formLoading ? 'Saving...' : modalType === 'create' ? 'Create Student' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="neo-btn neo-btn-secondary"
                  style={{ backgroundColor: '#e1e1e1' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{
            width: '90%',
            maxWidth: '450px',
            backgroundColor: '#ffffff',
            boxShadow: 'var(--box-shadow-lg)',
            textAlign: 'center'
          }}>
            <Trash2 size={40} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
            
            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '12px', fontSize: '1.3rem' }}>
              Confirm Deletion
            </h2>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to remove student <strong>{studentToDelete?.name}</strong> ({studentToDelete?.email})? 
              This action is permanent and cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button
                onClick={handleDeleteExecute}
                className="neo-btn neo-btn-danger"
                style={{ flex: 1 }}
              >
                Delete Student
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setStudentToDelete(null);
                }}
                className="neo-btn neo-btn-secondary"
                style={{ flex: 1, backgroundColor: '#e1e1e1' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Exam Results Modal */}
      {resultsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{
            width: '90%',
            maxWidth: '800px',
            maxHeight: '85vh',
            backgroundColor: '#ffffff',
            boxShadow: 'var(--box-shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '3px solid var(--border-color)',
              backgroundColor: 'var(--primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '1.25rem', margin: 0 }}>
                  Exam Performance Records
                </h2>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
                  Student: <strong style={{ color: '#000' }}>{selectedStudent?.name}</strong> ({selectedStudent?.email})
                </div>
              </div>
              <button 
                onClick={() => setResultsModalOpen(false)}
                style={{
                  border: '2px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontWeight: 900
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {resultsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Retrieving student history...</h3>
                </div>
              ) : resultsError ? (
                <div className="neo-card" style={{ backgroundColor: 'var(--danger)', color: '#fff', fontWeight: 700 }}>
                  {resultsError}
                </div>
              ) : studentResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  This student has not attempted or submitted any exams yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '2px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.78rem' }}>Exam & Subject</th>
                        <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.78rem', width: '15%' }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.78rem', width: '22%' }}>Violations</th>
                        <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.78rem', width: '18%' }}>Score</th>
                        <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.78rem', width: '18%' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentResults.map((res: any) => {
                        const isCompleted = res.status === 'COMPLETED' || res.status === 'SUBMITTED';
                        const isTerminated = res.status === 'TERMINATED';
                        const hasViolations = res.violationsCount > 0;
                        const isExpanded = expandedAttemptId === res.examId;

                        let badgeColor = '#f0f0f0';
                        let badgeTextColor = '#555';
                        if (isCompleted) {
                          badgeColor = 'var(--accent-green)';
                          badgeTextColor = '#1a1a1a';
                        } else if (isTerminated) {
                          badgeColor = '#ffe0e0';
                          badgeTextColor = '#b22222';
                        } else if (res.status === 'STARTED') {
                          badgeColor = '#dbeafe';
                          badgeTextColor = '#1e40af';
                        }

                        return (
                          <React.Fragment key={res.examId}>
                            <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)' }}>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontWeight: 700 }}>{res.examTitle}</div>
                                <span style={{
                                  backgroundColor: 'var(--bg-color)',
                                  color: '#555',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px',
                                  padding: '0px 4px',
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  marginTop: '4px',
                                  display: 'inline-block'
                                }}>
                                  {res.subject}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{
                                  backgroundColor: badgeColor,
                                  color: badgeTextColor,
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase'
                                }}>
                                  {res.status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                {hasViolations ? (
                                  <button
                                    onClick={() => setExpandedAttemptId(isExpanded ? null : res.examId)}
                                    style={{
                                      backgroundColor: '#ffe0e0',
                                      color: '#b22222',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    ⚠ {res.violationsCount} Violations {isExpanded ? '▲' : '▼'}
                                  </button>
                                ) : (
                                  <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.85rem' }}>✓ Clean session</span>
                                )}
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 800 }}>
                                {res.score !== null ? (
                                  <div>
                                    <span>{res.score}</span>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem' }}> / {res.totalPoints}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(res.dateAttempted).toLocaleDateString(undefined, { dateStyle: 'short' })}
                              </td>
                            </tr>

                            {/* Expanded Violations Detail List */}
                            {isExpanded && (
                              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: '#fff8f8' }}>
                                <td colSpan={5} style={{ padding: '12px 24px' }}>
                                  <div style={{ fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', color: '#b22222', marginBottom: '8px' }}>
                                    Violation Event Log:
                                  </div>
                                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#555', lineHeight: '1.6' }}>
                                    {res.violationsList.map((violation: any, idx: number) => (
                                      <li key={idx}>
                                        <strong style={{ color: '#b22222' }}>{violation.type}</strong> at {new Date(violation.timestamp).toLocaleString()}
                                        {violation.metadata && <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>({violation.metadata})</span>}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '2px solid var(--border-color)',
              backgroundColor: '#f9f9f9',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                onClick={() => setResultsModalOpen(false)}
                className="neo-btn"
                style={{ padding: '8px 20px', fontSize: '0.88rem' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
