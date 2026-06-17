import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../utils/api';
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Lock, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  HelpCircle
} from 'lucide-react';

interface Option {
  id: string;
  text: string;
  imageUrl?: string | null;
}

interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  options: Option[];
  correctOptionId: string;
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalPoints: number;
  questionsCount?: number;
  questions: Question[];
  startTime?: string | null;
  endTime?: string | null;
  subject?: string | null;
  createdAt: string;
}

const Exams: React.FC = () => {
  const { logout } = useAuth();
  
  // Exams list states
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Mode selection: 'LIST' or 'QUESTIONS'
  const [currentView, setCurrentView] = useState<'LIST' | 'QUESTIONS'>('LIST');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Exam outline Modal states
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examModalType, setExamModalType] = useState<'create' | 'edit'>('create');
  const [formExamTitle, setFormExamTitle] = useState('');
  const [formExamDesc, setFormExamDesc] = useState('');
  const [formExamDuration, setFormExamDuration] = useState(60);
  const [formExamPoints, setFormExamPoints] = useState(100);
  const [formExamStartTime, setFormExamStartTime] = useState('');
  const [formExamEndTime, setFormExamEndTime] = useState('');
  const [formExamSubject, setFormExamSubject] = useState('');
  const [examFormError, setExamFormError] = useState<string | null>(null);
  const [examFormLoading, setExamFormLoading] = useState(false);

  // Question Modal states
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionModalType, setQuestionModalType] = useState<'create' | 'edit'>('create');
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Question form states
  const [formQText, setFormQText] = useState('');
  const [formQImage, setFormQImage] = useState('');
  const [formQDifficulty, setFormQDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [formQPoints, setFormQPoints] = useState(25);
  
  // Option text and image states
  const [opt1Text, setOpt1Text] = useState('');
  const [opt1Image, setOpt1Image] = useState('');
  const [opt2Text, setOpt2Text] = useState('');
  const [opt2Image, setOpt2Image] = useState('');
  const [opt3Text, setOpt3Text] = useState('');
  const [opt3Image, setOpt3Image] = useState('');
  const [opt4Text, setOpt4Text] = useState('');
  const [opt4Image, setOpt4Image] = useState('');
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0); // 0 to 3

  // Delete confirmations
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [deleteQuestionOpen, setDeleteQuestionOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/admin/exams'), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams);
      } else {
        const errData = await response.json();
        setError(errData.message || 'Failed to load exams list');
      }
    } catch (err) {
      console.error('Fetch exams error:', err);
      setError('Network error: Could not reach the API');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamDetails = async (examId: string) => {
    try {
      const response = await fetch(apiUrl(`/admin/exams/${examId}`), {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setActiveExam(data.exam);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Fetch exam detail error:', err);
      return false;
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // ─── Exam Outline CRUD Operations ──────────────────────────────────────────

  const handleOpenCreateExam = () => {
    setActiveExam(null);
    setExamModalType('create');
    setFormExamTitle('');
    setFormExamDesc('');
    setFormExamDuration(60);
    setFormExamPoints(100);
    setFormExamStartTime('');
    setFormExamEndTime('');
    setFormExamSubject('');
    setExamFormError(null);
    setExamModalOpen(true);
  };

  const handleOpenEditExam = (exam: Exam) => {
    setActiveExam(exam);
    setExamModalType('edit');
    setFormExamTitle(exam.title);
    setFormExamDesc(exam.description || '');
    setFormExamDuration(exam.durationMinutes);
    setFormExamPoints(exam.totalPoints);
    // Convert ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
    const toLocal = (iso: string | null | undefined) => {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setFormExamStartTime(toLocal(exam.startTime));
    setFormExamEndTime(toLocal(exam.endTime));
    setFormExamSubject(exam.subject || '');
    setExamFormError(null);
    setExamModalOpen(true);
  };

  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExamFormError(null);
    setExamFormLoading(true);

    if (!formExamTitle.trim()) {
      setExamFormError('Exam title is required.');
      setExamFormLoading(false);
      return;
    }

    try {
      const url = examModalType === 'create' 
        ? apiUrl('/admin/exams') 
        : apiUrl(`/admin/exams/${activeExam?.id || exams.find(ex => ex.title === formExamTitle)?.id}`);
      
      const method = examModalType === 'create' ? 'POST' : 'PUT';

      const requestBody: any = {
        title: formExamTitle,
        description: formExamDesc,
        durationMinutes: Number(formExamDuration),
        totalPoints: Number(formExamPoints),
        startTime: formExamStartTime ? new Date(formExamStartTime).toISOString() : null,
        endTime: formExamEndTime ? new Date(formExamEndTime).toISOString() : null,
        subject: formExamSubject || null,
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Exam outline successfully ${examModalType === 'create' ? 'created' : 'updated'}`);
        setExamModalOpen(false);
        fetchExams();
        if (activeExam) {
          fetchExamDetails(activeExam.id);
        }
        setTimeout(() => setSuccess(null), 5000);
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setExamFormError(data.errors.join(' '));
        } else {
          setExamFormError(data.message || 'Failed to save exam details.');
        }
      }
    } catch (err) {
      console.error('Submit exam outline error:', err);
      setExamFormError('Network error: Could not reach the API.');
    } finally {
      setExamFormLoading(false);
    }
  };

  const handleOpenDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteExamExecute = async () => {
    if (!examToDelete) return;
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(apiUrl(`/admin/exams/${examToDelete.id}`), {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Exam successfully deleted');
        setDeleteConfirmOpen(false);
        setExamToDelete(null);
        fetchExams();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'Failed to delete exam.');
        setDeleteConfirmOpen(false);
        setExamToDelete(null);
      }
    } catch (err) {
      console.error('Delete exam error:', err);
      setError('Network error: Could not complete exam deletion.');
      setDeleteConfirmOpen(false);
      setExamToDelete(null);
    }
  };

  // ─── Questions Management ──────────────────────────────────────────────────

  const handleManageQuestions = async (exam: Exam) => {
    // Fetch the full exam details first so we have the questions array
    const success = await fetchExamDetails(exam.id);
    if (success) {
      setCurrentView('QUESTIONS');
    } else {
      setError('Failed to load exam questions');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleOpenCreateQuestion = () => {
    setQuestionModalType('create');
    setSelectedQuestion(null);
    setFormQText('');
    setFormQImage('');
    setFormQDifficulty('MEDIUM');
    setFormQPoints(25);
    
    // Clear options
    setOpt1Text('');
    setOpt1Image('');
    setOpt2Text('');
    setOpt2Image('');
    setOpt3Text('');
    setOpt3Image('');
    setOpt4Text('');
    setOpt4Image('');
    setCorrectOptionIndex(0);
    
    setQuestionError(null);
    setQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (question: Question) => {
    setQuestionModalType('edit');
    setSelectedQuestion(question);
    setFormQText(question.text);
    setFormQImage(question.imageUrl || '');
    setFormQDifficulty(question.difficulty);
    setFormQPoints(question.points);

    // Setup options text/images
    if (question.options[0]) {
      setOpt1Text(question.options[0].text);
      setOpt1Image(question.options[0].imageUrl || '');
    }
    if (question.options[1]) {
      setOpt2Text(question.options[1].text);
      setOpt2Image(question.options[1].imageUrl || '');
    }
    if (question.options[2]) {
      setOpt3Text(question.options[2].text);
      setOpt3Image(question.options[2].imageUrl || '');
    }
    if (question.options[3]) {
      setOpt4Text(question.options[3].text);
      setOpt4Image(question.options[3].imageUrl || '');
    }

    const correctIdx = question.options.findIndex(opt => opt.id === question.correctOptionId);
    setCorrectOptionIndex(correctIdx >= 0 ? correctIdx : 0);

    setQuestionError(null);
    setQuestionModalOpen(true);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError(null);

    if (!formQText.trim()) {
      setQuestionError('Question text is required.');
      return;
    }

    if (!opt1Text.trim() || !opt2Text.trim() || !opt3Text.trim() || !opt4Text.trim()) {
      setQuestionError('All 4 option text values must be filled.');
      return;
    }

    if (!activeExam) return;

    // Build options list
    const options: Option[] = [
      { id: 'opt1', text: opt1Text, imageUrl: opt1Image.trim() !== '' ? opt1Image : null },
      { id: 'opt2', text: opt2Text, imageUrl: opt2Image.trim() !== '' ? opt2Image : null },
      { id: 'opt3', text: opt3Text, imageUrl: opt3Image.trim() !== '' ? opt3Image : null },
      { id: 'opt4', text: opt4Text, imageUrl: opt4Image.trim() !== '' ? opt4Image : null },
    ];

    const correctOptionId = options[correctOptionIndex].id;

    // Create question item
    const newQuestion: Question = {
      id: questionModalType === 'create' ? `q_${Date.now()}` : (selectedQuestion?.id || `q_${Date.now()}`),
      text: formQText,
      imageUrl: formQImage.trim() !== '' ? formQImage : null,
      difficulty: formQDifficulty,
      points: Number(formQPoints),
      options,
      correctOptionId,
    };

    // Calculate updated questions list
    const updatedQuestions: Question[] = questionModalType === 'create'
      ? [...activeExam.questions, newQuestion]
      : activeExam.questions.map(q => q.id === selectedQuestion?.id ? newQuestion : q);

    // Call API to save questions
    try {
      const response = await fetch(apiUrl(`/admin/exams/${activeExam.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: activeExam.title,
          description: activeExam.description,
          durationMinutes: activeExam.durationMinutes,
          totalPoints: activeExam.totalPoints,
          questions: updatedQuestions,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Question successfully ${questionModalType === 'create' ? 'added' : 'updated'}`);
        setQuestionModalOpen(false);
        fetchExamDetails(activeExam.id);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setQuestionError(data.message || 'Failed to save question.');
      }
    } catch (err) {
      console.error('Submit question error:', err);
      setQuestionError('Network error: Could not contact server.');
    }
  };

  const handleOpenDeleteQuestion = (question: Question) => {
    setQuestionToDelete(question);
    setDeleteQuestionOpen(true);
  };

  const handleDeleteQuestionExecute = async () => {
    if (!questionToDelete || !activeExam) return;
    setError(null);
    setSuccess(null);

    const updatedQuestions = activeExam.questions.filter(q => q.id !== questionToDelete.id);

    try {
      const response = await fetch(apiUrl(`/admin/exams/${activeExam.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: activeExam.title,
          description: activeExam.description,
          durationMinutes: activeExam.durationMinutes,
          totalPoints: activeExam.totalPoints,
          questions: updatedQuestions,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Question deleted successfully');
        setDeleteQuestionOpen(false);
        setQuestionToDelete(null);
        fetchExamDetails(activeExam.id);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'Failed to delete question.');
        setDeleteQuestionOpen(false);
        setQuestionToDelete(null);
      }
    } catch (err) {
      console.error('Delete question error:', err);
      setError('Network error: Could not delete question.');
      setDeleteQuestionOpen(false);
      setQuestionToDelete(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setUrl: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(apiUrl('/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setUrl(data.url);
      } else {
        setQuestionError(data.message || 'Image upload failed');
      }
    } catch (err) {
      console.error('Upload error', err);
      setQuestionError('Upload failed. Network error.');
    }
  };

  const currentQuestionsPointsSum = activeExam?.questions ? activeExam.questions.reduce((sum, q) => sum + q.points, 0) : 0;

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
            
            {/* Active Link */}
            <Link to="/admin/exams" className="neo-btn" style={{
              justifyContent: 'flex-start',
              boxShadow: 'var(--box-shadow-sm)',
              transform: 'none',
              width: '100%',
              backgroundColor: 'var(--primary)'
            }}>
              <FileText size={18} />
              Exams List
            </Link>
            
            <Link to="/admin/students" className="neo-btn neo-btn-secondary" style={{
              justifyContent: 'flex-start',
              boxShadow: 'none',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              width: '100%',
              textDecoration: 'none',
              transform: 'none'
            }}>
              <Users size={18} />
              Students
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
        
        {/* VIEW 1: EXAMS LIST */}
        {currentView === 'LIST' && (
          <div>
            <header style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '40px',
              paddingBottom: '20px',
              borderBottom: '3px solid var(--border-color)'
            }}>
              <div>
                <h1 className="header-title" style={{ margin: 0, fontSize: '2.2rem' }}>Exams Directory</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                  Manage testing modules, question contents, and durations
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={fetchExams} className="neo-btn neo-btn-secondary" style={{ padding: '8px 12px' }}>
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button onClick={handleOpenCreateExam} className="neo-btn" style={{ padding: '8px 16px' }}>
                  <Plus size={16} />
                  Add Exam
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

            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Retrieving testing modules...</h3>
              </div>
            ) : exams.length === 0 ? (
              <div className="neo-card" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff' }}>
                <HelpCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}>No Exams Configured</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Create your first exam template using the "Add Exam" button above.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', border: 'var(--border-width) solid var(--border-color)', boxShadow: 'var(--box-shadow)', borderRadius: 'var(--border-radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#ffffff', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--primary)', borderBottom: 'var(--border-width) solid var(--border-color)' }}>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem' }}>Exam Title</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '13%' }}>Duration</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '10%' }}>Questions</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '10%' }}>Score</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '22%' }}>Schedule</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', width: '22%', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map((exam) => (
                      <tr key={exam.id} style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span>{exam.title}</span>
                            {exam.subject && (
                              <span style={{
                                backgroundColor: 'var(--secondary)',
                                color: '#1a1a1a',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '1px 6px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}>
                                {exam.subject}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>
                            {exam.description || 'No description provided.'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>{exam.durationMinutes} mins</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span className="neo-badge neo-badge-student">{exam.questionsCount || 0} MCQs</span>
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>{exam.totalPoints} pts</td>
                        <td style={{ padding: '16px 20px' }}>
                          {exam.startTime || exam.endTime ? (
                            <div style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
                              {exam.startTime && (
                                <div><span style={{ fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem' }}>Start</span><br />{new Date(exam.startTime).toLocaleString()}</div>
                              )}
                              {exam.endTime && (
                                <div style={{ marginTop: 4 }}><span style={{ fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem' }}>End</span><br />{new Date(exam.endTime).toLocaleString()}</div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Always open</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleManageQuestions(exam)}
                              className="neo-btn"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none' }}
                            >
                              Manage Questions
                            </button>
                            <button
                              onClick={() => handleOpenEditExam(exam)}
                              className="neo-btn neo-btn-accent"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none' }}
                              title="Edit Outline"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteExam(exam)}
                              className="neo-btn neo-btn-danger"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none' }}
                              title="Delete Exam"
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
          </div>
        )}

        {/* VIEW 2: MANAGE QUESTIONS (EXAM DETAIL) */}
        {currentView === 'QUESTIONS' && activeExam && (
          <div>
            <header style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '3px solid var(--border-color)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => { setCurrentView('LIST'); fetchExams(); }} 
                                    className="neo-btn neo-btn-secondary" 
                    style={{ padding: '6px 10px', boxShadow: 'none', borderWidth: '2px' }}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <h1 className="header-title" style={{ margin: 0, fontSize: '2rem' }}>Exam Questions</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                  Configure MCQ question bank for: <strong>{activeExam.title}</strong> ({activeExam.durationMinutes} mins)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleOpenCreateQuestion} className="neo-btn" style={{ padding: '8px 16px' }}>
                  <Plus size={16} />
                  Add Question
                </button>
              </div>
            </header>

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

            {/* Score Sum Progress Indicator */}
            <div className="neo-card" style={{ 
              backgroundColor: '#ffffff', 
              marginBottom: '30px',
              borderLeft: '10px solid var(--primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '4px' }}>Points Verification Check</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Ensure the sum of points for all questions reaches exactly the target score of <strong>{activeExam.totalPoints}</strong> points.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>
                  {currentQuestionsPointsSum} / {activeExam.totalPoints} <span style={{ fontSize: '1rem', fontWeight: 500 }}>Points</span>
                </div>
                <div style={{ marginTop: '4px' }}>
                  {currentQuestionsPointsSum === activeExam.totalPoints ? (
                    <span className="neo-badge neo-badge-student">Score Validated</span>
                  ) : (
                    <span className="neo-badge" style={{ backgroundColor: '#ffdede', color: '#b22222' }}>Points Mismatch</span>
                  )}
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {activeExam.questions.length === 0 ? (
                <div className="neo-card" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff' }}>
                  <HelpCircle size={40} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
                  <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}>No Questions Found</h3>
                  <p style={{ color: 'var(--text-muted)' }}>
                    Add multiple-choice questions by clicking the "+ Add Question" button.
                  </p>
                </div>
              ) : (
                activeExam.questions.map((question, index) => (
                  <div key={question.id} className="neo-card" style={{ backgroundColor: '#ffffff', position: 'relative' }}>
                    
                    {/* Floating Controls */}
                    <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleOpenEditQuestion(question)}
                        className="neo-btn neo-btn-accent"
                        style={{ padding: '8px 10px', fontSize: '0.8rem', boxShadow: '2px 2px 0px 0px var(--border-color)', transform: 'none' }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteQuestion(question)}
                        className="neo-btn neo-btn-danger"
                        style={{ padding: '8px 10px', fontSize: '0.8rem', boxShadow: '2px 2px 0px 0px var(--border-color)', transform: 'none' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Question Title/Metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      <span className="neo-badge" style={{ backgroundColor: 'var(--primary)' }}>Q{index + 1}</span>
                      <span className="neo-badge" style={{ 
                        backgroundColor: question.difficulty === 'EASY' ? 'var(--accent-green)' : question.difficulty === 'MEDIUM' ? 'var(--primary)' : 'var(--danger)',
                        color: question.difficulty === 'HARD' ? '#ffffff' : 'var(--text-color)'
                      }}>
                        {question.difficulty}
                      </span>
                      <span className="neo-badge" style={{ backgroundColor: 'transparent', borderStyle: 'dashed' }}>
                        {question.points} Points
                      </span>
                    </div>

                    {/* Question Content */}
                    <h3 style={{ fontWeight: 900, fontSize: '1.25rem', marginBottom: '20px', maxWidth: '80%' }}>
                      {question.text}
                    </h3>

                    {/* Question Image if present */}
                    {question.imageUrl && (
                      <div style={{ marginBottom: '24px' }}>
                        <div style={{
                          display: 'inline-block',
                          border: 'var(--border-width) solid var(--border-color)',
                          boxShadow: 'var(--box-shadow-sm)',
                          borderRadius: 'var(--border-radius)',
                          overflow: 'hidden',
                          backgroundColor: '#f9f9f9',
                          padding: '10px'
                        }}>
                          <img 
                            src={question.imageUrl} 
                            alt="Question context" 
                            style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x150?text=Invalid+Image+URL'; }}
                          />
                        </div>
                      </div>
                    )}

                    {/* MCQ Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                      {question.options.map((option, optIdx) => {
                        const isCorrect = option.id === question.correctOptionId;
                        return (
                          <div 
                            key={option.id} 
                            style={{
                              border: '2px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '16px',
                              backgroundColor: isCorrect ? 'var(--accent-green)' : '#fcfcfc',
                              boxShadow: isCorrect ? 'var(--box-shadow-sm)' : 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <span style={{
                                fontWeight: 900,
                                backgroundColor: isCorrect ? 'var(--text-color)' : '#e1e1e1',
                                color: isCorrect ? '#ffffff' : 'var(--text-color)',
                                border: '2px solid var(--border-color)',
                                width: '24px',
                                height: '24px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                flexShrink: 0
                              }}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span style={{ fontWeight: 700 }}>{option.text}</span>
                            </div>
                            
                            {/* Option image if present */}
                            {option.imageUrl && (
                              <div style={{ marginTop: '6px' }}>
                                <img 
                                  src={option.imageUrl} 
                                  alt={`Option ${String.fromCharCode(65 + optIdx)}`} 
                                  style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }}
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x80?text=Invalid+Image+URL'; }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL: ADD / EDIT EXAM OUTLINE ─────────────────────────────────── */}
      {examModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#ffffff', position: 'relative' }}>
            <button
              onClick={() => setExamModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '24px', fontSize: '1.4rem' }}>
              {examModalType === 'create' ? 'Create Exam Template' : 'Edit Exam Configuration'}
            </h2>

            {examFormError && (
              <div className="neo-card" style={{
                backgroundColor: 'var(--danger)', color: '#fff', padding: '12px', marginBottom: '20px',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--box-shadow-sm)'
              }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.9rem' }}>{examFormError}</span>
              </div>
            )}

            <form onSubmit={handleExamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Exam Title
                </label>
                <input
                  type="text"
                  value={formExamTitle}
                  onChange={(e) => setFormExamTitle(e.target.value)}
                  className="neo-input"
                  placeholder="e.g. React & State Management Basics"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Description / Instructions
                </label>
                <textarea
                  value={formExamDesc}
                  onChange={(e) => setFormExamDesc(e.target.value)}
                  className="neo-input"
                  placeholder="Brief exam synopsis or rules..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Subject / Topic
                </label>
                <select
                  value={formExamSubject}
                  onChange={(e) => setFormExamSubject(e.target.value)}
                  className="neo-select"
                >
                  <option value="">-- Select Subject (Optional) --</option>
                  <option value="Git and Github">Git and Github</option>
                  <option value="AI fundamentals">AI fundamentals</option>
                  <option value="Automation with N8N">Automation with N8N</option>
                  <option value="AI tools and Productivity">AI tools and Productivity</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    value={formExamDuration}
                    onChange={(e) => setFormExamDuration(Number(e.target.value))}
                    className="neo-input"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                    Max Points
                  </label>
                  <input
                    type="number"
                    value={formExamPoints}
                    onChange={(e) => setFormExamPoints(Number(e.target.value))}
                    className="neo-input"
                    min="1"
                    required
                  />
                </div>
              </div>

              {/* ── Scheduling ── */}
              <div style={{
                border: 'var(--border-width) solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                padding: '16px',
                background: 'var(--bg-color)',
              }}>
                <div style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem' }}>🗓️</span> Exam Schedule Window
                  <span style={{ fontWeight: 500, textTransform: 'none', fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>(optional — leave blank to keep always open)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.75rem' }}>
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formExamStartTime}
                      onChange={(e) => setFormExamStartTime(e.target.value)}
                      className="neo-input"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.75rem' }}>
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formExamEndTime}
                      onChange={(e) => setFormExamEndTime(e.target.value)}
                      className="neo-input"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
                {formExamStartTime && formExamEndTime && new Date(formExamEndTime) <= new Date(formExamStartTime) && (
                  <div style={{ marginTop: 10, color: 'var(--danger)', fontWeight: 700, fontSize: '0.82rem' }}>
                    ⚠ End time must be after start time.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="submit" disabled={examFormLoading} className="neo-btn" style={{ flex: 1 }}>
                  {examFormLoading ? 'Saving...' : examModalType === 'create' ? 'Create Exam' : 'Save Config'}
                </button>
                <button
                  type="button"
                  onClick={() => setExamModalOpen(false)}
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

      {/* ─── MODAL: ADD / EDIT QUESTION ─────────────────────────────────────── */}
      {questionModalOpen && activeExam && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{ 
            width: '95%', 
            maxWidth: '650px', 
            backgroundColor: '#ffffff', 
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setQuestionModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '20px', fontSize: '1.4rem' }}>
              {questionModalType === 'create' ? 'Add MCQ Question' : 'Edit Question Details'}
            </h2>

            {questionError && (
              <div className="neo-card" style={{
                backgroundColor: 'var(--danger)', color: '#fff', padding: '12px', marginBottom: '20px',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--box-shadow-sm)'
              }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.9rem' }}>{questionError}</span>
              </div>
            )}

            <form onSubmit={handleQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Question Text
                </label>
                <textarea
                  value={formQText}
                  onChange={(e) => setFormQText(e.target.value)}
                  className="neo-input"
                  placeholder="e.g. Which of the following hooks is used to perform side effects in React?"
                  required
                  style={{ minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                    Difficulty
                  </label>
                  <select
                    value={formQDifficulty}
                    onChange={(e) => setFormQDifficulty(e.target.value as any)}
                    className="neo-select"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                    Points / Score
                  </label>
                  <input
                    type="number"
                    value={formQPoints}
                    onChange={(e) => setFormQPoints(Number(e.target.value))}
                    className="neo-input"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                  Question Image (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, setFormQImage)}
                    className="neo-input"
                    style={{ padding: '6px' }}
                  />
                  {formQImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img src={formQImage} alt="Preview" style={{ height: '40px', width: 'auto', border: '1px solid #ddd', borderRadius: '4px' }} />
                      <button type="button" onClick={() => setFormQImage('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h4 style={{ textTransform: 'uppercase', fontWeight: 900, borderBottom: '2px solid #ddd', paddingBottom: '6px', marginTop: '10px' }}>
                MCQ Options (Exactly 4 choices)
              </h4>

              {/* Options inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Option A */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="correct-option" 
                    checked={correctOptionIndex === 0} 
                    onChange={() => setCorrectOptionIndex(0)}
                    style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={opt1Text}
                      onChange={(e) => setOpt1Text(e.target.value)}
                      className="neo-input"
                      placeholder="Option A Text"
                      required
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setOpt1Image)}
                        className="neo-input"
                        style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                      />
                      {opt1Image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img src={opt1Image} alt="Preview A" style={{ height: '30px', width: 'auto', border: '1px solid #ddd', borderRadius: '4px' }} />
                          <button type="button" onClick={() => setOpt1Image('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option B */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="correct-option" 
                    checked={correctOptionIndex === 1} 
                    onChange={() => setCorrectOptionIndex(1)}
                    style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={opt2Text}
                      onChange={(e) => setOpt2Text(e.target.value)}
                      className="neo-input"
                      placeholder="Option B Text"
                      required
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setOpt2Image)}
                        className="neo-input"
                        style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                      />
                      {opt2Image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img src={opt2Image} alt="Preview B" style={{ height: '30px', width: 'auto', border: '1px solid #ddd', borderRadius: '4px' }} />
                          <button type="button" onClick={() => setOpt2Image('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option C */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="correct-option" 
                    checked={correctOptionIndex === 2} 
                    onChange={() => setCorrectOptionIndex(2)}
                    style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={opt3Text}
                      onChange={(e) => setOpt3Text(e.target.value)}
                      className="neo-input"
                      placeholder="Option C Text"
                      required
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setOpt3Image)}
                        className="neo-input"
                        style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                      />
                      {opt3Image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img src={opt3Image} alt="Preview C" style={{ height: '30px', width: 'auto', border: '1px solid #ddd', borderRadius: '4px' }} />
                          <button type="button" onClick={() => setOpt3Image('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option D */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="radio" 
                    name="correct-option" 
                    checked={correctOptionIndex === 3} 
                    onChange={() => setCorrectOptionIndex(3)}
                    style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="text"
                      value={opt4Text}
                      onChange={(e) => setOpt4Text(e.target.value)}
                      className="neo-input"
                      placeholder="Option D Text"
                      required
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setOpt4Image)}
                        className="neo-input"
                        style={{ fontSize: '0.8rem', padding: '4px 8px', flex: 1 }}
                      />
                      {opt4Image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img src={opt4Image} alt="Preview D" style={{ height: '30px', width: 'auto', border: '1px solid #ddd', borderRadius: '4px' }} />
                          <button type="button" onClick={() => setOpt4Image('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                <button type="submit" className="neo-btn" style={{ flex: 1 }}>
                  Save Question
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
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

      {/* DELETE EXAM CONFIRMATION */}
      {deleteConfirmOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{ width: '90%', maxWidth: '450px', backgroundColor: '#ffffff', textAlign: 'center' }}>
            <Trash2 size={40} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '12px', fontSize: '1.3rem' }}>
              Delete Exam Template
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete exam <strong>{examToDelete?.title}</strong>? All MCQ questions inside will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button onClick={handleDeleteExamExecute} className="neo-btn neo-btn-danger" style={{ flex: 1 }}>
                Delete Exam
              </button>
              <button onClick={() => { setDeleteConfirmOpen(false); setExamToDelete(null); }} className="neo-btn neo-btn-secondary" style={{ flex: 1, backgroundColor: '#e1e1e1' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE QUESTION CONFIRMATION */}
      {deleteQuestionOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{ width: '90%', maxWidth: '450px', backgroundColor: '#ffffff', textAlign: 'center' }}>
            <Trash2 size={40} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '12px', fontSize: '1.3rem' }}>
              Delete Question
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to remove this question?
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button onClick={handleDeleteQuestionExecute} className="neo-btn neo-btn-danger" style={{ flex: 1 }}>
                Delete Question
              </button>
              <button onClick={() => { setDeleteQuestionOpen(false); setQuestionToDelete(null); }} className="neo-btn neo-btn-secondary" style={{ flex: 1, backgroundColor: '#e1e1e1' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
