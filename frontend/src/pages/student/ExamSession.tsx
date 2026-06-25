import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { apiFetch } from '../../utils/api';

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
  type?: 'MCQ' | 'SUBJECTIVE';
  options: Option[];
}

interface Exam {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalPoints: number;
  questions: Question[];
}

const LABELS = ['A', 'B', 'C', 'D', 'E'];

// ── LocalStorage helpers ─────────────────────────────────────────────────────
const lsKey = (examId: string) => `exam_draft_${examId}`;

function saveDraft(examId: string, answers: Record<string, string | null>, subjectiveAnswers: Record<string, string>, timeLeft: number | null) {
  try {
    localStorage.setItem(lsKey(examId), JSON.stringify({ answers, subjectiveAnswers, timeLeft, savedAt: Date.now() }));
  } catch { /* storage full – ignore */ }
}

function loadDraft(examId: string) {
  try {
    const raw = localStorage.getItem(lsKey(examId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Discard drafts older than 8 hours
    if (Date.now() - d.savedAt > 8 * 60 * 60 * 1000) { localStorage.removeItem(lsKey(examId)); return null; }
    return d as { answers: Record<string, string | null>; subjectiveAnswers: Record<string, string>; timeLeft: number | null };
  } catch { return null; }
}

function clearDraft(examId: string) {
  try { localStorage.removeItem(lsKey(examId)); } catch { /* ignore */ }
}

// ── Retry-capable fetch ──────────────────────────────────────────────────────
async function apiFetchWithRetry(path: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await apiFetch(path, init);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1200 * (i + 1))); // back-off: 1.2s, 2.4s
    }
  }
  throw new Error('Max retries exceeded');
}

const ExamSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [subjectiveAnswers, setSubjectiveAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [viewedQuestions, setViewedQuestions] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalPoints: number } | null>(null);
  const autoSubmitted = useRef(false);

  // Exam integrity states
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [remainingChances, setRemainingChances] = useState<number>(3);
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [lastViolationType, setLastViolationType] = useState<string>('');
  const [showToast, setShowToast] = useState<{ msg: string; type: 'warn' | 'info' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowViolationFiredRef = useRef<boolean>(false);
  // When true, all violation/pause detection is silenced (e.g. during submit flow)
  const isSubmittingRef = useRef<boolean>(false);
  // Blur debounce: ignore focus losses shorter than this duration (ms)
  const blurDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Feedback state
  const [rating, setRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Offline / network state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Draft restored banner
  const [draftRestored, setDraftRestored] = useState(false);

  // Camera & proctoring states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const proctorVideoRef = useRef<HTMLVideoElement | null>(null);
  const setupVideoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access is required. Please ensure your camera is connected and you grant permissions.');
    } finally {
      setIsCameraLoading(false);
    }
  };

  useEffect(() => {
    if (exam && !result && !cameraStream) {
      startCamera();
    }
  }, [exam, result]);

  useEffect(() => {
    if (setupVideoRef.current && cameraStream) {
      setupVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isFullscreenActive, isPaused]);

  useEffect(() => {
    if (proctorVideoRef.current && cameraStream) {
      proctorVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, isFullscreenActive, isPaused]);

  // Camera interruption monitoring
  useEffect(() => {
    if (!cameraStream || result || remainingChances <= 0) return;

    const handleTrackEnded = () => {
      setIsPaused(true);
      reportViolation('CAMERA_DISCONNECTED');
    };

    const videoTrack = cameraStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', handleTrackEnded);
    }

    return () => {
      if (videoTrack) {
        videoTrack.removeEventListener('ended', handleTrackEnded);
      }
    };
  }, [cameraStream, result, remainingChances, attemptId]);

  // Clean up camera stream tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Clean up camera stream tracks when results are shown (exam finished)
  useEffect(() => {
    if (result && cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  }, [result, cameraStream]);

  // ── Network online / offline monitoring ─────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  triggerToast('Connection restored. You are back online.', 'info'); };
    const handleOffline = () => { setIsOnline(false); triggerToast('You are offline! Your answers are saved locally and will sync when connection returns.', 'error'); };
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Auto-save answers to localStorage every 15 seconds ──────────────────────
  useEffect(() => {
    if (!exam || result) return;
    const interval = setInterval(() => {
      saveDraft(exam.id, answers, subjectiveAnswers, timeLeft);
    }, 15000);
    return () => clearInterval(interval);
  }, [exam, answers, subjectiveAnswers, timeLeft, result]);

  // Also save immediately when answers change (debounced 2 seconds)
  const draftSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!exam || result) return;
    if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current);
    draftSaveTimeout.current = setTimeout(() => {
      saveDraft(exam.id, answers, subjectiveAnswers, timeLeft);
    }, 2000);
    return () => { if (draftSaveTimeout.current) clearTimeout(draftSaveTimeout.current); };
  }, [answers, subjectiveAnswers]);

  // Trigger temporary warning toast
  const triggerToast = (msg: string, type: 'warn' | 'info' | 'error' = 'warn') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setShowToast({ msg, type });
    toastTimeoutRef.current = setTimeout(() => setShowToast(null), 5000);
  };

  // Request fullscreen mode helper
  const enterFullscreen = () => {
    const docEl = document.documentElement;
    const requestFs = docEl.requestFullscreen || (docEl as any).webkitRequestFullscreen || (docEl as any).msRequestFullscreen;
    if (requestFs) {
      requestFs.call(docEl)
        .then(() => {
          setIsFullscreenActive(true);
          setFullscreenError(null);
        })
        .catch(() => {
          setFullscreenError('Fullscreen mode is required to take this exam.');
        });
    } else {
      setFullscreenError('Fullscreen mode is not supported by your browser.');
    }
  };

  // ── Fetch exam ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await apiFetch(`/student/exams/${id}`, { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
          setExam(data.exam);
          setAttemptId(data.attemptId);
          setRemainingChances(data.remainingChances);

          // Try to restore a saved draft
          const draft = loadDraft(data.exam.id);
          if (draft) {
            setAnswers(draft.answers);
            setSubjectiveAnswers(draft.subjectiveAnswers);
            // Restore time only if it's less than the full duration (i.e., they were mid-exam)
            const fullTime = data.exam.durationMinutes * 60;
            setTimeLeft(draft.timeLeft !== null && draft.timeLeft < fullTime ? draft.timeLeft : fullTime);
            setDraftRestored(true);
            setTimeout(() => setDraftRestored(false), 6000);
          } else {
            const init: Record<string, string | null> = {};
            data.exam.questions.forEach((q: Question) => { init[q.id] = null; });
            setAnswers(init);
            setTimeLeft(data.exam.durationMinutes * 60);
          }

          if (data.exam.questions.length > 0) {
            setViewedQuestions(new Set([data.exam.questions[0].id]));
          }
        } else {
          setError(data.message || 'Failed to load exam.');
        }
      } catch {
        setError('Network error. Could not load exam.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleAutoSubmit() {
    if (submitting || result || !exam) return;
    // Silence violation detection for the entire auto-submit flow
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const submissionAnswers = Object.keys(answers).map(qId => {
        const q = exam.questions.find(q => q.id === qId);
        if (q?.type === 'SUBJECTIVE') {
          return { questionId: qId, subjectiveAnswer: subjectiveAnswers[qId] || '' };
        }
        return { questionId: qId, optionId: answers[qId] };
      });
      const res = await apiFetchWithRetry(`/student/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: submissionAnswers, isTerminated: true }),
        credentials: 'include',
      });
      const data = await res.json();
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
      clearDraft(exam.id);
      setResult({ score: data.score, totalPoints: data.totalPoints });
      setError('Your exam has been automatically submitted because the maximum number of integrity violations was exceeded.');
    } catch {
      setError('Network error during submission.');
    } finally {
      setSubmitting(false);
      isSubmittingRef.current = false;
    }
  }

  // Report violation to the backend
  const reportViolation = async (type: string) => {
    if (!attemptId || result || remainingChances <= 0) return;
    try {
      const response = await apiFetch('/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          type,
          timestamp: new Date().toISOString()
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setRemainingChances(data.remainingChances);
        setLastViolationType(type);

        if (data.remainingChances <= 0) {
          setShowWarningModal(false);
          await handleAutoSubmit();
        } else {
          setShowWarningModal(true);
        }
      }
    } catch (err) {
      console.error('Error reporting violation:', err);
    }
  };

  // Fullscreen exited listener
  useEffect(() => {
    if (!exam || result || remainingChances <= 0) return;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
      setIsFullscreenActive(isCurrentlyFullscreen);

      // Ignore fullscreen exit caused by our own submit/exit flow
      if (isSubmittingRef.current) return;

      if (!isCurrentlyFullscreen && isFullscreenActive) {
        setIsPaused(true);
        reportViolation('FULLSCREEN_EXIT');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [exam, result, isFullscreenActive, remainingChances, attemptId]);

  // Tab switch & Window focus listener (with debounce to avoid false positives)
  useEffect(() => {
    if (!exam || result || remainingChances <= 0 || !isFullscreenActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!windowViolationFiredRef.current) {
          windowViolationFiredRef.current = true;
          setIsPaused(true);
          reportViolation('TAB_SWITCH');
        }
      } else {
        windowViolationFiredRef.current = false;
      }
    };

    const handleBlur = () => {
      // Ignore blur caused by our own submit flow
      if (isSubmittingRef.current) return;
      // Debounce: only flag a violation if focus is lost for > 800ms
      // This prevents false positives from browser scrollbars, OS notifications, etc.
      if (blurDebounceRef.current) clearTimeout(blurDebounceRef.current);
      blurDebounceRef.current = setTimeout(() => {
        if (!windowViolationFiredRef.current && !isSubmittingRef.current) {
          windowViolationFiredRef.current = true;
          setIsPaused(true);
          reportViolation('WINDOW_BLUR');
        }
      }, 800);
    };

    const handleFocus = () => {
      // Cancel pending blur debounce — brief focus loss, no violation
      if (blurDebounceRef.current) { clearTimeout(blurDebounceRef.current); blurDebounceRef.current = null; }
      windowViolationFiredRef.current = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (blurDebounceRef.current) clearTimeout(blurDebounceRef.current);
    };
  }, [exam, result, isFullscreenActive, remainingChances, attemptId]);


  // Keyboard shortcut restrictions
  useEffect(() => {
    if (!exam || result || remainingChances <= 0 || !isFullscreenActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        triggerToast('F11 fullscreen exit is disabled.');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        triggerToast('Saving page is disabled.');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        triggerToast('Viewing page source is disabled.');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j')) {
        e.preventDefault();
        triggerToast('Developer Tools shortcuts are disabled.');
        return;
      }

      if (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        triggerToast('Developer Tools shortcuts are disabled.');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exam, result, isFullscreenActive, remainingChances]);

  // Clipboard & Context menu prevention
  useEffect(() => {
    if (!exam || result || remainingChances <= 0 || !isFullscreenActive) return;

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerToast('Copying text is disabled during this exam.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerToast('Pasting text is disabled during this exam.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerToast('Cutting text is disabled during this exam.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerToast('Right-click context menu is disabled.');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [exam, result, isFullscreenActive, remainingChances]);

  // Cleanup toasts
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const selectOption = (qId: string, optId: string) => {
    if (result) return;
    setAnswers(p => ({ ...p, [qId]: optId }));
  };

  const clearSelection = (qId: string) => setAnswers(p => ({ ...p, [qId]: null }));

  const toggleMark = (qId: string) => {
    setMarkedForReview(p => {
      const n = new Set(p);
      if (n.has(qId)) {
        n.delete(qId);
      } else {
        n.add(qId);
      }
      return n;
    });
  };

  const goTo = (idx: number) => {
    if (!exam) return;
    setCurrentIndex(idx);
    setViewedQuestions(p => new Set([...p, exam.questions[idx].id]));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || result || !exam) return;
    // Silence all violation detection for the duration of the submit flow
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const submissionAnswers = Object.keys(answers).map(qId => {
        const q = exam.questions.find(q => q.id === qId);
        if (q?.type === 'SUBJECTIVE') {
          return { questionId: qId, subjectiveAnswer: subjectiveAnswers[qId] || '' };
        }
        return { questionId: qId, optionId: answers[qId] };
      });
      const res = await apiFetchWithRetry(`/student/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: submissionAnswers }),
        credentials: 'include',
      });
      const data = await res.json();
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
      if (res.ok) {
        clearDraft(exam.id);
        setResult({ score: data.score, totalPoints: data.totalPoints });
      } else {
        setError(data.message || 'Submission failed.');
      }
    } catch {
      setError('Network error during submission. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      // Re-enable violation detection after submit completes
      isSubmittingRef.current = false;
    }
  }, [answers, subjectiveAnswers, exam, result, submitting]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || result || isPaused) return;
    if (timeLeft <= 0) {
      if (!autoSubmitted.current) {
        autoSubmitted.current = true;
        handleSubmit();
      }
      return;
    }
    const t = setInterval(() => setTimeLeft(p => p !== null ? p - 1 : null), 1000);
    return () => clearInterval(t);
  }, [timeLeft, result, isPaused, handleSubmit]);

  // ── Prevent accidental tab close ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (exam && !result) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [exam, result]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Pill colour logic ────────────────────────────────────────────────────────
  const pillStyle = (idx: number): React.CSSProperties => {
    if (!exam) return {};
    const q = exam.questions[idx];
    const isCurrent   = idx === currentIndex;
    const isAttempted = answers[q.id] !== null;
    const isMarked    = markedForReview.has(q.id);
    const isViewed    = viewedQuestions.has(q.id);

    if (isCurrent)   return { background: 'var(--primary)',    border: '3px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 900, boxShadow: 'var(--box-shadow-sm)' };
    if (isAttempted) return { background: 'var(--accent-green)', border: '3px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 800 };
    if (isMarked)    return { background: 'var(--accent)',     border: '3px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 800 };
    if (isViewed)    return { background: '#fff8d6',           border: '3px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 700 };
    return               { background: 'var(--bg-color)',      border: '3px solid #ccc',               color: 'var(--text-muted)', fontWeight: 600 };
  };

  // ── Timer urgency levels ─────────────────────────────────────────────────────
  const timerCritical = timeLeft !== null && timeLeft < 120;   // < 2 min  → red pulsing
  const timerWarning  = timeLeft !== null && timeLeft < 300;   // < 5 min  → orange

  // ── States ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)' }}>
      <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif' }}>Loading exam…</h2>
    </div>
  );

  if (error && !exam) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)', padding: 24 }}>
      <div className="neo-card" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
        <h2 style={{ fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' }}>{error}</h2>
        <button onClick={() => navigate('/student')} className="neo-btn neo-btn-secondary" style={{ margin: '0 auto' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (!exam) return null;

  // ── Exam Paused Screen ──────────────────────────────────────────────────────
  if (exam && isPaused) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'rgba(0,0,0,0.88)', padding: 24, fontFamily: 'Outfit, sans-serif', zIndex: 10000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="neo-card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '44px 40px', background: '#fff' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ffe4e4', border: '3px solid var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={36} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 style={{ fontWeight: 900, marginBottom: 10, textTransform: 'uppercase', fontSize: '1.6rem' }}>Exam Paused</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.65, fontSize: '0.95rem' }}>
            The exam paused because the window lost focus or fullscreen was exited. Click below to resume.
          </p>

          {/* Remaining chances indicator */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 28,
          }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i <= remainingChances ? 'var(--accent-green)' : '#e5e7eb',
                border: '2px solid var(--border-color)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: remainingChances <= 1 ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 28 }}>
            {remainingChances} of 3 chance{remainingChances !== 1 ? 's' : ''} remaining
            {remainingChances === 1 ? ' — Next violation will auto-submit!' : ''}
          </p>

          <button
            onClick={() => {
              setIsPaused(false);
              if (!document.fullscreenElement) {
                enterFullscreen();
              }
            }}
            className="neo-btn"
            style={{ margin: '0 auto', fontSize: '1.05rem', padding: '13px 32px', width: '100%', justifyContent: 'center' }}
          >
            Resume Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Entry Requirements Screen ──────────────────────────────────────────
  if (exam && !isFullscreenActive) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)', padding: 24, fontFamily: 'Outfit, sans-serif' }}>
        <div className="neo-card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '40px' }}>
          <h2 style={{ fontWeight: 900, marginBottom: 8, textTransform: 'uppercase' }}>Exam Setup Checklist</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
            Please complete the system check requirements below to start the exam.
          </p>

          {/* Checklist Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left', marginBottom: 28 }}>
            
            {/* Step 1: Camera Access */}
            <div style={{
              border: '2px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: 16,
              backgroundColor: '#fff',
              boxShadow: 'var(--box-shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>1. Live Proctoring Camera</span>
                {cameraStream ? (
                  <span className="neo-badge neo-badge-student" style={{ backgroundColor: 'var(--accent-green)', padding: '2px 8px', fontSize: '0.7rem' }}>Connected</span>
                ) : (
                  <span className="neo-badge" style={{ backgroundColor: 'var(--danger)', color: '#fff', padding: '2px 8px', fontSize: '0.7rem' }}>Required</span>
                )}
              </div>

              {isCameraLoading ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  Initializing camera...
                </div>
              ) : cameraStream ? (
                <div style={{ position: 'relative', width: '100%', height: 160, borderRadius: 6, overflow: 'hidden', backgroundColor: '#000', border: '2px solid var(--border-color)' }}>
                  <video
                    ref={setupVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                    Camera access is required for proctoring to prevent cheating. Please grant browser camera permissions.
                  </p>
                  {cameraError && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 12 }}>
                      {cameraError}
                    </div>
                  )}
                  <button type="button" onClick={startCamera} className="neo-btn neo-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
                    Request Camera Access
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Fullscreen */}
            <div style={{
              border: '2px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              padding: 16,
              backgroundColor: '#fff',
              boxShadow: 'var(--box-shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '0.95rem' }}>2. Fullscreen Mode</span>
                <span className="neo-badge neo-badge-admin" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>Enforced</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 0 0', lineHeight: 1.4 }}>
                The exam must be taken in fullscreen. Exiting fullscreen or shifting tabs will log an integrity violation.
              </p>
            </div>

          </div>

          {fullscreenError && (
            <div style={{
              background: '#ffe0e0',
              border: '2px solid var(--danger)',
              borderRadius: 'var(--border-radius)',
              padding: '12px',
              color: 'var(--danger)',
              fontWeight: 800,
              marginBottom: 20,
              fontSize: '0.85rem'
            }}>
              {fullscreenError}
            </div>
          )}

          {cameraStream ? (
            <button onClick={enterFullscreen} className="neo-btn" style={{ margin: '0 auto', fontSize: '1.05rem', padding: '12px 28px', width: '100%', justifyContent: 'center' }}>
              Accept Requirements &amp; Start Exam
            </button>
          ) : (
            <button disabled className="neo-btn" style={{ margin: '0 auto', fontSize: '1.05rem', padding: '12px 28px', width: '100%', justifyContent: 'center', opacity: 0.5, cursor: 'not-allowed' }}>
              Please Enable Camera to Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Feedback submission handler ───────────────────────────────────────────────
  const submitFeedback = async () => {
    if (!exam || rating === 0) return;
    setFeedbackSubmitting(true);
    try {
      const res = await apiFetch(`/student/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: exam.id,
          rating,
          message: feedbackMsg,
        }),
        credentials: 'include',
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
      } else {
        console.error('Feedback submission failed');
      }
    } catch (err) {
      console.error('Error submitting feedback', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // ── Result screen ────────────────────────────────────────────────────────────
  if (result) {
    const isScoreHidden = result.score === null;
    const pct = isScoreHidden ? 0 : Math.round((result.score! / result.totalPoints) * 100);
    const passed = isScoreHidden ? true : pct >= 60;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-color)', fontFamily: 'Outfit, sans-serif' }}>
        {/* header */}
        <header style={{
          background: '#fff',
          borderBottom: 'var(--border-width) solid var(--border-color)',
          padding: '0 32px', height: 64,
          display: 'flex', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '0.04em' }}>
            {exam.title}
          </span>
        </header>

        {/* result card */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <div className="neo-card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: '48px 40px' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 24px',
              background: passed ? 'var(--accent-green)' : '#ffe0e0',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--box-shadow-sm)'
            }}>
              <CheckCircle size={40} color={passed ? '#1a1a1a' : 'var(--danger)'} />
            </div>

            {error && (
              <div style={{
                background: '#ffe0e0',
                border: '2px solid var(--danger)',
                borderRadius: 'var(--border-radius)',
                padding: '16px',
                color: 'var(--danger)',
                fontWeight: 800,
                fontSize: '0.95rem',
                marginBottom: 24,
                lineHeight: 1.5,
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            <h2 style={{ fontWeight: 900, fontSize: '1.8rem', textTransform: 'uppercase', marginBottom: 8 }}>
              Assessment Complete!
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 36 }}>
              {isScoreHidden 
                ? 'Your responses have been recorded successfully.' 
                : 'Your responses have been graded automatically.'}
            </p>

            {!isScoreHidden ? (
              <div className="neo-card" style={{
                background: 'var(--primary)', marginBottom: 32,
                boxShadow: 'var(--box-shadow-lg)',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  Final Score
                </div>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1 }}>
                  {result.score}
                  <span style={{ fontSize: '1.4rem', color: 'var(--text-muted)', fontWeight: 600 }}> / {result.totalPoints}</span>
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, marginTop: 8 }}>{pct}%</div>
              </div>
            ) : (
              <div className="neo-card" style={{
                background: 'var(--bg-color)', marginBottom: 32,
                border: '2px dashed var(--border-color)',
                padding: '24px'
              }}>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--text-color)' }}>
                  Thank you for submitting!
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8, marginBottom: 0 }}>
                  Scores and correct answers will be released after the exam deadline has passed.
                </p>
              </div>
            )}

            {/* ── Feedback Section ── */}
            <div style={{
              borderTop: '2px solid #f0f0f0',
              paddingTop: 28,
              marginBottom: 24,
            }}>
              {feedbackSubmitted ? (
                <div style={{
                  background: 'var(--accent-green)',
                  border: 'var(--border-width) solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  padding: '16px',
                  fontWeight: 800,
                  fontSize: '1rem',
                }}>
                  🎉 Thank you for your feedback!
                </div>
              ) : (
                <>
                  <h3 style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                    Rate Your Exam Experience
                  </h3>
                  {/* Star rating */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '2rem',
                          color: star <= rating ? '#f5a623' : '#ccc',
                          transition: 'color 0.15s, transform 0.1s',
                          transform: star <= rating ? 'scale(1.15)' : 'scale(1)',
                          padding: '2px 4px',
                          lineHeight: 1,
                        }}
                        title={`${star} star${star > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {/* Optional message */}
                  <textarea
                    placeholder="Any suggestions for improvement? (optional)"
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: 'var(--border-width) solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      resize: 'vertical',
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '0.9rem',
                      marginBottom: 14,
                      background: 'var(--bg-color)',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={submitFeedback}
                    disabled={rating === 0 || feedbackSubmitting}
                    className="neo-btn"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      padding: '13px',
                      opacity: rating === 0 ? 0.5 : 1,
                      marginBottom: 0,
                    }}
                  >
                    {feedbackSubmitting ? 'Submitting…' : 'Submit Feedback'}
                  </button>
                </>
              )}
            </div>

            <button onClick={() => navigate('/student')} className="neo-btn neo-btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '14px' }}>
              <ArrowLeft size={16} /> Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Exam interface ───────────────────────────────────────────────────────────
  const q = exam.questions[currentIndex];
  const isMarkedQ  = markedForReview.has(q.id);
  const selected   = answers[q.id];
  const subjAnswer = subjectiveAnswers[q.id] || '';
  const isSubjective = q.type === 'SUBJECTIVE';
  const isFirst    = currentIndex === 0;
  const isLast     = currentIndex === exam.questions.length - 1;
  // Count attempted: MCQ needs optionId, Subjective needs non-empty text
  const attempted  = exam.questions.filter((_q) => {
    if (_q.type === 'SUBJECTIVE') return (subjectiveAnswers[_q.id] || '').trim().length > 0;
    return answers[_q.id] !== null;
  }).length;
  const unanswered = exam.questions.length - attempted;
  const progressPct = Math.round((attempted / exam.questions.length) * 100);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg-color)',
      fontFamily: 'Outfit, sans-serif',
    }}>

      {/* ══ PROGRESS BAR ════════════════════════════════════════════════════════ */}
      <div style={{ height: 4, background: '#e5e7eb', flexShrink: 0, position: 'relative' }}>
        <div style={{
          height: '100%',
          width: `${progressPct}%`,
          background: progressPct === 100 ? 'var(--accent-green)' : 'var(--primary)',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* ══ STICKY TOP HEADER ══════════════════════════════════════════════════ */}
      <header style={{
        background: '#ffffff',
        borderBottom: 'var(--border-width) solid var(--border-color)',
        padding: '0 32px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexShrink: 0,
      }}>
        {/* Left: title */}
        <div style={{ fontWeight: 900, fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-color)' }}>
          {exam.title}
        </div>

        {/* Right: offline indicator + timer + submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>

          {/* Offline badge */}
          {!isOnline && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fef3c7', border: '2px solid #f59e0b',
              borderRadius: 'var(--border-radius)',
              padding: '5px 12px',
              fontSize: '0.78rem', fontWeight: 800, color: '#92400e',
            }}>
              <WifiOff size={14} /> Offline — Answers saved locally
            </div>
          )}

          {/* Timer */}
          {timeLeft !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              border: `2px solid ${timerCritical ? '#dc2626' : timerWarning ? '#ea580c' : 'var(--border-color)'}`,
              borderRadius: 'var(--border-radius)',
              background: timerCritical ? '#dc2626' : timerWarning ? '#fff7ed' : 'var(--primary)',
              color: timerCritical ? '#fff' : timerWarning ? '#ea580c' : 'var(--text-color)',
              fontWeight: 900, fontSize: '1.1rem',
              boxShadow: 'var(--box-shadow-sm)',
              fontVariantNumeric: 'tabular-nums',
              animation: timerCritical ? 'pulse 1s ease-in-out infinite' : 'none',
            }}>
              <Clock size={18} />
              {fmt(timeLeft)}
              {timerWarning && !timerCritical && <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: 2 }}>LOW</span>}
            </div>
          )}

          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={submitting}
            className="neo-btn"
            style={{ padding: '10px 24px', fontSize: '1rem', opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </button>
        </div>
      </header>

      {/* Draft restored banner */}
      {draftRestored && (
        <div style={{
          background: '#ecfdf5', borderBottom: '2px solid #10b981',
          padding: '8px 32px', fontSize: '0.82rem', fontWeight: 800,
          color: '#065f46', display: 'flex', alignItems: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <Wifi size={14} />
          Your previous answers have been restored from a local draft. Continue where you left off.
        </div>
      )}

      {/* ══ TWO-COLUMN CONTENT AREA ════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>

        {/* Left Side: Question Area */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-color)' }}>
          <main style={{
            padding: '36px 48px',
            maxWidth: 800, width: '100%',
            margin: '0 auto',
          }}>

            {/* Question counter + action buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.14em',
                color: 'var(--text-muted)',
              }}>
                Question {currentIndex + 1} / {exam.questions.length}
                <span style={{ marginLeft: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                  • {q.points} pts • {q.difficulty}
                </span>
              </span>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => toggleMark(q.id)}
                  className={isMarkedQ ? 'neo-btn neo-btn-accent' : 'neo-btn neo-btn-secondary'}
                  style={{ padding: '7px 16px', fontSize: '0.85rem', boxShadow: 'none' }}
                >
                  {isMarkedQ ? '★ Marked' : '☆ Mark for Review'}
                </button>
                {!isSubjective && (
                  <button
                    onClick={() => clearSelection(q.id)}
                    className="neo-btn"
                    style={{ padding: '7px 16px', fontSize: '0.85rem', background: '#e8e8e8', boxShadow: 'none' }}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {/* Question image */}
            {q.imageUrl && (
              <div style={{ marginBottom: 20 }}>
                <img
                  src={q.imageUrl} alt="Question"
                  style={{ maxWidth: '100%', maxHeight: 280, border: 'var(--border-width) solid var(--border-color)', borderRadius: 'var(--border-radius)', display: 'block' }}
                />
              </div>
            )}

            {/* Question text */}
            <p style={{ fontWeight: 700, fontSize: '1.15rem', lineHeight: 1.7, color: 'var(--text-color)', marginBottom: 28 }}>
              {q.text}
            </p>

            {/* ── Options or Subjective Textarea ── */}
            {isSubjective ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  background: '#fef9e7',
                  border: '2px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#666',
                }}>
                  ✍️ Write your answer in the text area below. Your response will be reviewed by the instructor.
                </div>
                <textarea
                  value={subjAnswer}
                  onChange={e => {
                    if (result) return;
                    setSubjectiveAnswers(prev => ({ ...prev, [q.id]: e.target.value }));
                    // mark as answered if has content
                    setAnswers(prev => ({ ...prev, [q.id]: e.target.value.trim() ? 'subjective_answered' : null }));
                  }}
                  disabled={!!result}
                  placeholder="Type your answer here..."
                  style={{
                    width: '100%',
                    minHeight: 200,
                    padding: '18px 20px',
                    fontSize: '1rem',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 500,
                    lineHeight: 1.7,
                    border: '2.5px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: '#fff',
                    resize: 'vertical',
                    boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.04)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>
                  {subjAnswer.length} characters typed
                </div>
              </div>
            ) : (
              <div style={{
                border: 'var(--border-width) solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                boxShadow: 'var(--box-shadow)',
                background: '#fff',
              }}>
                {q.options.map((opt, idx) => {
                  const isSel = selected === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        selectOption(q.id, opt.id);
                        // Auto-advance to next question after a brief visual confirmation delay
                        if (!isSel && !isLast) {
                          setTimeout(() => goTo(currentIndex + 1), 350);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        padding: '18px 20px',
                        background: isSel ? 'var(--primary)' : '#fff',
                        borderBottom: idx < q.options.length - 1
                          ? 'var(--border-width) solid var(--border-color)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease',
                        userSelect: 'none',
                      }}
                    >
                      {/* Letter badge */}
                      <span style={{
                        minWidth: 36, height: 36, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: '0.9rem',
                        background: isSel ? 'var(--text-color)' : 'var(--bg-color)',
                        color: isSel ? 'var(--primary)' : 'var(--text-color)',
                        border: 'var(--border-width) solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        transition: 'all 0.12s',
                      }}>
                        {LABELS[idx]}
                      </span>

                      {/* Text + optional image */}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: isSel ? 800 : 500, fontSize: '1rem', color: 'var(--text-color)' }}>
                          {opt.text}
                        </span>
                        {opt.imageUrl && (
                          <div style={{ marginTop: 8 }}>
                            <img src={opt.imageUrl} alt="Option" style={{ maxHeight: 140, maxWidth: '100%', border: '2px solid var(--border-color)', borderRadius: 4 }} />
                          </div>
                        )}
                      </div>

                      {/* Checkmark on selected */}
                      {isSel && (
                        <CheckCircle size={20} style={{ color: 'var(--text-color)', flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </main>
        </div>

        {/* Right Side: Sidebar Panel (Palette + Navigation) */}
        <div style={{
          width: 300,
          borderLeft: 'var(--border-width) solid var(--border-color)',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: 24,
          flexShrink: 0,
          overflowY: 'auto',
        }}>
          <div>
            <h3 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: 6, color: 'var(--text-color)' }}>
              Question Palette
            </h3>
            {/* Progress bar in sidebar */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>{attempted} answered</span>
                <span>{unanswered} remaining</span>
              </div>
              <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? 'var(--accent-green)' : 'var(--primary)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: progressPct === 100 ? '#065f46' : 'var(--text-muted)' }}>
              {progressPct === 100 ? '✓ All questions answered!' : `${progressPct}% complete`}
            </div>
          </div>

          {/* Integrity Status Chances indicator */}
          <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 20 }}>
            <h3 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: 10, color: 'var(--text-color)' }}>
              Integrity Status
            </h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: i <= remainingChances ? 'var(--accent-green)' : '#e5e7eb',
                  border: '2px solid var(--border-color)',
                }} />
              ))}
              <span style={{
                fontSize: '0.78rem', fontWeight: 800,
                color: remainingChances <= 1 ? 'var(--danger)' : 'var(--text-muted)',
              }}>
                {remainingChances} / 3
              </span>
            </div>
            {remainingChances <= 1 && (
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)', lineHeight: 1.4 }}>
                ⚠ Last chance! Next violation will auto-submit your exam.
              </div>
            )}
          </div>

          {/* Question Grid Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {exam.questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  fontSize: '0.85rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'Outfit, sans-serif',
                  ...pillStyle(idx),
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.78rem', fontWeight: 700, borderTop: '2px solid #f0f0f0', paddingTop: 20 }}>
            {[
              { label: 'Attempted',        bg: 'var(--accent-green)' },
              { label: 'Viewed',           bg: '#fff8d6'             },
              { label: 'Current',          bg: 'var(--primary)'      },
              { label: 'Marked for Review',bg: 'var(--accent)'       },
            ].map(({ label, bg }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: bg, border: '2px solid var(--border-color)', display: 'inline-block',
                }} />
                {label}
              </span>
            ))}
          </div>

          {/* Previous / Next buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 'auto', borderTop: '2px solid #f0f0f0', paddingTop: 20 }}>
            <button
              onClick={() => !isFirst && goTo(currentIndex - 1)}
              disabled={isFirst}
              className="neo-btn neo-btn-secondary"
              style={{ flex: 1, justifyContent: 'center', opacity: isFirst ? 0.4 : 1, cursor: isFirst ? 'not-allowed' : 'pointer', boxShadow: 'none' }}
            >
              <ChevronLeft size={18} /> Prev
            </button>
            <button
              onClick={() => !isLast && goTo(currentIndex + 1)}
              disabled={isLast}
              className="neo-btn"
              style={{ flex: 1, justifyContent: 'center', opacity: isLast ? 0.4 : 1, cursor: isLast ? 'not-allowed' : 'pointer', boxShadow: 'none' }}
            >
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>

      </div>

      {/* Security Warning Modal */}
      {showWarningModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          fontFamily: 'Outfit, sans-serif',
        }}>
          <div className="neo-card" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '32px' }}>
            <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
            <h2 style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: 12, color: 'var(--danger)', fontSize: '1.4rem' }}>
              Security Warning
            </h2>
            <p style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-color)' }}>
              You triggered an integrity violation ({lastViolationType.replace(/_/g, ' ')}).
            </p>
            {/* Dot indicators */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: i <= remainingChances ? 'var(--accent-green)' : 'var(--danger)',
                  border: '2px solid var(--border-color)',
                }} />
              ))}
            </div>
            <div style={{
              background: remainingChances === 1 ? 'var(--danger)' : '#fff7ed',
              color: remainingChances === 1 ? '#fff' : '#92400e',
              padding: '12px',
              borderRadius: 'var(--border-radius)',
              fontWeight: 900,
              fontSize: '1rem',
              marginBottom: 24,
              border: `2px solid ${remainingChances === 1 ? 'var(--danger)' : '#f59e0b'}`,
            }}>
              {remainingChances === 1
                ? '⚠ Last chance! One more violation will auto-submit your exam.'
                : `Remaining chances: ${remainingChances} / 3`}
            </div>
            <button
              onClick={() => {
                setShowWarningModal(false);
                if (!document.fullscreenElement) {
                  enterFullscreen();
                }
              }}
              className="neo-btn"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              I Understand, Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* Warning Toast notifications */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: showToast.type === 'error' ? '#fef3c7' : showToast.type === 'info' ? '#ecfdf5' : '#ffe0e0',
          color: showToast.type === 'error' ? '#92400e' : showToast.type === 'info' ? '#065f46' : 'var(--danger)',
          padding: '12px 24px',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--box-shadow-lg)',
          fontWeight: 800,
          zIndex: 10000,
          fontFamily: 'Outfit, sans-serif',
          border: `2px solid ${showToast.type === 'error' ? '#f59e0b' : showToast.type === 'info' ? '#10b981' : 'var(--danger)'}`,
          maxWidth: 480,
          textAlign: 'center',
          fontSize: '0.88rem',
        }}>
          {showToast.msg}
        </div>
      )}

      {/* ══ SUBMIT CONFIRMATION MODAL ════════════════════════════════════════ */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Outfit, sans-serif',
        }}>
          <div className="neo-card" style={{ maxWidth: 460, width: '90%', textAlign: 'center', padding: '40px 36px' }}>
            <CheckCircle size={48} style={{ color: unanswered > 0 ? '#ea580c' : 'var(--accent-green)', margin: '0 auto 20px', display: 'block' }} />
            <h2 style={{ fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', marginBottom: 12 }}>
              Submit Quiz?
            </h2>

            {/* Answered / Unanswered stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{
                flex: 1, padding: '14px 10px', borderRadius: 'var(--border-radius)',
                background: 'var(--accent-green)', border: '2px solid var(--border-color)',
                fontWeight: 900,
              }}>
                <div style={{ fontSize: '1.6rem' }}>{attempted}</div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Answered</div>
              </div>
              <div style={{
                flex: 1, padding: '14px 10px', borderRadius: 'var(--border-radius)',
                background: unanswered > 0 ? '#ffe4e4' : '#f0fdf4',
                border: `2px solid ${unanswered > 0 ? 'var(--danger)' : '#bbf7d0'}`,
                fontWeight: 900,
                color: unanswered > 0 ? 'var(--danger)' : '#065f46',
              }}>
                <div style={{ fontSize: '1.6rem' }}>{unanswered}</div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Unanswered</div>
              </div>
            </div>

            {unanswered > 0 && (
              <div style={{
                background: '#fff7ed', border: '2px solid #f59e0b',
                borderRadius: 'var(--border-radius)', padding: '10px 14px',
                fontSize: '0.82rem', fontWeight: 700, color: '#92400e',
                marginBottom: 16, textAlign: 'left',
              }}>
                ⚠ You have {unanswered} unanswered question{unanswered > 1 ? 's' : ''}. Unanswered questions score 0 points.
              </div>
            )}

            <p style={{ color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.6, fontSize: '0.9rem' }}>
              You <strong>cannot</strong> change your answers after submitting.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="neo-btn neo-btn-secondary"
                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              >
                Go Back
              </button>
              <button
                onClick={() => { setShowSubmitModal(false); handleSubmit(); }}
                disabled={submitting}
                className="neo-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '12px', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Submitting…' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Proctoring Video Feed */}
      {cameraStream && isFullscreenActive && !result && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: '160px',
          height: '120px',
          borderRadius: 'var(--border-radius)',
          border: '3px solid var(--border-color)',
          boxShadow: 'var(--box-shadow-lg)',
          overflow: 'hidden',
          backgroundColor: '#000',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <video
            ref={proctorVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            color: '#fff',
            fontSize: '0.62rem',
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <span className="neo-blink" style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#ff3b30',
              display: 'inline-block'
            }} />
            Live Proctoring
          </div>
        </div>
      )}

      {/* ── Pulse animation for critical timer ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.03); }
        }
      `}</style>

    </div>
  );
};

export default ExamSession;
