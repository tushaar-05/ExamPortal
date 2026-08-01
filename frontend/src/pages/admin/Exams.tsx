import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
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
  HelpCircle,
  GraduationCap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Send,
  XCircle
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
  correctOptionId?: string | null;
  type?: 'MCQ' | 'SUBJECTIVE' | null;
  correctSubjectiveAnswer?: string | null;
  correctAnswerKeywords?: string | null;
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
  type?: 'MCQ' | 'SUBJECTIVE' | null;
  createdAt: string;
}

// ── FinalExam types ───────────────────────────────────────────────────────────
interface FinalExamOption {
  id: string;
  text: string;
  imageUrl?: string | null;
}

interface FinalExamQuestion {
  id: string;
  text: string;
  imageUrl?: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  type: 'MCQ' | 'SUBJECTIVE';
  options: FinalExamOption[];
  correctOptionId?: string | null;
  correctSubjectiveAnswer?: string | null;
  correctAnswerKeywords?: string | null;
}

interface FinalExamSubject {
  id: string;
  name: string;
  questions: FinalExamQuestion[];
}

interface FinalExam {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  syllabus?: string | null;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  gracePeriodSeconds: number;
  passPercentage?: number | null;
  subjects: FinalExamSubject[];
  createdAt: string;
}


const Exams: React.FC = () => {
  const { logout } = useAuth();
  
  // Exams list states
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Mode selection: 'LIST' or 'QUESTIONS' or 'SUBMISSIONS'
  const [currentView, setCurrentView] = useState<'LIST' | 'QUESTIONS' | 'SUBMISSIONS'>('LIST');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Submissions state
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  // Grading Modal states
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<any>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<string, string>>({});
  const [gradeSubmitLoading, setGradeSubmitLoading] = useState(false);
  const [gradeSubmitError, setGradeSubmitError] = useState<string | null>(null);

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
  const [formExamType, setFormExamType] = useState<'MCQ' | 'SUBJECTIVE'>('MCQ');
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
  const [formQType, setFormQType] = useState<'MCQ' | 'SUBJECTIVE'>('MCQ');
  const [formQCorrectSubjectiveAnswer, setFormQCorrectSubjectiveAnswer] = useState('');
  const [formQCorrectAnswerKeywords, setFormQCorrectAnswerKeywords] = useState('');
  
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

  // ── FinalExam state ──────────────────────────────────────────────────────────
  const [finalExam, setFinalExam] = useState<FinalExam | null>(null);
  const [finalExamLoading, setFinalExamLoading] = useState(true);
  const [finalExamModalOpen, setFinalExamModalOpen] = useState(false);
  const [finalExamModalType, setFinalExamModalType] = useState<'create' | 'edit'>('create');
  const [feTitle, setFeTitle] = useState('');
  const [feDesc, setFeDesc] = useState('');
  const [feInstructions, setFeInstructions] = useState('');
  const [feSyllabus, setFeSyllabus] = useState('');
  const [feStartTime, setFeStartTime] = useState('');
  const [feEndTime, setFeEndTime] = useState('');
  const [feGrace, setFeGrace] = useState(10);
  const [fePassPercentage, setFePassPercentage] = useState(40);
  const [feSubjects, setFeSubjects] = useState<FinalExamSubject[]>([]);
  const [feFormError, setFeFormError] = useState<string | null>(null);
  const [feFormLoading, setFeFormLoading] = useState(false);
  const [feDeleteConfirm, setFeDeleteConfirm] = useState(false);
  const [feSuccess, setFeSuccess] = useState<string | null>(null);
  // Subject question modal
  const [feQModalOpen, setFeQModalOpen] = useState(false);
  const [feQSubjectIdx, setFeQSubjectIdx] = useState(0);
  const [feQEditIdx, setFeQEditIdx] = useState<number | null>(null);
  const [feQText, setFeQText] = useState('');
  const [feQImage, setFeQImage] = useState('');
  const [feQDiff, setFeQDiff] = useState<'EASY'|'MEDIUM'|'HARD'>('MEDIUM');
  const [feQPoints, setFeQPoints] = useState(10);
  const [feQType, setFeQType] = useState<'MCQ'|'SUBJECTIVE'>('MCQ');
  const [feQOpts, setFeQOpts] = useState(['','','','']);
  const [feQOptImages, setFeQOptImages] = useState(['','','','']);
  const [feQCorrectIdx, setFeQCorrectIdx] = useState(0);
  const [feQSubjAnswer, setFeQSubjAnswer] = useState('');
  const [feQKeywords, setFeQKeywords] = useState('');
  const [feQError, setFeQError] = useState<string | null>(null);
  const [feExpandedSubjects, setFeExpandedSubjects] = useState<Record<number,boolean>>({});

  // Final Exam Submissions & Grading state
  const [feSubmissionsModalOpen, setFeSubmissionsModalOpen] = useState(false);
  const [feSubmissions, setFeSubmissions] = useState<any[]>([]);
  const [feSubmissionsLoading, setFeSubmissionsLoading] = useState(false);
  const [feGradingModalOpen, setFeGradingModalOpen] = useState(false);
  const [feActiveSubmission, setFeActiveSubmission] = useState<any | null>(null);
  const [feGradingScores, setFeGradingScores] = useState<Record<string, number>>({});
  const [feGradingFeedbacks, setFeGradingFeedbacks] = useState<Record<string, string>>({});
  const [feOverallFeedback, setFeOverallFeedback] = useState('');
  const [feGradingSubmitting, setFeGradingSubmitting] = useState(false);
  const [feGradingSubjectIdx, setFeGradingSubjectIdx] = useState(0);
  const [feSnapshots, setFeSnapshots] = useState<any[]>([]);
  const [feSnapshotsLoading, setFeSnapshotsLoading] = useState(false);
  const [feSnapshotLightbox, setFeSnapshotLightbox] = useState<string | null>(null);

  const toLocalDt = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchFinalExam = useCallback(async () => {
    setFinalExamLoading(true);
    try {
      const res = await apiFetch('/admin/final-exam', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setFinalExam(data.finalExams?.[0] ?? null);
    } catch { /* ignore */ } finally { setFinalExamLoading(false); }
  }, []);

  const handleOpenCreateFinalExam = () => {
    setFinalExamModalType('create');
    setFeTitle(''); setFeDesc(''); setFeInstructions(''); setFeSyllabus('');
    setFeStartTime(''); setFeEndTime(''); setFeGrace(10); setFePassPercentage(40);
    setFeSubjects([{ id: `subj_${Date.now()}`, name: 'Subject 1', questions: [] }]);
    setFeExpandedSubjects({ 0: true });
    setFeFormError(null);
    setFinalExamModalOpen(true);
  };

  const handleOpenEditFinalExam = (fe: FinalExam) => {
    setFinalExamModalType('edit');
    setFeTitle(fe.title); setFeDesc(fe.description || '');
    setFeInstructions(fe.instructions || ''); setFeSyllabus(fe.syllabus || '');
    setFeStartTime(toLocalDt(fe.startTime)); setFeEndTime(toLocalDt(fe.endTime));
    setFeGrace(fe.gracePeriodSeconds); setFePassPercentage(fe.passPercentage || 40);
    setFeSubjects(JSON.parse(JSON.stringify(fe.subjects)));
    setFeExpandedSubjects({});
    setFeFormError(null);
    setFinalExamModalOpen(true);
  };

  const handleFinalExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeFormError(null); setFeFormLoading(true);
    if (!feTitle.trim()) { setFeFormError('Title is required.'); setFeFormLoading(false); return; }
    if (!feStartTime || !feEndTime) { setFeFormError('Start and end times are required.'); setFeFormLoading(false); return; }
    const startDt = new Date(feStartTime);
    const endDt = new Date(feEndTime);
    if (endDt <= startDt) { setFeFormError('End time must be after start time.'); setFeFormLoading(false); return; }
    const durMins = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
    try {
      const url = finalExamModalType === 'create' ? '/admin/final-exam' : `/admin/final-exam/${finalExam?.id}`;
      const method = finalExamModalType === 'create' ? 'POST' : 'PUT';
      const res = await apiFetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ title: feTitle, description: feDesc, instructions: feInstructions,
          syllabus: feSyllabus, durationMinutes: durMins, startTime: startDt.toISOString(),
          endTime: endDt.toISOString(), gracePeriodSeconds: feGrace, passPercentage: fePassPercentage, subjects: feSubjects }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeSuccess(`Final exam ${finalExamModalType === 'create' ? 'created' : 'updated'} successfully!`);
        setFinalExamModalOpen(false);
        fetchFinalExam();
        setTimeout(() => setFeSuccess(null), 5000);
      } else { setFeFormError(data.errors?.join(' ') || data.message || 'Failed to save.'); }
    } catch { setFeFormError('Network error.'); } finally { setFeFormLoading(false); }
  };

  const handleDeleteFinalExam = async () => {
    if (!finalExam) return;
    try {
      const res = await apiFetch(`/admin/final-exam/${finalExam.id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setFeSuccess('Final exam deleted.');
        setFeDeleteConfirm(false);
        setFinalExam(null);
        setTimeout(() => setFeSuccess(null), 4000);
      }
    } catch { /* ignore */ }
  };

  const addFeSubject = () => setFeSubjects(prev => [...prev, { id: `subj_${Date.now()}`, name: `Subject ${prev.length + 1}`, questions: [] }]);
  const removeFeSubject = (idx: number) => setFeSubjects(prev => prev.filter((_, i) => i !== idx));
  const updateFeSubjectName = (idx: number, name: string) =>
    setFeSubjects(prev => prev.map((s, i) => i === idx ? { ...s, name } : s));

  const openAddFeQuestion = (sIdx: number) => {
    setFeQSubjectIdx(sIdx); setFeQEditIdx(null);
    setFeQText(''); setFeQImage(''); setFeQDiff('MEDIUM'); setFeQPoints(10); setFeQType('MCQ');
    setFeQOpts(['','','','']); setFeQOptImages(['','','','']); setFeQCorrectIdx(0); setFeQSubjAnswer(''); setFeQKeywords('');
    setFeQError(null); setFeQModalOpen(true);
  };

  const openEditFeQuestion = (sIdx: number, qIdx: number) => {
    const q = feSubjects[sIdx].questions[qIdx];
    setFeQSubjectIdx(sIdx); setFeQEditIdx(qIdx);
    setFeQText(q.text); setFeQImage(q.imageUrl || ''); setFeQDiff(q.difficulty); setFeQPoints(q.points); setFeQType(q.type);
    const optTexts = q.options.length >= 4 ? q.options.map(o => o.text) : ['','','',''];
    const optImgs = q.options.length >= 4 ? q.options.map(o => o.imageUrl || '') : ['','','',''];
    setFeQOpts(optTexts); setFeQOptImages(optImgs);
    setFeQCorrectIdx(Math.max(0, q.options.findIndex(o => o.id === q.correctOptionId)));
    setFeQSubjAnswer(q.correctSubjectiveAnswer || '');
    setFeQKeywords(q.correctAnswerKeywords || '');
    setFeQError(null); setFeQModalOpen(true);
  };

  const saveFeQuestion = () => {
    if (!feQText.trim()) { setFeQError('Question text is required.'); return; }
    if (feQType === 'MCQ' && feQOpts.some(o => !o.trim())) { setFeQError('All 4 options are required for MCQ.'); return; }
    const options: FinalExamOption[] = feQType === 'MCQ'
      ? feQOpts.map((t, i) => ({ id: `opt${i+1}`, text: t, imageUrl: feQOptImages[i].trim() !== '' ? feQOptImages[i] : null }))
      : [];
    const q: FinalExamQuestion = {
      id: feQEditIdx !== null ? feSubjects[feQSubjectIdx].questions[feQEditIdx].id : `fq_${Date.now()}`,
      text: feQText, imageUrl: feQImage.trim() !== '' ? feQImage : null, difficulty: feQDiff, points: feQPoints, type: feQType, options,
      correctOptionId: feQType === 'MCQ' ? options[feQCorrectIdx].id : null,
      correctSubjectiveAnswer: feQType === 'SUBJECTIVE' ? feQSubjAnswer : null,
      correctAnswerKeywords: feQType === 'SUBJECTIVE' ? feQKeywords : null,
    };
    setFeSubjects(prev => prev.map((s, i) => {
      if (i !== feQSubjectIdx) return s;
      const qs = feQEditIdx !== null
        ? s.questions.map((qq, qi) => qi === feQEditIdx ? q : qq)
        : [...s.questions, q];
      return { ...s, questions: qs };
    }));
    setFeQModalOpen(false);
  };

  const deleteFeQuestion = (sIdx: number, qIdx: number) =>
    setFeSubjects(prev => prev.map((s, i) =>
      i === sIdx ? { ...s, questions: s.questions.filter((_, qi) => qi !== qIdx) } : s));

  // ── Final Exam Submissions & Grading ────────────────────────────────────────
  const handleViewFeSubmissions = async (feId: string) => {
    setFeSubmissionsLoading(true);
    setFeSubmissionsModalOpen(true);
    try {
      const res = await apiFetch(`/admin/final-exam/${feId}/submissions`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setFeSubmissions(data.submissions || []);
    } catch {
      setError('Failed to load final exam submissions.');
    } finally {
      setFeSubmissionsLoading(false);
    }
  };

  const handleOpenFeGradingModal = async (sub: any) => {
    setFeActiveSubmission(sub);
    const scores: Record<string, number> = {};
    const feedbacks: Record<string, string> = {};

    sub.answers?.forEach((ans: any) => {
      const key = `${ans.subjectId}__${ans.questionId}`;
      scores[key] = ans.pointsEarned ?? 0;
      feedbacks[key] = ans.feedback || '';
    });

    setFeGradingScores(scores);
    setFeGradingFeedbacks(feedbacks);
    setFeOverallFeedback(sub.overallFeedback || '');
    setFeGradingSubjectIdx(0);
    setFeSnapshotLightbox(null);
    setFeGradingModalOpen(true);

    // Fetch proctoring snapshots for this student
    const examId = finalExam?.id || sub.finalExamId;
    const studentUserId = sub.userId || sub.user?.id;
    if (examId && studentUserId) {
      setFeSnapshotsLoading(true);
      setFeSnapshots([]);
      try {
        const res = await apiFetch(`/admin/final-exam/${examId}/snapshots?userId=${studentUserId}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setFeSnapshots(data.snapshots || []);
        } else {
          console.warn('Snapshot fetch failed:', data.message);
        }
      } catch (err) {
        console.warn('Snapshot fetch error:', err);
      } finally {
        setFeSnapshotsLoading(false);
      }
    } else {
      console.warn('Missing examId or userId for snapshot fetch', { examId, studentUserId, sub });
    }
  };

  const handleFeGradeSubmit = async (isPublishing: boolean) => {
    if (!feActiveSubmission) return;
    setFeGradingSubmitting(true);

    const answersPayload = Object.keys(feGradingScores).map(key => {
      const [subjectId, questionId] = key.split('__');
      return {
        subjectId,
        questionId,
        pointsEarned: Number(feGradingScores[key]),
        feedback: feGradingFeedbacks[key] || null,
      };
    });

    try {
      const res = await apiFetch(`/admin/final-exam/submissions/${feActiveSubmission.id}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersPayload,
          overallFeedback: feOverallFeedback,
          isPublished: isPublishing ? true : feActiveSubmission.isPublished,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok) {
        setFeSuccess(`Submission successfully ${isPublishing ? 'graded and published' : 'saved'}`);
        setFeGradingModalOpen(false);
        if (finalExam) handleViewFeSubmissions(finalExam.id);
        setTimeout(() => setFeSuccess(null), 4000);
      } else {
        alert(data.message || 'Failed to save grade.');
      }
    } catch {
      alert('Network error while grading.');
    } finally {
      setFeGradingSubmitting(false);
    }
  };

  const handlePublishAllFeResults = async () => {
    if (!finalExam) return;
    try {
      const res = await apiFetch(`/admin/final-exam/${finalExam.id}/publish`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        setFeSuccess('All graded final exam results published!');
        handleViewFeSubmissions(finalExam.id);
        setTimeout(() => setFeSuccess(null), 4000);
      }
    } catch { /* ignore */ }
  };

  const fetchExams = async () => {
    setLoading(true);
    setError(null);
    fetchFinalExam();
    try {
      const response = await apiFetch('/admin/exams', {
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
      const response = await apiFetch(`/admin/exams/${examId}`, {
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
    fetchFinalExam();
  }, [fetchFinalExam]);

  const handleViewSubmissions = async (exam: Exam) => {
    const success = await fetchExamDetails(exam.id);
    if (!success) {
      setError('Failed to load exam details');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setCurrentView('SUBMISSIONS');
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    setSubmissions([]);
    try {
      const response = await apiFetch(`/admin/exams/${exam.id}/submissions`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        setSubmissions(data.submissions || []);
      } else {
        setSubmissionsError(data.message || 'Failed to fetch exam submissions.');
      }
    } catch (err) {
      console.error('Fetch submissions error:', err);
      setSubmissionsError('Network error: Could not reach the API.');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleOpenGradingModal = (submission: any) => {
    setActiveSubmission(submission);
    const scores: Record<string, number> = {};
    const feedbacks: Record<string, string> = {};
    submission.answers.forEach((ans: any) => {
      // For MCQ answers where pointsEarned was never set (null), calculate from correctOptionId
      if (ans.pointsEarned !== null && ans.pointsEarned !== undefined) {
        scores[ans.questionId] = ans.pointsEarned;
      } else {
        const question = activeExam?.questions?.find((q: any) => q.id === ans.questionId);
        if (question && question.type !== 'SUBJECTIVE') {
          // Auto-calculate MCQ score
          scores[ans.questionId] = ans.optionId === question.correctOptionId ? question.points : 0;
        } else {
          scores[ans.questionId] = 0;
        }
      }
      feedbacks[ans.questionId] = ans.feedback || '';
    });
    setGradingScores(scores);
    setGradingFeedbacks(feedbacks);
    setGradeSubmitError(null);
    setGradingModalOpen(true);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGradeSubmitLoading(true);
    setGradeSubmitError(null);

    const answersPayload = Object.keys(gradingScores).map(qId => ({
      questionId: qId,
      pointsEarned: gradingScores[qId],
      feedback: gradingFeedbacks[qId] || null,
    }));

    try {
      const response = await apiFetch(`/admin/submissions/${activeSubmission.id}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: answersPayload }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Submission graded successfully!');
        setGradingModalOpen(false);
        if (activeExam) {
          handleViewSubmissions(activeExam);
        }
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setGradeSubmitError(data.message || 'Failed to submit grade.');
      }
    } catch (err) {
      console.error('Submit grade error:', err);
      setGradeSubmitError('Network error: Could not reach the API.');
    } finally {
      setGradeSubmitLoading(false);
    }
  };

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
    setFormExamType('MCQ');
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
    setFormExamType(exam.type || 'MCQ');
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
        ? '/admin/exams'
        : `/admin/exams/${activeExam?.id || exams.find(ex => ex.title === formExamTitle)?.id}`;
      
      const method = examModalType === 'create' ? 'POST' : 'PUT';

      const requestBody: any = {
        title: formExamTitle,
        description: formExamDesc,
        durationMinutes: Number(formExamDuration),
        totalPoints: Number(formExamPoints),
        startTime: formExamStartTime ? new Date(formExamStartTime).toISOString() : null,
        endTime: formExamEndTime ? new Date(formExamEndTime).toISOString() : null,
        subject: formExamSubject || null,
        type: formExamType,
      };

      const response = await apiFetch(url, {
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
      const response = await apiFetch(`/admin/exams/${examToDelete.id}`, {
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
    setFormQType(activeExam?.type === 'SUBJECTIVE' ? 'SUBJECTIVE' : 'MCQ');
    setFormQCorrectSubjectiveAnswer('');
    setFormQCorrectAnswerKeywords('');
    
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
    setFormQType(activeExam?.type === 'SUBJECTIVE' ? 'SUBJECTIVE' : (question.type || 'MCQ'));
    setFormQCorrectSubjectiveAnswer(question.correctSubjectiveAnswer || '');
    setFormQCorrectAnswerKeywords(question.correctAnswerKeywords || '');

    // Setup options text/images
    if (question.options[0]) {
      setOpt1Text(question.options[0].text);
      setOpt1Image(question.options[0].imageUrl || '');
    } else {
      setOpt1Text('');
      setOpt1Image('');
    }
    if (question.options[1]) {
      setOpt2Text(question.options[1].text);
      setOpt2Image(question.options[1].imageUrl || '');
    } else {
      setOpt2Text('');
      setOpt2Image('');
    }
    if (question.options[2]) {
      setOpt3Text(question.options[2].text);
      setOpt3Image(question.options[2].imageUrl || '');
    } else {
      setOpt3Text('');
      setOpt3Image('');
    }
    if (question.options[3]) {
      setOpt4Text(question.options[3].text);
      setOpt4Image(question.options[3].imageUrl || '');
    } else {
      setOpt4Text('');
      setOpt4Image('');
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

    if (formQType === 'MCQ') {
      if (!opt1Text.trim() || !opt2Text.trim() || !opt3Text.trim() || !opt4Text.trim()) {
        setQuestionError('All 4 option text values must be filled for an MCQ question.');
        return;
      }
    }

    if (!activeExam) return;

    // Build options list
    const options: Option[] = formQType === 'MCQ' ? [
      { id: 'opt1', text: opt1Text, imageUrl: opt1Image.trim() !== '' ? opt1Image : null },
      { id: 'opt2', text: opt2Text, imageUrl: opt2Image.trim() !== '' ? opt2Image : null },
      { id: 'opt3', text: opt3Text, imageUrl: opt3Image.trim() !== '' ? opt3Image : null },
      { id: 'opt4', text: opt4Text, imageUrl: opt4Image.trim() !== '' ? opt4Image : null },
    ] : [];

    const correctOptionId = formQType === 'MCQ' ? options[correctOptionIndex].id : null;

    // Create question item
    const newQuestion: Question = {
      id: questionModalType === 'create' ? `q_${Date.now()}` : (selectedQuestion?.id || `q_${Date.now()}`),
      text: formQText,
      imageUrl: formQImage.trim() !== '' ? formQImage : null,
      difficulty: formQDifficulty,
      points: Number(formQPoints),
      type: formQType,
      options,
      correctOptionId,
      correctSubjectiveAnswer: formQType === 'SUBJECTIVE' ? formQCorrectSubjectiveAnswer : null,
      correctAnswerKeywords: formQType === 'SUBJECTIVE' ? formQCorrectAnswerKeywords : null,
    };

    // Calculate updated questions list
    const updatedQuestions: Question[] = questionModalType === 'create'
      ? [...activeExam.questions, newQuestion]
      : activeExam.questions.map(q => q.id === selectedQuestion?.id ? newQuestion : q);

    // Call API to save questions
    try {
      const response = await apiFetch(`/admin/exams/${activeExam.id}`, {
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
      const response = await apiFetch(`/admin/exams/${activeExam.id}`, {
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

const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setUrl: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('image', compressedFile);

      const response = await apiFetch('/upload', {
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

            {/* ── FINAL EXAM PANEL ─────────────────────────────────────────────── */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 10, border: '2px solid #1a1a1a', display: 'inline-flex' }}>
                    <GraduationCap size={22} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase' }}>Final Examination</h2>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Multi-subject final exam · Fixed start time · Full proctoring</p>
                  </div>
                </div>
                {!finalExam && !finalExamLoading && (
                  <button onClick={handleOpenCreateFinalExam} className="neo-btn" style={{ padding: '8px 16px' }}>
                    <Plus size={16} /> Create Final Exam
                  </button>
                )}
              </div>

              {feSuccess && (
                <div className="neo-card" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-color)', marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} /><span>{feSuccess}</span>
                </div>
              )}

              {finalExamLoading ? (
                <div className="neo-card" style={{ backgroundColor: '#fff', textAlign: 'center', padding: '28px 20px' }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>Loading final exam data…</p>
                </div>
              ) : finalExam ? (() => {
                const now = new Date();
                const start = new Date(finalExam.startTime);
                const end = new Date(finalExam.endTime);
                const feStatus = now < start ? 'UPCOMING' : now <= end ? 'LIVE' : 'ENDED';
                const totalQs = finalExam.subjects.reduce((s: number, sub: FinalExamSubject) => s + sub.questions.length, 0);
                return (
                  <div className="neo-card" style={{ backgroundColor: '#fff', borderLeft: '8px solid #1a1a1a', padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{
                            background: feStatus === 'LIVE' ? '#dcfce7' : feStatus === 'UPCOMING' ? '#dbeafe' : '#f3f4f6',
                            color: feStatus === 'LIVE' ? '#166534' : feStatus === 'UPCOMING' ? '#1e40af' : '#374151',
                            border: `1.5px solid ${feStatus === 'LIVE' ? '#166534' : feStatus === 'UPCOMING' ? '#1e40af' : '#9ca3af'}`,
                            borderRadius: 6, padding: '3px 10px', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase' as const
                          }}>
                            {feStatus === 'LIVE' ? '🟢 Live Now' : feStatus === 'UPCOMING' ? '🗓 Upcoming' : '⏰ Ended'}
                          </span>
                          <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>{finalExam.title}</span>
                        </div>
                        {finalExam.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 12 }}>{finalExam.description}</p>}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.82rem', fontWeight: 700 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f3f4f6', padding: '4px 10px', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                            <Clock size={13} /> {finalExam.durationMinutes} mins
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f3f4f6', padding: '4px 10px', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                            <BookOpen size={13} /> {finalExam.subjects.length} subjects · {totalQs} questions
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f3f4f6', padding: '4px 10px', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                            <Calendar size={13} /> {start.toLocaleString()} → {end.toLocaleString()}
                          </span>
                        </div>
                        {finalExam.subjects.length > 0 && (
                          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {finalExam.subjects.map((s: FinalExamSubject) => (
                              <span key={s.id} style={{ background: 'var(--primary)', border: '2px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', fontWeight: 800, fontSize: '0.82rem' }}>
                                {s.name} · {s.questions.length} Qs
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => handleViewFeSubmissions(finalExam.id)} className="neo-btn neo-btn-secondary" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                          <Users size={14} /> Submissions & Grading
                        </button>
                        <button onClick={() => handleOpenEditFinalExam(finalExam)} className="neo-btn neo-btn-accent" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                          <Edit size={14} /> Edit
                        </button>
                        <button onClick={() => setFeDeleteConfirm(true)} className="neo-btn neo-btn-danger" style={{ padding: '7px 14px', fontSize: '0.85rem' }}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="neo-card" style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fafafa', border: '2px dashed var(--border-color)' }}>
                  <GraduationCap size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                  <h3 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>No Final Exam Configured</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Create a final examination with multiple subjects and fixed timing.</p>
                  <button onClick={handleOpenCreateFinalExam} className="neo-btn" style={{ padding: '8px 20px' }}>
                    <Plus size={16} /> Create Final Exam
                  </button>
                </div>
              )}
            </div>

            {/* Delete FinalExam confirm */}
            {feDeleteConfirm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="neo-card" style={{ width: 420, background: '#fff', padding: 32 }}>
                  <h3 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: 12 }}>Delete Final Exam?</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>This will permanently delete the final exam and all student data. Cannot be undone.</p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button onClick={() => setFeDeleteConfirm(false)} className="neo-btn neo-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                    <button onClick={handleDeleteFinalExam} className="neo-btn neo-btn-danger" style={{ padding: '8px 16px' }}>Delete</button>
                  </div>
                </div>
              </div>
            )}

            {/* FinalExam create/edit modal */}
            {finalExamModalOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '36px 20px' }}>
                <div className="neo-card" style={{ width: '100%', maxWidth: 900, background: '#fff', padding: 36 }}>
                  {/* Modal Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '2px solid var(--border-color)', paddingBottom: 16 }}>
                    <div>
                      <span style={{ background: 'var(--primary)', color: '#1a1a1a', padding: '3px 10px', borderRadius: 4, fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        Final Examination Management
                      </span>
                      <h2 style={{ margin: '4px 0 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.5rem' }}>
                        {finalExamModalType === 'create' ? 'Create Final Examination' : 'Configure Final Examination'}
                      </h2>
                    </div>
                    <button onClick={() => setFinalExamModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '6px 10px', boxShadow: 'none' }}><X size={18} /></button>
                  </div>

                  {feFormError && (
                    <div style={{ background: 'var(--danger)', color: '#fff', padding: '12px 18px', borderRadius: 6, marginBottom: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertCircle size={18} /> <span>{feFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleFinalExamSubmit}>
                    
                    {/* SECTION 1: General Details */}
                    <div style={{ background: '#fdfdfd', border: '2px solid var(--border-color)', borderRadius: 10, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GraduationCap size={18} color="var(--primary)" /> 1. General Details & Pass Criteria
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Exam Title *</label>
                          <input
                            value={feTitle}
                            onChange={e => setFeTitle(e.target.value)}
                            className="neo-input"
                            placeholder="e.g. Annual Final Examination 2026"
                            style={{ width: '100%', fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Pass Percentage (%)</label>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={fePassPercentage}
                            onChange={e => setFePassPercentage(Number(e.target.value))}
                            className="neo-input"
                            placeholder="40"
                            style={{ width: '100%', fontWeight: 700 }}
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Exam Summary / Overview</label>
                          <textarea
                            value={feDesc}
                            onChange={e => setFeDesc(e.target.value)}
                            className="neo-input"
                            rows={2}
                            placeholder="Provide a brief summary of the examination..."
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Fixed Exam Schedule */}
                    <div style={{ background: '#fdfdfd', border: '2px solid var(--border-color)', borderRadius: 10, padding: 24, marginBottom: 24 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={18} color="var(--primary)" /> 2. Schedule & Proctoring Rules
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Fixed Start Time *</label>
                          <input
                            type="datetime-local"
                            value={feStartTime}
                            onChange={e => setFeStartTime(e.target.value)}
                            className="neo-input"
                            style={{ width: '100%', fontWeight: 700 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Fixed End Time *</label>
                          <input
                            type="datetime-local"
                            value={feEndTime}
                            onChange={e => setFeEndTime(e.target.value)}
                            className="neo-input"
                            style={{ width: '100%', fontWeight: 700 }}
                          />
                        </div>
                      </div>

                      {feStartTime && feEndTime && (
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534', textTransform: 'uppercase' }}>
                            Calculated Exam Window
                          </span>
                          <span style={{ background: '#166534', color: '#fff', padding: '3px 10px', borderRadius: 4, fontWeight: 900, fontSize: '0.82rem' }}>
                            {(() => {
                              const diffMins = Math.max(0, Math.round((new Date(feEndTime).getTime() - new Date(feStartTime).getTime()) / 60000));
                              const hrs = Math.floor(diffMins / 60);
                              const mins = diffMins % 60;
                              return `${hrs > 0 ? `${hrs}h ` : ''}${mins} Minutes`;
                            })()}
                          </span>
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', margin: 0 }}>
                            Fullscreen Grace Period
                          </label>
                          <span style={{ background: 'var(--primary)', color: '#1a1a1a', padding: '2px 8px', borderRadius: 4, fontWeight: 900, fontSize: '0.8rem' }}>
                            {feGrace} Seconds
                          </span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          value={feGrace}
                          onChange={e => setFeGrace(Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                          Grace countdown given to students when tab focus or fullscreen is temporarily interrupted before a proctoring violation is logged.
                        </p>
                      </div>
                    </div>

                    {/* SECTION 3: Instructions & Syllabus */}
                    <div style={{ background: '#fdfdfd', border: '2px solid var(--border-color)', borderRadius: 10, padding: 24, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileText size={18} color="var(--primary)" /> 3. Guidelines & Syllabus
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFeInstructions(`1. Continuous webcam and microphone monitoring is enforced.
2. Full Screen mode is strictly mandatory throughout the exam duration.
3. Exiting full screen will trigger a 10-second grace countdown timer.
4. You are allowed a maximum of 3 proctoring violation chances. Exceeding 3 chances will automatically submit your exam.
5. All subjects must be completed within the combined fixed duration.`);
                          }}
                          className="neo-btn neo-btn-accent"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          ✦ Insert Standard Instructions Template
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Exam Instructions</label>
                          <textarea
                            value={feInstructions}
                            onChange={e => setFeInstructions(e.target.value)}
                            className="neo-input"
                            rows={5}
                            placeholder="Rules and instructions displayed in waiting room..."
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Syllabus / Outline</label>
                          <textarea
                            value={feSyllabus}
                            onChange={e => setFeSyllabus(e.target.value)}
                            className="neo-input"
                            rows={5}
                            placeholder="Detailed syllabus topics covered in this exam..."
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 4: Multi-Subject & Question Builder */}
                    <div style={{ borderTop: '3px solid var(--border-color)', paddingTop: 24, marginBottom: 28 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                          <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase' }}>4. Subject & Question Modules</h3>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Total Exam Marks: <strong>
                              {feSubjects.reduce((tot, s) => tot + s.questions.reduce((qTot, q) => qTot + (q.points || 0), 0), 0)} Points
                            </strong>
                          </p>
                        </div>
                        <button type="button" onClick={addFeSubject} className="neo-btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                          <Plus size={16} /> Add Subject
                        </button>
                      </div>

                      {feSubjects.map((subject, sIdx) => {
                        const subjMarks = subject.questions.reduce((tot, q) => tot + (q.points || 0), 0);
                        return (
                          <div key={subject.id} style={{ border: '2px solid var(--border-color)', borderRadius: 10, marginBottom: 16, overflow: 'hidden', background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f9fafb', borderBottom: feExpandedSubjects[sIdx] ? '2px solid var(--border-color)' : 'none' }}>
                              <input
                                value={subject.name}
                                onChange={e => updateFeSubjectName(sIdx, e.target.value)}
                                className="neo-input"
                                placeholder="Subject Name (e.g. Physics)"
                                style={{ flex: 1, padding: '8px 12px', fontSize: '0.95rem', fontWeight: 800 }}
                              />
                              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 4, fontWeight: 800, fontSize: '0.78rem' }}>
                                {subject.questions.length} Qs · {subjMarks} pts
                              </span>
                              <button
                                type="button"
                                onClick={() => setFeExpandedSubjects(p => ({ ...p, [sIdx]: !p[sIdx] }))}
                                className="neo-btn neo-btn-secondary"
                                style={{ padding: '6px 12px', boxShadow: 'none' }}
                              >
                                {feExpandedSubjects[sIdx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              {feSubjects.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFeSubject(sIdx)}
                                  className="neo-btn neo-btn-danger"
                                  style={{ padding: '6px 12px', boxShadow: 'none' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>

                            {feExpandedSubjects[sIdx] && (
                              <div style={{ padding: 20 }}>
                                {subject.questions.length === 0 ? (
                                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                                    No questions added to {subject.name} yet. Click below to add MCQs or Subjective questions.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                    {subject.questions.map((q, qIdx) => (
                                      <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', border: '1.5px solid var(--border-color)', borderRadius: 8 }}>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ background: q.type === 'MCQ' ? '#dbeafe' : '#fef3c7', color: q.type === 'MCQ' ? '#1e40af' : '#92400e', padding: '2px 6px', borderRadius: 4, fontWeight: 900, fontSize: '0.7rem' }}>
                                            {q.type}
                                          </span>
                                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a' }}>
                                            {q.text.slice(0, 75)}{q.text.length > 75 ? '…' : ''}
                                          </span>
                                          {q.imageUrl && <span style={{ fontSize: '0.72rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>🖼 Image</span>}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                          <span style={{ fontWeight: 900, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            {q.points} pts
                                          </span>
                                          <button type="button" onClick={() => openEditFeQuestion(sIdx, qIdx)} className="neo-btn neo-btn-accent" style={{ padding: '4px 10px', fontSize: '0.78rem', boxShadow: 'none' }}>
                                            <Edit size={12} />
                                          </button>
                                          <button type="button" onClick={() => deleteFeQuestion(sIdx, qIdx)} className="neo-btn neo-btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem', boxShadow: 'none' }}>
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openAddFeQuestion(sIdx)}
                                  className="neo-btn"
                                  style={{ width: '100%', padding: '10px', fontSize: '0.88rem', justifyContent: 'center' }}
                                >
                                  <Plus size={16} /> Add Question to {subject.name}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <button type="button" onClick={() => setFinalExamModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                      <button type="submit" disabled={feFormLoading} className="neo-btn" style={{ padding: '10px 28px' }}>
                        {feFormLoading ? 'Saving…' : finalExamModalType === 'create' ? 'Create Final Examination' : 'Save Final Exam Configuration'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* FinalExam question add/edit modal */}
            {feQModalOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div className="neo-card" style={{ width: '100%', maxWidth: 560, background: '#fff', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase' }}>{feQEditIdx !== null ? 'Edit' : 'Add'} Question</h3>
                    <button onClick={() => setFeQModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '5px 9px', boxShadow: 'none' }}><X size={16} /></button>
                  </div>
                  {feQError && <div style={{ background: 'var(--danger)', color: '#fff', padding: '8px 14px', borderRadius: 6, marginBottom: 16, fontWeight: 700 }}>{feQError}</div>}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Question Text *</label>
                    <textarea value={feQText} onChange={e => setFeQText(e.target.value)} className="neo-input" rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Enter question…" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Question Image (Optional)</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, setFeQImage)} style={{ fontSize: '0.8rem' }} />
                      {feQImage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <img src={feQImage} alt="Question diagram" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />
                          <button type="button" onClick={() => setFeQImage('')} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Type</label>
                      <select value={feQType} onChange={e => setFeQType(e.target.value as 'MCQ'|'SUBJECTIVE')} className="neo-input" style={{ width: '100%' }}>
                        <option value="MCQ">MCQ</option>
                        <option value="SUBJECTIVE">Subjective</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Difficulty</label>
                      <select value={feQDiff} onChange={e => setFeQDiff(e.target.value as 'EASY'|'MEDIUM'|'HARD')} className="neo-input" style={{ width: '100%' }}>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Points</label>
                      <input type="number" value={feQPoints} onChange={e => setFeQPoints(Number(e.target.value))} className="neo-input" style={{ width: '100%' }} min={1} />
                    </div>
                  </div>
                  {feQType === 'MCQ' ? (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Options (select correct one & upload images if needed)</label>
                      {feQOpts.map((opt, i) => (
                        <div key={i} style={{ marginBottom: 10, background: '#f9fafb', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input type="radio" name="feCorrect" checked={feQCorrectIdx === i} onChange={() => setFeQCorrectIdx(i)} />
                            <input value={opt} onChange={e => setFeQOpts(p => p.map((o, oi) => oi === i ? e.target.value : o))}
                              className="neo-input" placeholder={`Option ${String.fromCharCode(65+i)}`} style={{ flex: 1 }} />
                            <input type="file" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const compressed = await compressImage(file);
                              const formData = new FormData();
                              formData.append('image', compressed);
                              const res = await apiFetch('/upload', { method: 'POST', body: formData, credentials: 'include' });
                              const d = await res.json();
                              if (res.ok) setFeQOptImages(prev => prev.map((img, idx) => idx === i ? d.url : img));
                            }} style={{ fontSize: '0.72rem', width: 140 }} />
                          </div>
                          {feQOptImages[i] && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginLeft: 28 }}>
                              <img src={feQOptImages[i]} alt={`Option ${i+1}`} style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />
                              <button type="button" onClick={() => setFeQOptImages(prev => prev.map((img, idx) => idx === i ? '' : img))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 900 }}>✕</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Model Answer</label>
                      <textarea value={feQSubjAnswer} onChange={e => setFeQSubjAnswer(e.target.value)} className="neo-input" rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="Expected answer…" />
                      <label style={{ fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase', display: 'block', margin: '10px 0 6px' }}>Keywords (comma-separated)</label>
                      <input value={feQKeywords} onChange={e => setFeQKeywords(e.target.value)} className="neo-input" style={{ width: '100%' }} placeholder="e.g. photosynthesis, chlorophyll" />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={() => setFeQModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                    <button type="button" onClick={saveFeQuestion} className="neo-btn" style={{ padding: '8px 20px' }}>Save Question</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── FINAL EXAM SUBMISSIONS LIST MODAL ──────────────────────────── */}
            {feSubmissionsModalOpen && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div className="neo-card" style={{ width: '100%', maxWidth: 900, background: '#fff', padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid var(--border-color)', paddingBottom: 16 }}>
                    <div>
                      <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.4rem' }}>Final Exam Submissions</h2>
                      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{finalExam?.title}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={handlePublishAllFeResults} className="neo-btn neo-btn-accent" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                        <Send size={14} /> Publish All Results
                      </button>
                      <button onClick={() => setFeSubmissionsModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '5px 9px', boxShadow: 'none' }}><X size={16} /></button>
                    </div>
                  </div>

                  {feSubmissionsLoading ? (
                    <div style={{ textAlign: 'center', padding: 40, fontWeight: 700 }}>Loading student submissions…</div>
                  ) : feSubmissions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No submissions found for this exam yet.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--primary)', borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Student</th>
                          <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Date</th>
                          <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Score</th>
                          <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Evaluation Status</th>
                          <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>Result Visibility</th>
                          <th style={{ padding: '12px 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feSubmissions.map((sub: any) => (
                          <tr key={sub.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                              <div>{sub.userName || 'Student'}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>{sub.userEmail}</div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.82rem' }}>{new Date(sub.createdAt).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 900 }}>{sub.score} / {sub.totalPoints}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                background: sub.graded ? '#dcfce7' : '#fef3c7',
                                color: sub.graded ? '#166534' : '#92400e',
                                padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase'
                              }}>
                                {sub.graded ? '✓ Graded' : '⏳ Pending Review'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                background: sub.isPublished ? '#dbeafe' : '#f3f4f6',
                                color: sub.isPublished ? '#1e40af' : '#4b5563',
                                padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase'
                              }}>
                                {sub.isPublished ? 'Published' : 'Hidden (Pending)'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button onClick={() => handleOpenFeGradingModal(sub)} className="neo-btn" style={{ padding: '5px 12px', fontSize: '0.78rem', boxShadow: 'none' }}>
                                Grade / Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ── FINAL EXAM EVALUATION & GRADING MODAL ───────────────────────── */}
            {feGradingModalOpen && feActiveSubmission && finalExam && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <div className="neo-card" style={{ width: '100%', maxWidth: 960, background: '#fff', padding: 32, maxHeight: '92vh', overflowY: 'auto' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid var(--border-color)', paddingBottom: 16 }}>
                    <div>
                      <span style={{ background: 'var(--primary)', color: '#1a1a1a', padding: '2px 8px', borderRadius: 4, fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        Submission Evaluation
                      </span>
                      <h2 style={{ margin: '4px 0 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.4rem' }}>
                        {feActiveSubmission.userName || 'Student'}
                      </h2>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{feActiveSubmission.userEmail}</p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ background: '#f3f4f6', padding: '6px 14px', borderRadius: 6, fontWeight: 900, fontSize: '0.9rem' }}>
                        Calculated Score: <span style={{ color: 'var(--primary)' }}>
                          {Object.values(feGradingScores).reduce((a, b) => a + Number(b || 0), 0)} / {feActiveSubmission.totalPoints}
                        </span>
                      </div>
                      <button onClick={() => setFeGradingModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '6px 10px', boxShadow: 'none' }}><X size={18} /></button>
                    </div>
                  </div>

                  {/* Subject Tabs */}
                  <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid var(--border-color)', marginBottom: 20 }}>
                    {finalExam.subjects.map((subj: FinalExamSubject, sIdx: number) => (
                      <button
                        key={subj.id}
                        onClick={() => setFeGradingSubjectIdx(sIdx)}
                        style={{
                          padding: '8px 16px',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          border: 'none',
                          borderBottom: feGradingSubjectIdx === sIdx ? '4px solid var(--primary)' : '4px solid transparent',
                          background: feGradingSubjectIdx === sIdx ? '#f9fafb' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        {subj.name} ({subj.questions.length} Qs)
                      </button>
                    ))}
                  </div>

                  {/* Subject Questions list */}
                  {(() => {
                    const currentSubj = finalExam.subjects[feGradingSubjectIdx];
                    if (!currentSubj) return null;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                        {currentSubj.questions.map((q: FinalExamQuestion, qIdx: number) => {
                          const key = `${currentSubj.id}__${q.id}`;
                          const origAns = feActiveSubmission.answers?.find((a: any) => a.questionId === q.id && a.subjectId === currentSubj.id);
                          const isMcq = q.type === 'MCQ';

                          return (
                            <div key={q.id} style={{ border: '2px solid var(--border-color)', borderRadius: 8, padding: 20, background: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontWeight: 900, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                  Question {qIdx + 1} [{q.type}] ({q.difficulty})
                                </span>
                                <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.75rem' }}>
                                  Max Points: {q.points}
                                </span>
                              </div>

                              <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 800 }}>{q.text}</h4>

                              {q.imageUrl && (
                                <img src={q.imageUrl} alt="Question diagram" style={{ maxHeight: 160, borderRadius: 6, marginBottom: 12, border: '1px solid #ccc' }} />
                              )}

                              {/* Student Answer & Options View */}
                              {isMcq ? (
                                <div style={{ marginBottom: 14, background: '#f9fafb', padding: 12, borderRadius: 6, border: '1px solid #e5e7eb' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>MCQ Options:</div>
                                    {!origAns?.optionId && (
                                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                        — Student Skipped Question
                                      </span>
                                    )}
                                  </div>
                                  {q.options?.map((opt: FinalExamOption) => {
                                    const isCorrect = opt.id === q.correctOptionId;
                                    const isSelected = origAns?.optionId === opt.id;
                                    return (
                                      <div key={opt.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, marginBottom: 4,
                                        background: isSelected && isCorrect ? '#dcfce7' : isCorrect ? '#f0fdf4' : isSelected ? '#fee2e2' : 'transparent',
                                        border: isSelected && isCorrect ? '1px solid #166534' : isCorrect ? '1px dashed #22c55e' : isSelected ? '1px solid #ef4444' : '1px solid transparent',
                                        fontWeight: isSelected || isCorrect ? 800 : 500, fontSize: '0.85rem'
                                      }}>
                                        <span>
                                          {isSelected && isCorrect ? '✓ [Student Picked - Correct]' :
                                           isCorrect ? '✓ [Correct Answer]' :
                                           isSelected ? '✗ [Student Picked - Incorrect]' : '•'}
                                        </span>
                                        <span>{opt.text}</span>
                                        {opt.imageUrl && <img src={opt.imageUrl} alt="Option" style={{ height: 28, borderRadius: 4 }} />}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Student's Subjective Response:</div>
                                  <div style={{ background: '#f9fafb', border: '1.5px solid #d1d5db', padding: 14, borderRadius: 6, fontSize: '0.92rem', whiteSpace: 'pre-line', marginBottom: 10 }}>
                                    {origAns?.subjectiveAnswer || <span style={{ color: 'red', fontStyle: 'italic' }}>No answer provided.</span>}
                                  </div>
                                  {q.correctSubjectiveAnswer && (
                                    <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>
                                      Model Answer: {q.correctSubjectiveAnswer}
                                    </div>
                                  )}
                                  {q.correctAnswerKeywords && (
                                    <div style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 700, marginTop: 4 }}>
                                      Expected Keywords: {q.correctAnswerKeywords}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Grade inputs for this question */}
                              {isMcq ? (
                                /* MCQ: locked, auto-graded */
                                (() => {
                                  const pointsEarned = feGradingScores[key] ?? 0;
                                  const isSkipped = !origAns?.optionId;
                                  const isCorrect = pointsEarned > 0;

                                  const bg = isCorrect ? '#f0fdf4' : isSkipped ? '#f8fafc' : '#fef2f2';
                                  const borderColor = isCorrect ? '#86efac' : isSkipped ? '#cbd5e1' : '#fca5a5';
                                  const textColor = isCorrect ? '#166534' : isSkipped ? '#475569' : '#991b1b';

                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: bg, border: `1.5px solid ${borderColor}`, padding: '10px 14px', borderRadius: 6 }}>
                                      {isCorrect ? <CheckCircle size={16} color={textColor} /> : isSkipped ? <AlertCircle size={16} color={textColor} /> : <XCircle size={16} color={textColor} />}
                                      <span style={{ fontWeight: 900, fontSize: '0.82rem', color: textColor, textTransform: 'uppercase' }}>
                                        Auto-Graded: {pointsEarned} / {q.points} pts {isSkipped ? '(Skipped)' : !isCorrect ? '(Incorrect)' : '(Correct)'}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 'auto' }}>
                                        MCQs are evaluated automatically
                                      </span>
                                    </div>
                                  );
                                })()
                              ) : (
                                /* Subjective: editable */
                                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, background: '#f3f4f6', padding: 12, borderRadius: 6 }}>
                                  <div>
                                    <label style={{ fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                                      Marks (Max {q.points})
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={q.points}
                                      value={feGradingScores[key] ?? 0}
                                      onChange={e => setFeGradingScores(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                      className="neo-input"
                                      style={{ width: '100%', fontWeight: 800 }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontWeight: 800, fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                                      Question Feedback (Optional)
                                    </label>
                                    <input
                                      value={feGradingFeedbacks[key] || ''}
                                      onChange={e => setFeGradingFeedbacks(prev => ({ ...prev, [key]: e.target.value }))}
                                      className="neo-input"
                                      placeholder="Add feedback on this answer…"
                                      style={{ width: '100%' }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* ── Proctoring Snapshots Gallery ── */}
                  <div style={{ marginBottom: 28, background: '#0f172a', borderRadius: 10, padding: 20 }}>
                    <h4 style={{ margin: '0 0 14px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 6px #ef4444', animation: 'pulse 1s infinite' }} />
                      Proctoring Snapshots
                      {!feSnapshotsLoading && <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#94a3b8', marginLeft: 4 }}>({feSnapshots.length} captured)</span>}
                    </h4>
                    {feSnapshotsLoading ? (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>Loading snapshots…</div>
                    ) : feSnapshots.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>No snapshots captured yet for this student.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                        {feSnapshots.map((snap: any) => (
                          <div
                            key={snap.id}
                            onClick={() => setFeSnapshotLightbox(snap.imageData)}
                            style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: '2px solid #1e293b', position: 'relative', transition: 'transform 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                          >
                            <img
                              src={snap.imageData}
                              alt={`Snapshot at ${new Date(snap.capturedAt).toLocaleTimeString()}`}
                              style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{ background: 'rgba(0,0,0,0.7)', color: '#e2e8f0', fontSize: '0.6rem', fontWeight: 700, textAlign: 'center', padding: '2px 4px' }}>
                              {new Date(snap.capturedAt).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lightbox */}
                  {feSnapshotLightbox && (
                    <div
                      onClick={() => setFeSnapshotLightbox(null)}
                      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
                    >
                      <img src={feSnapshotLightbox} alt="Snapshot" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, border: '4px solid #fff' }} />
                      <button
                        onClick={() => setFeSnapshotLightbox(null)}
                        style={{ position: 'absolute', top: 24, right: 24, background: '#fff', border: 'none', borderRadius: '50%', width: 40, height: 40, fontSize: '1.2rem', fontWeight: 900, cursor: 'pointer' }}
                      >×</button>
                    </div>
                  )}

                  {/* Overall Feedback */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontWeight: 900, fontSize: '0.88rem', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      Overall Evaluator Feedback for Student
                    </label>
                    <textarea
                      value={feOverallFeedback}
                      onChange={e => setFeOverallFeedback(e.target.value)}
                      className="neo-input"
                      rows={3}
                      placeholder="General comments on student performance…"
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button onClick={() => setFeGradingModalOpen(false)} className="neo-btn neo-btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                    <button onClick={() => handleFeGradeSubmit(false)} disabled={feGradingSubmitting} className="neo-btn neo-btn-secondary" style={{ padding: '10px 20px', background: '#e5e7eb' }}>
                      {feGradingSubmitting ? 'Saving…' : 'Save Draft Grade'}
                    </button>
                    <button onClick={() => handleFeGradeSubmit(true)} disabled={feGradingSubmitting} className="neo-btn neo-btn-accent" style={{ padding: '10px 24px' }}>
                      {feGradingSubmitting ? 'Publishing…' : 'Save & Publish Result'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Regular Exams section ─────────────────────────────────────── */}
            <div style={{ borderTop: '3px solid var(--border-color)', paddingTop: 32, marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase' }}>Regular Exams</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.85rem' }}>Individual subject exam modules</p>
                </div>
                <button onClick={handleOpenCreateExam} className="neo-btn" style={{ padding: '8px 16px' }}>
                  <Plus size={16} /> Add Exam
                </button>
              </div>

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
                          <span className={`neo-badge ${exam.type === 'SUBJECTIVE' ? 'neo-badge-admin' : 'neo-badge-student'}`}>
                            {exam.questionsCount || 0} {exam.type === 'SUBJECTIVE' ? 'Subjective' : 'MCQ'} Questions
                          </span>
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
                              onClick={() => handleViewSubmissions(exam)}
                              className="neo-btn neo-btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', boxShadow: '1px 1px 0px 0px var(--border-color)', transform: 'none' }}
                            >
                              Submissions
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
                      <span className="neo-badge" style={{
                        backgroundColor: question.type === 'SUBJECTIVE' ? 'var(--accent)' : 'var(--primary)',
                      }}>
                        {question.type === 'SUBJECTIVE' ? '✍ Subjective' : '🔘 MCQ'}
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

                    {question.type === 'SUBJECTIVE' ? (
                      /* Subjective: Show model answer + keywords */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{
                          border: '2px solid var(--border-color)',
                          borderRadius: 6,
                          backgroundColor: '#fef9e7',
                          padding: '14px 18px',
                        }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em' }}>Model Answer</div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'pre-wrap', color: question.correctSubjectiveAnswer ? 'inherit' : 'var(--text-muted)' }}>
                            {question.correctSubjectiveAnswer || 'No model answer provided.'}
                          </p>
                        </div>
                        {question.correctAnswerKeywords && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Keywords:</span>
                            {question.correctAnswerKeywords.split(',').map(kw => kw.trim()).filter(k => k).map(kw => (
                              <span key={kw} style={{
                                backgroundColor: 'var(--secondary)',
                                border: '1.5px solid var(--border-color)',
                                borderRadius: 4,
                                padding: '2px 8px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                              }}>{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* MCQ Options Grid */
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
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        {/* VIEW 3: EXAM SUBMISSIONS LISTING & MANUAL GRADING */}
        {currentView === 'SUBMISSIONS' && activeExam && (
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
                  <h1 className="header-title" style={{ margin: 0, fontSize: '1.8rem' }}>Submissions Dashboard</h1>
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px', marginLeft: '38px' }}>
                  Review submissions for: <span style={{ fontWeight: 800, color: 'var(--text-color)' }}>{activeExam.title}</span> ({activeExam.type === 'SUBJECTIVE' ? 'Subjective' : 'MCQ'} Exam)
                </p>
              </div>
              <button onClick={() => handleViewSubmissions(activeExam)} className="neo-btn" style={{ padding: '8px 12px' }}>
                <RefreshCw size={16} />
                Refresh
              </button>
            </header>

            {submissionsError && (
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
                <span>{submissionsError}</span>
              </div>
            )}

            {submissionsLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Loading Submissions...</h3>
              </div>
            ) : submissions.length === 0 ? (
              <div className="neo-card" style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#ffffff' }}>
                <HelpCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--text-muted)' }} />
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px' }}>No Submissions Yet</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  No students have completed or submitted this exam template.
                </p>
              </div>
            ) : (
              <div className="neo-card" style={{ padding: 0, overflow: 'hidden', borderCollapse: 'collapse', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '3px solid var(--border-color)' }}>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem' }}>Student Details</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '20%' }}>Score</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '20%' }}>Status</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '20%' }}>Submission Date</th>
                      <th style={{ padding: '16px 20px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.82rem', width: '20%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const isGraded = sub.graded !== false;
                      const formattedDate = new Date(sub.createdAt).toLocaleString();
                      // A mixed exam (MCQ type but with subjective questions) also needs manual grading
                      const hasSubjectiveQuestions = activeExam.questions?.some((q: any) => q.type === 'SUBJECTIVE');
                      const needsManualGrading = hasSubjectiveQuestions;
                      
                      return (
                        <tr key={sub.id} style={{ borderBottom: '2px solid var(--border-color)' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sub.user?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub.user?.email}</div>
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                            {needsManualGrading && !isGraded ? (
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>—</span>
                            ) : (
                              <span>{sub.score} / {sub.totalPoints} pts</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {needsManualGrading ? (
                              isGraded ? (
                                <span className="neo-badge" style={{ backgroundColor: 'var(--accent-green)', color: 'var(--text-color)' }}>Graded</span>
                              ) : (
                                <span className="neo-badge" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-color)' }}>Pending Grading</span>
                              )
                            ) : (
                              <span className="neo-badge neo-badge-student">Auto-Graded</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            {formattedDate}
                          </td>
                          <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleOpenGradingModal(sub)}
                              className={`neo-btn ${needsManualGrading && !isGraded ? '' : 'neo-btn-secondary'}`}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', transform: 'none' }}
                            >
                              {needsManualGrading ? (isGraded ? 'Revisit / Regrade' : 'Review & Grade') : 'Review Answers'}
                            </button>
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
                  Exam Type
                </label>
                <select
                  value={formExamType}
                  onChange={(e) => setFormExamType(e.target.value as 'MCQ' | 'SUBJECTIVE')}
                  className="neo-select"
                  disabled={examModalType === 'edit'}
                >
                  <option value="MCQ">MCQ Exam (Auto Graded)</option>
                  <option value="SUBJECTIVE">Subjective Exam (Manually Graded)</option>
                </select>
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
              {questionModalType === 'create' ? 'Add Question' : 'Edit Question'}
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

              {/* Question Type Selector */}
              {activeExam?.type !== 'SUBJECTIVE' ? (
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                    Question Type
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['MCQ', 'SUBJECTIVE'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormQType(t)}
                        style={{
                          flex: 1,
                          padding: '10px 0',
                          fontWeight: 900,
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          border: '2.5px solid var(--border-color)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          backgroundColor: formQType === t ? (t === 'MCQ' ? 'var(--primary)' : 'var(--accent)') : '#f4f4f4',
                          boxShadow: formQType === t ? '3px 3px 0 var(--border-color)' : 'none',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        {t === 'MCQ' ? '🔘 Multiple Choice' : '✍️ Subjective'}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 4 }}>
                  <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                    Question Type
                  </label>
                  <div style={{
                    padding: '12px 16px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: 4,
                    border: '2px solid var(--border-color)',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>✍️ Subjective Question (Locked by Exam Type)</span>
                  </div>
                </div>
              )}

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

              {/* ─── CONDITIONAL SECTION ─── */}
              {formQType === 'SUBJECTIVE' ? (
                <>
                  <div style={{ backgroundColor: '#fef9e7', border: '2px dashed var(--border-color)', borderRadius: 6, padding: '12px 16px', fontSize: '0.82rem', color: '#555', fontWeight: 600 }}>
                    ✍️ Students will type a text answer. Points are awarded automatically by keyword matching.
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                      Model / Correct Answer
                    </label>
                    <textarea
                      value={formQCorrectSubjectiveAnswer}
                      onChange={(e) => setFormQCorrectSubjectiveAnswer(e.target.value)}
                      className="neo-input"
                      placeholder="Write the ideal expected answer here (used for exact-match grading)."
                      style={{ minHeight: '80px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '0.8rem' }}>
                      Grading Keywords <span style={{ fontWeight: 500, textTransform: 'none', fontSize: '0.75rem', color: 'var(--text-muted)' }}>(comma-separated, e.g. &quot;hook, state, react&quot;)</span>
                    </label>
                    <input
                      type="text"
                      value={formQCorrectAnswerKeywords}
                      onChange={(e) => setFormQCorrectAnswerKeywords(e.target.value)}
                      className="neo-input"
                      placeholder="hook, state, useState, react"
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      Points are proportional to keywords matched. E.g. if 2 of 4 keywords match → student gets 50% of points.
                    </p>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

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
      {/* ─── MODAL: MANUAL SUBMISSION GRADING & REVIEW ──────────────────────── */}
      {gradingModalOpen && activeSubmission && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, backdropFilter: 'blur(2px)'
        }}>
          <div className="neo-card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#ffffff', position: 'relative' }}>
            <button
              onClick={() => setGradingModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ textTransform: 'uppercase', fontWeight: 900, marginBottom: '8px', fontSize: '1.4rem' }}>
              {activeExam?.questions?.some((q: any) => q.type === 'SUBJECTIVE') ? 'Grade Student Answers' : 'Review Student Answers'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
              Student: <span style={{ fontWeight: 800, color: 'var(--text-color)' }}>{activeSubmission.user?.name}</span> ({activeSubmission.user?.email})
            </p>

            {gradeSubmitError && (
              <div className="neo-card" style={{
                backgroundColor: 'var(--danger)', color: '#fff', padding: '12px', marginBottom: '20px',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--box-shadow-sm)'
              }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '0.9rem' }}>{gradeSubmitError}</span>
              </div>
            )}

            <form onSubmit={handleGradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeExam?.questions.map((q: Question, idx: number) => {
                  const studentAns = activeSubmission.answers.find((a: any) => a.questionId === q.id);
                  const currentScore = gradingScores[q.id] ?? 0;
                  
                  return (
                    <div key={q.id} className="neo-card" style={{
                      backgroundColor: 'var(--bg-color)',
                      border: '2px solid var(--border-color)',
                      padding: '16px',
                      borderRadius: 'var(--border-radius)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Question {idx + 1}</span>
                        <span className="neo-badge" style={{ backgroundColor: 'var(--secondary)', color: 'var(--text-color)', fontSize: '0.72rem' }}>
                          Max Points: {q.points}
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: 700, marginBottom: 12 }}>{q.text}</div>
                      
                      {/* Student's answer response */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Student's Answer:</div>
                        <div style={{
                          padding: '10px 12px',
                          backgroundColor: '#ffffff',
                          border: '2px solid var(--border-color)',
                          borderRadius: 4,
                          fontStyle: studentAns?.subjectiveAnswer ? 'normal' : 'italic',
                          color: studentAns?.subjectiveAnswer ? 'inherit' : 'var(--text-muted)',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {q.type === 'SUBJECTIVE' 
                            ? (studentAns?.subjectiveAnswer || '(No answer provided)') 
                            : (q.options.find(o => o.id === studentAns?.optionId)?.text || '(No option selected)')
                          }
                        </div>
                      </div>

                      {/* Model answer reference if subjective */}
                      {q.type === 'SUBJECTIVE' && q.correctSubjectiveAnswer && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#065f46', marginBottom: 4 }}>Model Reference Answer:</div>
                          <div style={{
                            padding: '10px 12px',
                            backgroundColor: '#e6fffa',
                            border: '2px solid #319795',
                            color: '#234e52',
                            borderRadius: 4,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {q.correctSubjectiveAnswer}
                          </div>
                        </div>
                      )}

                      {/* Grading Input: editable for SUBJECTIVE questions, read-only auto-grade for MCQ questions */}
                      {q.type === 'SUBJECTIVE' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', fontSize: '0.75rem' }}>
                              Assign Score (0 - {q.points})
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={q.points}
                              value={currentScore}
                              onChange={(e) => {
                                const val = Math.min(q.points, Math.max(0, Number(e.target.value)));
                                setGradingScores(prev => ({
                                  ...prev,
                                  [q.id]: val
                                }));
                              }}
                              className="neo-input"
                              style={{ maxWidth: '120px', padding: '6px 10px' }}
                              required
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', fontSize: '0.75rem' }}>
                              Teacher Feedback (Optional)
                            </label>
                            <textarea
                              value={gradingFeedbacks[q.id] || ''}
                              onChange={(e) => {
                                setGradingFeedbacks(prev => ({
                                  ...prev,
                                  [q.id]: e.target.value
                                }));
                              }}
                              className="neo-input"
                              placeholder="Add suggestions, comments, or corrections..."
                              style={{ minHeight: '60px', resize: 'vertical' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Points Earned (Auto): <span style={{ fontWeight: 800, color: 'var(--text-color)' }}>{studentAns?.optionId === q.correctOptionId ? q.points : 0} / {q.points}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {activeExam?.questions?.some((q: any) => q.type === 'SUBJECTIVE') && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setGradingModalOpen(false)}
                    className="neo-btn neo-btn-secondary"
                    style={{ padding: '8px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={gradeSubmitLoading}
                    className="neo-btn"
                    style={{ padding: '8px 24px' }}
                  >
                    {gradeSubmitLoading ? 'Saving...' : 'Submit Grades'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
