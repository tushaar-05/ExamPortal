import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamSession from './pages/student/ExamSession';
import Unauthorized from './pages/Unauthorized';
import ChangePassword from './pages/ChangePassword';
import Students from './pages/admin/Students';
import Exams from './pages/admin/Exams';
import StudentSubjectScores from './pages/admin/StudentSubjectScores';
import StudentScores from './pages/student/StudentScores';
import ExamReview from './pages/student/ExamReview';
import Leaderboard from './pages/student/Leaderboard';

// Root catch-all: redirect based on auth state
const NavigationRoot: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-color)',
      }}>
        <h2 style={{ textTransform: 'uppercase', fontWeight: 900 }}>Loading…</h2>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />;
  }

  return <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  // Helper: redirect already-logged-in users away from auth pages
  const authGuard = (element: React.ReactElement) => {
    if (isAuthenticated && user) {
      return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/student'} replace />;
    }
    return element;
  };

  return (
    <Routes>
      {/* ── Public auth pages (redirect away if already logged in) ── */}
      <Route path="/login"       element={authGuard(<Login />)} />
      <Route path="/register"    element={authGuard(<Register />)} />
      <Route path="/admin-login" element={authGuard(<AdminLogin />)} />

      {/* ── Utility ── */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/change-password" element={<ChangePassword role="ADMIN" />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/exams" element={<Exams />} />
        <Route path="/admin/subject-scores" element={<StudentSubjectScores />} />
      </Route>

      {/* ── Student protected routes ── */}
      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/exam/:id" element={<ExamSession />} />
        <Route path="/student/exam/:id/review" element={<ExamReview />} />
        <Route path="/student/scores" element={<StudentScores />} />
        <Route path="/student/leaderboard" element={<Leaderboard />} />
        <Route path="/student/change-password" element={<ChangePassword role="STUDENT" />} />
      </Route>

      {/* ── Catch-all ── */}
      <Route path="*" element={<NavigationRoot />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <AppContent />
    </Router>
  </AuthProvider>
);

export default App;
