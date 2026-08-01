import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import {
  Camera,
  Mic,
  Maximize,
  Clock,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  FileText,
  ChevronRight,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string | null;
}

interface Question {
  id: string;
  text: string;
  imageUrl?: string | null;
  difficulty: string;
  points: number;
  type: 'MCQ' | 'SUBJECTIVE';
  options?: QuestionOption[];
}

interface Subject {
  id: string;
  name: string;
  questions: Question[];
}

interface FinalExamData {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  syllabus?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  gracePeriodSeconds: number;
  subjects: Subject[];
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  submitted: boolean;
  score?: string | null;
}

export const FinalExamLobby: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Lifecycle states: 'SETUP' -> 'LOBBY' (waiting room) -> 'EXAM' -> 'SUBMITTED'
  const [phase, setPhase] = useState<'SETUP' | 'LOBBY' | 'EXAM' | 'SUBMITTED'>('SETUP');

  // Exam Data
  const [exam, setExam] = useState<FinalExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [remainingChances, setRemainingChances] = useState<number>(3);

  // Pre-exam hardware permissions
  const [cameraGranted, setCameraGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const examVideoRef = useRef<HTMLVideoElement | null>(null); // in-exam overlay
  const mediaStreamRef = useRef<MediaStream | null>(null); // persistent stream ref
  const [micLevel, setMicLevel] = useState<number>(0);

  // Post-exam feedback state
  const [rating, setRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // In-exam camera overlay UI state
  const [cameraMinimized, setCameraMinimized] = useState(false);

  // Countdown until start time
  const [timeUntilStart, setTimeUntilStart] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [canStart, setCanStart] = useState(false);

  // Exam session states
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId?: string; subjectiveAnswer?: string }>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Proctoring Grace Period states
  const [showGraceModal, setShowGraceModal] = useState(false);
  const [graceCountdown, setGraceCountdown] = useState<number>(10);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSubmittingRef = useRef(false);

  // Modal confirm submit
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  // 1. Fetch Exam details
  const fetchFinalExam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/student/final-exam', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.finalExam && data.finalExam.id === id) {
          setExam(data.finalExam);
          if (data.finalExam.submitted) {
            setPhase('SUBMITTED');
          }
        } else {
          setError('Exam details not found or invalid.');
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to load final exam.');
      }
    } catch {
      setError('Network error connecting to API.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFinalExam();
  }, [fetchFinalExam]);

  // 2. Camera & Mic request
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream; // persist stream across phases
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraGranted(true);
      setMicGranted(true);

      // Mic level monitor
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkMic = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          requestAnimationFrame(checkMic);
        };
        checkMic();
      } catch (err) {
        console.warn('Audio level check failed:', err);
      }
    } catch (err) {
      console.error('Media permission denied:', err);
      alert('Camera and Microphone permissions are required to enter the final exam hall.');
    }
  };

  // Attach persisted stream to exam overlay video when it mounts or un-minimizes
  useEffect(() => {
    if (phase === 'EXAM' && examVideoRef.current && mediaStreamRef.current) {
      if (examVideoRef.current.srcObject !== mediaStreamRef.current) {
        examVideoRef.current.srcObject = mediaStreamRef.current;
      }
    }
  }, [phase, cameraMinimized]);

  // Fullscreen helper
  const requestFullscreenMode = () => {
    const doc = document.documentElement;
    if (doc.requestFullscreen) doc.requestFullscreen();
    else if ((doc as any).mozRequestFullScreen) (doc as any).mozRequestFullScreen();
    else if ((doc as any).webkitRequestFullscreen) (doc as any).webkitRequestFullscreen();
    else if ((doc as any).msRequestFullscreen) (doc as any).msRequestFullscreen();
  };

  // Track Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreenActive(isFs);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 3. Lobby Countdown Timer to start time
  useEffect(() => {
    if (!exam || phase === 'EXAM' || phase === 'SUBMITTED') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(exam.startTime).getTime();
      const diff = start - now;

      if (diff <= 0) {
        setCanStart(true);
        setTimeUntilStart({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        setCanStart(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeUntilStart({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [exam, phase]);

  // 4. Start Exam handler
  const handleStartExam = async () => {
    if (!canStart) return;
    if (!isFullscreenActive) {
      alert('Please enter Full Screen mode before launching the examination.');
      requestFullscreenMode();
      return;
    }

    try {
      const res = await apiFetch(`/student/final-exam/${exam?.id}/start`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setAttemptId(data.attemptId);
        setRemainingChances(data.remainingChances);
        setSecondsRemaining((exam?.durationMinutes || 60) * 60);
        setPhase('EXAM');
      } else {
        alert(data.message || 'Could not start exam.');
      }
    } catch {
      alert('Network error while starting exam.');
    }
  };

  // 5. Exam Session Timer
  useEffect(() => {
    if (phase !== 'EXAM') return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  // 5b. Silent Random-Interval Proctoring Snapshots
  useEffect(() => {
    if (phase !== 'EXAM' || !exam?.id) return;

    let snapshotTimeout: ReturnType<typeof setTimeout> | null = null;

    const captureAndUpload = async () => {
      try {
        // Prefer in-exam overlay video, fallback to lobby video
        const video = examVideoRef.current || videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;

        // Draw frame onto a canvas at reduced quality to keep payload small (~60-80KB)
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.5); // 50% quality JPEG

        // Fire & forget — don't await or show errors to student
        apiFetch(`/student/final-exam/${exam.id}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData }),
          credentials: 'include',
        }).catch(() => { /* silently ignore upload failures */ });
      } catch {
        // never surface errors to student
      }

      // Schedule next snapshot at a random interval between 45–120 seconds
      const nextDelay = Math.floor(Math.random() * (120_000 - 45_000 + 1)) + 45_000;
      snapshotTimeout = setTimeout(captureAndUpload, nextDelay);
    };

    // Take first snapshot after a random delay of 20–60 seconds
    const firstDelay = Math.floor(Math.random() * (60_000 - 20_000 + 1)) + 20_000;
    snapshotTimeout = setTimeout(captureAndUpload, firstDelay);

    return () => {
      if (snapshotTimeout) clearTimeout(snapshotTimeout);
    };
  }, [phase, exam?.id]);

  // 6. Enhanced Proctoring Violation with Grace Period Countdown
  const triggerViolationGracePeriod = useCallback(() => {
    if (phase !== 'EXAM' || isSubmittingRef.current || showGraceModal) return;

    const graceTime = exam?.gracePeriodSeconds || 10;
    setGraceCountdown(graceTime);
    setShowGraceModal(true);

    if (graceTimerRef.current) clearInterval(graceTimerRef.current);

    graceTimerRef.current = setInterval(() => {
      setGraceCountdown(prev => {
        if (prev <= 1) {
          clearInterval(graceTimerRef.current!);
          // Grace period expired! Log violation now
          logProctoringViolation('FULLSCREEN_EXIT_TIMEOUT');
          setShowGraceModal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [phase, showGraceModal, exam]);

  // Handle student returning to window before countdown ends
  const checkReturnToExam = useCallback(() => {
    if (!showGraceModal) return;
    const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
    if (isFs && document.hasFocus()) {
      // Returned safely within grace period!
      if (graceTimerRef.current) clearInterval(graceTimerRef.current);
      setShowGraceModal(false);
      // Log minor warning / violation chance deduction
      logProctoringViolation('FULLSCREEN_EXIT_WARNING');
    }
  }, [showGraceModal]);

  // Event Listeners for Proctoring
  useEffect(() => {
    if (phase !== 'EXAM') return;

    const onFullscreenChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      if (!isFs) {
        triggerViolationGracePeriod();
      } else {
        checkReturnToExam();
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        triggerViolationGracePeriod();
      } else {
        checkReturnToExam();
      }
    };

    const onBlur = () => {
      triggerViolationGracePeriod();
    };

    const onFocus = () => {
      checkReturnToExam();
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    // ── Anti-cheating & security event listeners ──
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Examination is in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const preventSelection = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return; // allow cursor navigation inside subjective textarea
      }
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Block F12 & DevTools
      if (e.key === 'F12' || e.keyCode === 123 || (isCtrlOrCmd && e.shiftKey && (key === 'i' || key === 'c' || key === 'j'))) {
        e.preventDefault();
        logProctoringViolation('DEVTOOLS_SHORTCUT');
        return false;
      }

      // Block F5 & Refresh (Ctrl+R / Cmd+R / Ctrl+Shift+R)
      if (e.key === 'F5' || (isCtrlOrCmd && key === 'r')) {
        e.preventDefault();
        return false;
      }

      // Block Copy, Paste, Cut, Print, Save, View Source
      if (isCtrlOrCmd && (key === 'c' || key === 'v' || key === 'x' || key === 'u' || key === 's' || key === 'p')) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventCopyPaste);
    window.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventCopyPaste);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [phase, triggerViolationGracePeriod, checkReturnToExam]);

  // Log Violation to Backend API
  const logProctoringViolation = async (type: string) => {
    if (!attemptId || !exam) return;
    try {
      const res = await apiFetch(`/student/final-exam/${exam.id}/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, type, metadata: `Window lost focus/fullscreen` }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setRemainingChances(data.remainingChances);
        if (data.remainingChances <= 0) {
          alert('Proctoring alert: You have exceeded the maximum allowed violations. Your examination is being terminated now.');
          handleFinalSubmit(true);
        }
      }
    } catch (err) {
      console.error('Violation logging failed:', err);
    }
  };

  // Submit Exam API
  const handleFinalSubmit = async (isTerminated = false) => {
    if (submitting || !exam) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    const answersPayload = Object.keys(answers).map(qKey => {
      const [subjectId, questionId] = qKey.split('__');
      return {
        subjectId,
        questionId,
        optionId: answers[qKey].optionId || null,
        subjectiveAnswer: answers[qKey].subjectiveAnswer || null,
      };
    });

    try {
      const res = await apiFetch(`/student/final-exam/${exam.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload, isTerminated }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissionResult(data);
        setPhase('SUBMITTED');
        setShowSubmitModal(false);
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        // Stop camera/mic stream after submission
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
      } else {
        alert(data.message || 'Submission failed.');
      }
    } catch {
      alert('Network error while submitting exam.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render Helpers
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-color)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Loading Final Examination...</h2>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-color)', minHeight: '100vh' }}>
        <div className="neo-card" style={{ maxWidth: '600px', margin: '0 auto', background: '#fff', padding: '40px' }}>
          <ShieldAlert size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontWeight: 900, textTransform: 'uppercase' }}>Unable to Access Exam Hall</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error || 'Exam not found'}</p>
          <button onClick={() => navigate('/student')} className="neo-btn" style={{ padding: '10px 24px' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EXAM ENDED (not submitted) — access guard
  // ───────────────────────────────────────────────────────────────────────────
  if ((phase === 'SETUP' || phase === 'LOBBY') && exam.status === 'ENDED') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="neo-card" style={{ background: '#1e1e1e', border: '2px solid #ef4444', maxWidth: '580px', width: '100%', padding: '40px', textAlign: 'center' }}>
          <ShieldAlert size={56} color="#ef4444" style={{ margin: '0 auto 20px' }} />
          <span style={{ background: '#ef4444', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>Exam Ended</span>
          <h2 style={{ fontWeight: 900, textTransform: 'uppercase', margin: '16px 0 8px', color: '#fff' }}>{exam.title}</h2>
          <p style={{ color: '#9ca3af', lineHeight: 1.6, marginBottom: '28px' }}>
            This examination has ended and is no longer accepting submissions. The exam concluded at <strong style={{ color: '#fff' }}>{new Date(exam.endTime).toLocaleString()}</strong>.
          </p>
          <button onClick={() => navigate('/student')} className="neo-btn" style={{ padding: '12px 28px', fontSize: '1rem', width: '100%', justifyContent: 'center' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 1 & 2: SETUP / LOBBY (Permissions & Waiting Room)
  // ───────────────────────────────────────────────────────────────────────────
  if (phase === 'SETUP' || phase === 'LOBBY') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', padding: '40px 20px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
            <div>
              <span style={{ backgroundColor: 'var(--primary)', color: '#1a1a1a', padding: '4px 10px', borderRadius: '4px', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Final Examination Hall
              </span>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '8px 0 4px', textTransform: 'uppercase' }}>{exam.title}</h1>
              <p style={{ color: '#aaa', margin: 0, fontSize: '0.95rem' }}>Fixed Duration: <strong>{exam.durationMinutes} Minutes</strong> · Multi-Subject Module</p>
            </div>
            <button onClick={() => navigate('/student')} className="neo-btn neo-btn-secondary" style={{ padding: '8px 16px', color: '#fff', borderColor: '#444' }}>
              Dashboard
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>

            {/* Left Column: Instructions & Syllabus & Countdown */}
            <div>
              {/* Waiting Room Countdown Card */}
              <div style={{ background: '#1e1e1e', border: '2px solid var(--primary)', borderRadius: '12px', padding: '24px', marginBottom: '24px', textAlign: 'center' }}>
                <Clock size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, margin: '0 0 8px', letterSpacing: '0.05em' }}>
                  {canStart ? 'Exam is Live Now!' : 'Exam Starts In'}
                </h3>

                {canStart ? (
                  <div style={{ color: '#4ade80', fontSize: '1.2rem', fontWeight: 900, margin: '12px 0 20px' }}>
                    🟢 The examination has begun. Complete your checks to enter.
                  </div>
                ) : timeUntilStart ? (
                  <div style={{ fontSize: '2.8rem', fontWeight: 900, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: '2px', margin: '12px 0 20px' }}>
                    {String(timeUntilStart.hours).padStart(2, '0')}:{String(timeUntilStart.minutes).padStart(2, '0')}:{String(timeUntilStart.seconds).padStart(2, '0')}
                  </div>
                ) : null}

                <div style={{ fontSize: '0.85rem', color: '#888' }}>
                  Fixed Time Schedule: <strong>{new Date(exam.startTime).toLocaleString()}</strong> to <strong>{new Date(exam.endTime).toLocaleString()}</strong>
                </div>
              </div>

              {/* Instructions */}
              <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                  <FileText size={20} /> Examination Instructions
                </h3>
                <div style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                  {exam.instructions || `1. Maintain continuous camera and microphone access.
2. Full Screen mode is mandatory. Exiting full screen will trigger a proctoring warning.
3. You have a 10-second grace period to return to full screen if interrupted.
4. All subjects must be attempted within the combined duration limit.`}
                </div>
              </div>

              {/* Syllabus */}
              {exam.syllabus && (
                <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                    <BookOpen size={20} /> Examination Syllabus
                  </h3>
                  <div style={{ color: '#ccc', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                    {exam.syllabus}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Pre-exam System Verification */}
            <div>
              <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px', top: '20px' }}>
                <h3 style={{ textTransform: 'uppercase', fontWeight: 900, marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                  Hardware Checks
                </h3>

                {/* Video Stream Preview */}
                <div style={{ position: 'relative', width: '100%', height: '180px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', border: '2px solid #333', marginBottom: '16px' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {!cameraGranted && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', padding: '16px', textAlign: 'center' }}>
                      <Camera size={32} color="#888" style={{ marginBottom: '8px' }} />
                      <span style={{ fontSize: '0.85rem', color: '#aaa', fontWeight: 700 }}>Webcam preview off</span>
                    </div>
                  )}
                </div>

                {/* Status List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#262626', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700 }}>
                      <Camera size={16} /> Webcam Access
                    </span>
                    {cameraGranted ? <CheckCircle size={18} color="#4ade80" /> : <button onClick={requestMediaPermissions} className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Allow</button>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#262626', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700 }}>
                      <Mic size={16} /> Mic Input ({micLevel}%)
                    </span>
                    {micGranted ? <CheckCircle size={18} color="#4ade80" /> : <button onClick={requestMediaPermissions} className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Allow</button>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#262626', borderRadius: '6px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700 }}>
                      <Maximize size={16} /> Fullscreen Mode
                    </span>
                    {isFullscreenActive ? <CheckCircle size={18} color="#4ade80" /> : <button onClick={requestFullscreenMode} className="neo-btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Enable</button>}
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  onClick={handleStartExam}
                  disabled={!canStart || !cameraGranted || !micGranted}
                  className="neo-btn"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: 900,
                    justifyContent: 'center',
                    backgroundColor: canStart && cameraGranted && micGranted ? 'var(--primary)' : '#333',
                    color: canStart && cameraGranted && micGranted ? '#1a1a1a' : '#888',
                    cursor: canStart && cameraGranted && micGranted ? 'pointer' : 'not-allowed',
                  }}
                >
                  {canStart ? 'Enter Exam Hall' : 'Complete Setup First'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 3: ACTIVE EXAM (Multi-Subject Exam Interface)
  // ───────────────────────────────────────────────────────────────────────────
  if (phase === 'EXAM') {
    const currentSubject = exam.subjects[activeSubjectIdx];
    const currentQuestion = currentSubject?.questions[activeQuestionIdx];
    const answerKey = `${currentSubject?.id}__${currentQuestion?.id}`;
    const selectedAnswer = answers[answerKey] || {};
    const isLastQuestionInSubject = activeQuestionIdx === (currentSubject?.questions.length || 1) - 1;

    // Calculate total questions & total answered across ALL subjects
    const totalAllQuestions = exam.subjects.reduce((sum, s) => sum + s.questions.length, 0);
    const totalAnsweredQuestions = exam.subjects.reduce((sum, s) => {
      return sum + s.questions.filter(q => {
        const k = `${s.id}__${q.id}`;
        const ans = answers[k];
        if (!ans) return false;
        if (q.type === 'SUBJECTIVE') return (ans.subjectiveAnswer || '').trim().length > 0;
        return !!ans.optionId;
      }).length;
    }, 0);
    const overallProgressPct = totalAllQuestions > 0 ? Math.round((totalAnsweredQuestions / totalAllQuestions) * 100) : 0;

    const handleSelectOption = (optId: string) => {
      setAnswers(prev => ({ ...prev, [answerKey]: { optionId: optId } }));
      if (!isLastQuestionInSubject) {
        setTimeout(() => {
          setActiveQuestionIdx(prev => prev + 1);
        }, 350);
      }
    };

    const handleClearSelection = () => {
      setAnswers(prev => {
        const next = { ...prev };
        delete next[answerKey];
        return next;
      });
    };

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: 'Outfit, sans-serif', userSelect: 'none' }}>

        {/* ══ TOP GLOBAL PROGRESS BAR ════════════════════════════════════════════ */}
        <div style={{ height: '5px', backgroundColor: '#e2e8f0', width: '100%', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${overallProgressPct}%`,
            backgroundColor: overallProgressPct === 100 ? '#10b981' : 'var(--primary)',
            transition: 'width 0.4s ease'
          }} />
        </div>

        {/* ══ STICKY EXAM HEADER ══════════════════════════════════════════════════ */}
        <header style={{ background: '#111827', color: '#fff', padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid var(--primary)', flexShrink: 0 }}>
          <div>
            <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              OFFICIAL FINAL EXAMINATION
            </span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.01em' }}>{exam.title}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Remaining Chances Badge */}
            <div style={{ background: '#1f2937', padding: '6px 14px', borderRadius: '6px', border: '1px solid #374151', fontSize: '0.82rem', fontWeight: 800 }}>
              Chances Left: <span style={{ color: remainingChances <= 1 ? '#ef4444' : '#4ade80' }}>{remainingChances} / 3</span>
            </div>

            {/* Live Digital Timer */}
            <div style={{
              background: secondsRemaining < 300 ? '#ef4444' : 'var(--primary)',
              color: secondsRemaining < 300 ? '#ffffff' : '#1a1a1a',
              padding: '8px 18px',
              borderRadius: '6px',
              fontWeight: 900,
              fontSize: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontVariantNumeric: 'tabular-nums'
            }}>
              <Clock size={18} /> {formatTime(secondsRemaining)}
            </div>

            <button onClick={() => setShowSubmitModal(true)} className="neo-btn neo-btn-danger" style={{ padding: '8px 20px', fontWeight: 900, fontSize: '0.9rem' }}>
              Submit Exam
            </button>
          </div>
        </header>

        {/* ══ MULTI-SUBJECT NAVIGATION TABS ══════════════════════════════════════ */}
        <div style={{ background: '#ffffff', borderBottom: '2px solid #e2e8f0', padding: '0 28px', display: 'flex', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
          {exam.subjects.map((subj, idx) => {
            const isActive = idx === activeSubjectIdx;
            const answeredInSubj = subj.questions.filter(q => {
              const k = `${subj.id}__${q.id}`;
              const ans = answers[k];
              if (!ans) return false;
              if (q.type === 'SUBJECTIVE') return (ans.subjectiveAnswer || '').trim().length > 0;
              return !!ans.optionId;
            }).length;

            return (
              <button
                key={subj.id}
                onClick={() => { setActiveSubjectIdx(idx); setActiveQuestionIdx(0); }}
                style={{
                  padding: '14px 22px',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  border: 'none',
                  borderBottom: isActive ? '4px solid var(--primary)' : '4px solid transparent',
                  backgroundColor: isActive ? '#f8fafc' : 'transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                {subj.name}
                <span style={{
                  background: isActive ? 'var(--primary)' : '#e2e8f0',
                  color: '#0f172a',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 900
                }}>
                  {answeredInSubj} / {subj.questions.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══ TWO-COLUMN MAIN CONTENT AREA ═══════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', padding: '24px', maxWidth: '1600px', margin: '0 auto', width: '100%', boxSizing: 'border-block-axis' as any }}>

          {/* LEFT MAIN QUESTION COLUMN */}
          <div className="neo-card" style={{ background: '#ffffff', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '12px' }}>
            {currentQuestion ? (
              <div>
                {/* Meta Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.06em' }}>
                      Question {activeQuestionIdx + 1} of {currentSubject.questions.length} • {currentSubject.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '4px', fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {currentQuestion.type}
                    </span>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '4px', fontWeight: 900, fontSize: '0.75rem' }}>
                      {currentQuestion.points} Points
                    </span>

                    <button
                      onClick={() => setMarkedForReview(prev => ({ ...prev, [answerKey]: !prev[answerKey] }))}
                      className={markedForReview[answerKey] ? 'neo-btn neo-btn-accent' : 'neo-btn neo-btn-secondary'}
                      style={{ padding: '6px 14px', fontSize: '0.8rem', backgroundColor: markedForReview[answerKey] ? '#f59e0b' : '#fff' }}
                    >
                      {markedForReview[answerKey] ? '★ Marked' : '☆ Mark for Review'}
                    </button>

                    {currentQuestion.type === 'MCQ' && selectedAnswer.optionId && (
                      <button
                        onClick={handleClearSelection}
                        className="neo-btn"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#e2e8f0', boxShadow: 'none' }}
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px', lineHeight: 1.6 }}>
                  {currentQuestion.text}
                </h3>

                {/* Question Image if present */}
                {currentQuestion.imageUrl && (
                  <div style={{ marginBottom: '24px' }}>
                    <img src={currentQuestion.imageUrl} alt="Question Diagram" style={{ maxWidth: '100%', maxHeight: '280px', borderRadius: '8px', border: '2px solid #e2e8f0', display: 'block' }} />
                  </div>
                )}

                {/* Answer Options / Response Input */}
                {currentQuestion.type === 'MCQ' ? (
                  /* SINGLE-CARD STACKED MCQ OPTIONS (Matching ExamSession.tsx UX) */
                  <div style={{
                    border: '2px solid var(--border-color)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff',
                    boxShadow: 'var(--box-shadow-sm)'
                  }}>
                    {currentQuestion.options?.map((opt, optIdx) => {
                      const isSelected = selectedAnswer.optionId === opt.id;
                      const letterLabel = String.fromCharCode(65 + optIdx);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(opt.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '18px 20px',
                            backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                            borderBottom: optIdx < (currentQuestion.options?.length || 0) - 1 ? '2px solid #e2e8f0' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          {/* Letter Circle Badge */}
                          <span style={{
                            minWidth: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: isSelected ? '#1a1a1a' : '#f1f5f9',
                            color: isSelected ? 'var(--primary)' : '#0f172a',
                            border: '2px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '0.9rem'
                          }}>
                            {letterLabel}
                          </span>

                          {/* Option text + image */}
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: isSelected ? 900 : 600, color: '#0f172a' }}>
                              {opt.text}
                            </span>
                            {opt.imageUrl && (
                              <div style={{ marginTop: '8px' }}>
                                <img
                                  src={opt.imageUrl}
                                  alt={`Option ${letterLabel}`}
                                  style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '6px', border: '1.5px solid #cbd5e1', objectFit: 'contain' }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Selected Checkmark */}
                          {isSelected && (
                            <CheckCircle size={22} color="#1a1a1a" style={{ flexShrink: 0 }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* SUBJECTIVE TEXTAREA */
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      backgroundColor: '#fffbeb',
                      border: '2px solid #fde68a',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#92400e',
                      marginBottom: '14px'
                    }}>
                      ✍️ Type your complete subjective response in the box below. Your answer will be reviewed and graded by the evaluator.
                    </div>
                    <textarea
                      value={selectedAnswer.subjectiveAnswer || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [answerKey]: { subjectiveAnswer: e.target.value } }))}
                      className="neo-input"
                      rows={9}
                      placeholder="Type your detailed answer here..."
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        fontSize: '1rem',
                        padding: '18px',
                        lineHeight: 1.6,
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, textAlign: 'right', marginTop: '6px' }}>
                      {selectedAnswer.subjectiveAnswer ? selectedAnswer.subjectiveAnswer.trim().split(/\s+/).filter(Boolean).length : 0} Words · {selectedAnswer.subjectiveAnswer ? selectedAnswer.subjectiveAnswer.length : 0} Characters
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>No questions found in this subject.</p>
            )}

            {/* Bottom Nav Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '2px solid #f1f5f9' }}>
              <button
                disabled={activeQuestionIdx === 0}
                onClick={() => setActiveQuestionIdx(prev => prev - 1)}
                className="neo-btn neo-btn-secondary"
                style={{ padding: '10px 22px', opacity: activeQuestionIdx === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Previous
              </button>

              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                Question {activeQuestionIdx + 1} of {currentSubject?.questions.length}
              </div>

              <button
                disabled={isLastQuestionInSubject && activeSubjectIdx === exam.subjects.length - 1}
                onClick={() => {
                  if (isLastQuestionInSubject) {
                    if (activeSubjectIdx < exam.subjects.length - 1) {
                      setActiveSubjectIdx(prev => prev + 1);
                      setActiveQuestionIdx(0);
                    }
                  } else {
                    setActiveQuestionIdx(prev => prev + 1);
                  }
                }}
                className="neo-btn"
                style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isLastQuestionInSubject ? 'Next Subject' : 'Next Question'} <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* RIGHT SIDEBAR COLUMN (Proctoring + Progress + Palette) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
            
            {/* 1. Camera Proctoring Box */}
            <div className="neo-card" style={{ background: '#111827', color: '#fff', padding: '16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', color: '#f43f5e', letterSpacing: '0.05em' }}>
                    PROCTORING LIVE
                  </span>
                </div>
                <button
                  onClick={() => setCameraMinimized(prev => !prev)}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                >
                  {cameraMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
              </div>

              {!cameraMinimized && (
                <>
                  <div style={{ position: 'relative', width: '100%', height: '155px', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', border: '2px solid #374151' }}>
                    <video
                      ref={(el) => {
                        examVideoRef.current = el;
                        if (el && mediaStreamRef.current && el.srcObject !== mediaStreamRef.current) {
                          el.srcObject = mediaStreamRef.current;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    />
                  </div>

                  {/* Mic Meter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mic size={12} color="var(--primary)" /> Mic Input</span>
                      <span style={{ color: micLevel > 60 ? '#ef4444' : micLevel > 30 ? '#f59e0b' : '#4ade80' }}>{micLevel}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#374151', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${micLevel}%`,
                        backgroundColor: micLevel > 60 ? '#ef4444' : micLevel > 30 ? '#f59e0b' : '#4ade80',
                        borderRadius: '3px',
                        transition: 'width 0.1s ease'
                      }} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 2. Overall Progress Overview */}
            <div className="neo-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 10px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.85rem' }}>Exam Progress</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 800, color: '#64748b', marginBottom: '6px' }}>
                <span>{totalAnsweredQuestions} Answered</span>
                <span>{totalAllQuestions - totalAnsweredQuestions} Remaining</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${overallProgressPct}%`, backgroundColor: overallProgressPct === 100 ? '#10b981' : 'var(--primary)', transition: 'width 0.3s ease' }} />
              </div>
            </div>

            {/* 3. Question Palette Grid */}
            <div className="neo-card" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 16px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.88rem' }}>Question Palette ({currentSubject?.name})</h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '24px' }}>
                {currentSubject?.questions.map((q, qIdx) => {
                  const key = `${currentSubject.id}__${q.id}`;
                  const ans = answers[key];
                  const isAns = q.type === 'SUBJECTIVE' ? (ans?.subjectiveAnswer || '').trim().length > 0 : !!ans?.optionId;
                  const isMfr = !!markedForReview[key];
                  const isCurrent = qIdx === activeQuestionIdx;

                  let bg = '#f1f5f9';
                  let color = '#334155';
                  if (isAns) { bg = '#dcfce7'; color = '#166534'; }
                  if (isMfr) { bg = '#fef3c7'; color = '#92400e'; }
                  if (isCurrent) { bg = 'var(--primary)'; color = '#1a1a1a'; }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIdx(qIdx)}
                      style={{
                        height: '42px',
                        borderRadius: '6px',
                        border: isCurrent ? '2.5px solid #0f172a' : '1px solid #cbd5e1',
                        backgroundColor: bg,
                        color,
                        fontWeight: 900,
                        cursor: 'pointer',
                        fontSize: '0.88rem'
                      }}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Palette Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', fontWeight: 800, borderTop: '2px solid #f1f5f9', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'var(--primary)', border: '1px solid #0f172a' }}></span> Current Question
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#dcfce7', border: '1px solid #166534' }}></span> Answered
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#fef3c7', border: '1px solid #92400e' }}></span> Marked for Review
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ── PROCTORING WARNING / GRACE PERIOD COUNTDOWN MODAL ─────────────── */}
        {showGraceModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="neo-card" style={{ background: '#ffffff', maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center', borderTop: '10px solid var(--danger)' }}>
              <AlertTriangle size={56} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontWeight: 900, textTransform: 'uppercase', color: 'var(--danger)', margin: '0 0 12px' }}>
                Proctoring Warning!
              </h2>
              <p style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '16px', lineHeight: 1.5 }}>
                You have exited full screen mode or navigated away from the exam tab. Please return immediately.
              </p>

              {/* Remaining Chances Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: remainingChances <= 1 ? '#fee2e2' : '#fef3c7', border: `2px solid ${remainingChances <= 1 ? '#ef4444' : '#f59e0b'}`, padding: '6px 16px', borderRadius: '20px', fontWeight: 900, fontSize: '0.9rem', color: remainingChances <= 1 ? '#991b1b' : '#92400e', marginBottom: '20px' }}>
                <ShieldAlert size={18} /> Remaining Violation Chances: {remainingChances} / 3
              </div>

              {/* Grace countdown timer display */}
              <div style={{ backgroundColor: '#fee2e2', border: '2px solid var(--danger)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#991b1b', textTransform: 'uppercase' }}>Time to Return to Full Screen</span>
                <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#991b1b', lineHeight: 1, margin: '6px 0', fontFamily: 'monospace' }}>
                  00:{graceCountdown < 10 ? `0${graceCountdown}` : graceCountdown}
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 700, margin: '0 0 24px', backgroundColor: '#fff5f5', padding: '8px 12px', borderRadius: '6px', border: '1px dashed #f87171' }}>
                ⚠️ Notice: If all 3 allowed chances are exhausted or countdown reaches 00:00, your exam will be automatically terminated and submitted.
              </p>

              <button
                onClick={() => { requestFullscreenMode(); checkReturnToExam(); }}
                className="neo-btn neo-btn-danger"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 900, justifyContent: 'center' }}
              >
                Return to Full Screen Now
              </button>
            </div>
          </div>
        )}

        {/* Confirm Submit Modal */}
        {showSubmitModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="neo-card" style={{ background: '#fff', maxWidth: '440px', width: '100%', padding: '32px' }}>
              <h3 style={{ margin: '0 0 12px', fontWeight: 900, textTransform: 'uppercase' }}>Confirm Final Submission</h3>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>Are you sure you want to submit your final examination? You cannot edit your answers after submitting.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowSubmitModal(false)} className="neo-btn neo-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                <button onClick={() => handleFinalSubmit(false)} disabled={submitting} className="neo-btn" style={{ padding: '8px 20px', backgroundColor: 'var(--primary)' }}>
                  {submitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ── Post-exam feedback handler ────────────────────────────────────────────
  const submitFinalExamFeedback = async () => {
    if (!exam || rating === 0) return;
    setFeedbackSubmitting(true);
    try {
      const res = await apiFetch('/student/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: exam.id, rating, message: feedbackMsg }),
        credentials: 'include',
      });
      if (res.ok) setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Feedback submission failed', err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 4: SUBMITTED RESULT
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div className="neo-card" style={{ background: '#fff', maxWidth: '560px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <CheckCircle size={64} color="#059669" style={{ margin: '0 auto 20px' }} />
        <h1 style={{ fontWeight: 900, textTransform: 'uppercase', margin: '0 0 12px', fontSize: '2rem' }}>Exam Submitted!</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '1rem' }}>
          Your responses for <strong>{exam.title}</strong> have been successfully submitted.
        </p>

        {submissionResult && (
          <div style={{ background: '#f3f4f6', border: '2px solid var(--border-color)', borderRadius: '8px', padding: '20px', marginBottom: '28px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>Score Summary</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1a1a1a', margin: '6px 0' }}>
              {submissionResult.graded === false ? 'Under Evaluation' : `${submissionResult.score} / ${submissionResult.totalPoints}`}
            </div>
            <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 700 }}>
              {submissionResult.graded === false
                ? '⏳ Subjective answers are pending evaluator review. Results will be published after grading.'
                : '✓ Auto-graded MCQs complete.'}
            </span>
          </div>
        )}

        {/* ── Feedback Section ── */}
        <div style={{ borderTop: '2px solid #f0f0f0', paddingTop: '24px', marginBottom: '24px' }}>
          {feedbackSubmitted ? (
            <div style={{ background: '#dcfce7', border: '2px solid #166534', borderRadius: '8px', padding: '16px', fontWeight: 800, fontSize: '1rem', color: '#166534' }}>
              🎉 Thank you for your feedback!
            </div>
          ) : (
            <>
              <h3 style={{ fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px', marginTop: 0 }}>
                Rate Your Exam Experience
              </h3>
              {/* Star rating */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
                {[1, 2, 3, 4, 5].map(star => (
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
                  >★</button>
                ))}
              </div>
              {/* Optional message */}
              <textarea
                placeholder="Any suggestions or comments? (optional)"
                value={feedbackMsg}
                onChange={e => setFeedbackMsg(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid var(--border-color)',
                  borderRadius: '6px',
                  resize: 'vertical',
                  fontSize: '0.9rem',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={submitFinalExamFeedback}
                disabled={rating === 0 || feedbackSubmitting}
                className="neo-btn"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '12px', opacity: rating === 0 ? 0.5 : 1, marginBottom: '8px' }}
              >
                {feedbackSubmitting ? 'Submitting…' : 'Submit Feedback'}
              </button>
              <button
                onClick={() => navigate('/student')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', padding: '4px' }}
              >
                Skip and go to Dashboard
              </button>
            </>
          )}
        </div>

        {feedbackSubmitted && (
          <button onClick={() => navigate('/student')} className="neo-btn" style={{ padding: '12px 32px', fontSize: '1rem', width: '100%', justifyContent: 'center' }}>
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default FinalExamLobby;
