import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
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

const ExamSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
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
  const [showToast, setShowToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const windowViolationFiredRef = useRef<boolean>(false);

  // Submit confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Feedback state
  const [rating, setRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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

  // Trigger temporary warning toast
  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setShowToast(msg);
    toastTimeoutRef.current = setTimeout(() => setShowToast(null), 4000);
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
          setTimeLeft(data.exam.durationMinutes * 60);
          const init: Record<string, string | null> = {};
          data.exam.questions.forEach((q: Question) => { init[q.id] = null; });
          setAnswers(init);
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
    setSubmitting(true);
    try {
      const res = await apiFetch(`/student/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.keys(answers).map(qId => ({ questionId: qId, optionId: answers[qId] })),
          isTerminated: true
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
      setResult({ score: data.score, totalPoints: data.totalPoints });
      setError('Your exam has been automatically submitted because the maximum number of integrity violations was exceeded.');
    } catch {
      setError('Network error during submission.');
    } finally {
      setSubmitting(false);
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

  // Tab switch & Window focus listener
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
        // Visible again — reset the flag
        windowViolationFiredRef.current = false;
      }
    };

    const handleBlur = () => {
      if (!windowViolationFiredRef.current) {
        windowViolationFiredRef.current = true;
        setIsPaused(true);
        reportViolation('WINDOW_BLUR');
      }
    };

    const handleFocus = () => {
      // Reset flag when user returns to window
      windowViolationFiredRef.current = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
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
    setSubmitting(true);
    try {
      const res = await apiFetch(`/student/exams/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.keys(answers).map(qId => ({ questionId: qId, optionId: answers[qId] })),
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      }
      if (res.ok) setResult({ score: data.score, totalPoints: data.totalPoints });
      else setError(data.message || 'Submission failed.');
    } catch {
      setError('Network error during submission.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, exam, result, submitting]);

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'rgba(0,0,0,0.85)', padding: 24, fontFamily: 'Outfit, sans-serif', zIndex: 10000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
        <div className="neo-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: '40px', background: '#fff' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 20px' }} />
          <h2 style={{ fontWeight: 900, marginBottom: 12, textTransform: 'uppercase' }}>Exam Paused</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.6 }}>
            The exam has been paused because the window lost focus or you switched tabs. Click the button below to resume.
          </p>
          <button
            onClick={() => {
              setIsPaused(false);
              if (!document.fullscreenElement) {
                enterFullscreen();
              }
            }}
            className="neo-btn"
            style={{ margin: '0 auto', fontSize: '1.05rem', padding: '12px 28px' }}
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
              Accept Requirements & Start Exam
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
    const pct = Math.round((result.score / result.totalPoints) * 100);
    const passed = pct >= 60;

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
            <p style={{ color: 'var(--text-muted)', marginBottom: 36 }}>Your responses have been graded automatically.</p>

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
  const isFirst    = currentIndex === 0;
  const isLast     = currentIndex === exam.questions.length - 1;
  const attempted  = Object.values(answers).filter(v => v !== null).length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', overflow: 'hidden',
      background: 'var(--bg-color)',
      fontFamily: 'Outfit, sans-serif',
    }}>

      {/* ══ STICKY TOP HEADER ══════════════════════════════════════════════════ */}
      <header style={{
        background: '#ffffff',
        borderBottom: 'var(--border-width) solid var(--border-color)',
        padding: '0 32px',
        height: 68,
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

        {/* Right: timer + submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          {timeLeft !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              border: 'var(--border-width) solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              background: timeLeft < 300 ? 'var(--danger)' : 'var(--primary)',
              color: timeLeft < 300 ? '#fff' : 'var(--text-color)',
              fontWeight: 900, fontSize: '1.1rem',
              boxShadow: 'var(--box-shadow-sm)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <Clock size={18} />
              {fmt(timeLeft)}
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
                <button
                  onClick={() => clearSelection(q.id)}
                  className="neo-btn"
                  style={{ padding: '7px 16px', fontSize: '0.85rem', background: '#e8e8e8', boxShadow: 'none' }}
                >
                  Clear Selection
                </button>
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

            {/* ── Options ── */}
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
                    onClick={() => selectOption(q.id, opt.id)}
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
                  </div>
                );
              })}
            </div>

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
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              {attempted} of {exam.questions.length} answered
            </div>
          </div>

          {/* Integrity Status Chances indicator */}
          <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: 20 }}>
            <h3 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.08em', marginBottom: 6, color: 'var(--text-color)' }}>
              Integrity Status
            </h3>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: remainingChances === 1 ? 'var(--danger)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: remainingChances === 1 ? 'var(--danger)' : 'var(--accent-green)',
                display: 'inline-block'
              }} />
              Remaining Chances: {remainingChances} / 3
            </div>
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
              Warning: You triggered an integrity violation ({lastViolationType.replace('_', ' ')}).
            </p>
            <div style={{
              background: 'var(--danger)',
              color: '#fff',
              padding: '12px',
              borderRadius: 'var(--border-radius)',
              fontWeight: 900,
              fontSize: '1.1rem',
              marginBottom: 24,
              border: '2px solid var(--border-color)',
            }}>
              Remaining chances: {remainingChances} / 3
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
          background: '#ffe0e0',
          color: 'var(--danger)',
          padding: '12px 24px',
          borderRadius: 'var(--border-radius)',
          boxShadow: 'var(--box-shadow-lg)',
          fontWeight: 800,
          zIndex: 10000,
          fontFamily: 'Outfit, sans-serif',
          border: '2px solid var(--danger)',
        }}>
          {showToast}
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
          <div className="neo-card" style={{ maxWidth: 440, width: '90%', textAlign: 'center', padding: '40px 36px' }}>
            <CheckCircle size={48} style={{ color: 'var(--primary)', margin: '0 auto 20px', display: 'block' }} />
            <h2 style={{ fontWeight: 900, fontSize: '1.4rem', textTransform: 'uppercase', marginBottom: 12 }}>
              Submit Quiz?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.6 }}>
              You have answered <strong>{Object.values(answers).filter(v => v !== null).length}</strong> out of <strong>{exam.questions.length}</strong> questions.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.6 }}>
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

    </div>
  );
};

export default ExamSession;
