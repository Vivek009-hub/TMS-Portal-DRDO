import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PasswordResetRequestsPage from './pages/PasswordResetRequestsPage';
import DashboardPage from './pages/DashboardPage';
import ParticipantsPage from './pages/ParticipantsPage';
import CoursesPage from './pages/CoursesPage';
import FacultyPage from './pages/FacultyPage';
import OrganizationAuthoritiesPage from './pages/OrganizationAuthoritiesPage';
import ReportingSheetPage from './pages/ReportingSheetPage';
import RegimentalFundPage from './pages/RegimentalFundPage';
import HonorariumPage from './pages/HonorariumPage';
import CourseKitReceiptPage from './pages/CourseKitReceiptPage';
import MementoesUtilisationPage from './pages/MementoesUtilisationPage';
import CertificatesPage from './pages/CertificatesPage';
import LeavesPage from './pages/LeavesPage';
import FeedbackPage from './pages/FeedbackPage';
import { CircularsPage, SchedulesPage, CalendarsPage } from './pages/DocumentsPage';
import TemplatesPage from './pages/TemplatesPage';
import DocumentCenterPage from './pages/DocumentCenterPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import AttendancePage from './pages/AttendancePage';

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
  const { token, user } = useSelector((state) => state.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role === 'user') return <Navigate to="/dashboard" replace />;
  if (superAdminOnly && user?.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { token } = useSelector((state) => state.auth);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 700);
    const removeTimer = setTimeout(() => setShowSplash(false), 1000);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, []);

  return (
    <>
    {showSplash && <SplashScreen fadingOut={splashFading} />}
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/forgot-password" element={token ? <Navigate to="/dashboard" /> : <ForgotPasswordPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/participants" element={<ProtectedRoute adminOnly><ParticipantsPage /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute adminOnly><CoursesPage /></ProtectedRoute>} />
      <Route path="/faculty" element={<ProtectedRoute adminOnly><FacultyPage /></ProtectedRoute>} />
      <Route path="/organization-authorities" element={<ProtectedRoute adminOnly><OrganizationAuthoritiesPage /></ProtectedRoute>} />
      <Route path="/reporting-sheet" element={<ProtectedRoute adminOnly><ReportingSheetPage /></ProtectedRoute>} />
      <Route path="/regimental-fund" element={<ProtectedRoute adminOnly><RegimentalFundPage /></ProtectedRoute>} />
      <Route path="/honorarium" element={<ProtectedRoute adminOnly><HonorariumPage /></ProtectedRoute>} />
      <Route path="/course-kit-receipt" element={<ProtectedRoute adminOnly><CourseKitReceiptPage /></ProtectedRoute>} />
      <Route path="/mementoes-utilisation" element={<ProtectedRoute adminOnly><MementoesUtilisationPage /></ProtectedRoute>} />
      <Route path="/certificates" element={<ProtectedRoute adminOnly><CertificatesPage /></ProtectedRoute>} />
      <Route path="/circulars" element={<ProtectedRoute adminOnly><CircularsPage /></ProtectedRoute>} />
      <Route path="/schedules" element={<ProtectedRoute adminOnly><SchedulesPage /></ProtectedRoute>} />
      <Route path="/calendars" element={<ProtectedRoute adminOnly><CalendarsPage /></ProtectedRoute>} />
      <Route path="/templates" element={<ProtectedRoute adminOnly><TemplatesPage /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute adminOnly><DocumentCenterPage /></ProtectedRoute>} />
      <Route path="/leaves" element={<ProtectedRoute adminOnly><LeavesPage /></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute adminOnly><FeedbackPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
      <Route path="/password-reset-requests" element={<ProtectedRoute superAdminOnly><PasswordResetRequestsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute>} />

      {/* Participant routes */}
      <Route path="/my-certificates" element={<ProtectedRoute><CertificatesPage participantView /></ProtectedRoute>} />
      <Route path="/my-schedules" element={<ProtectedRoute><SchedulesPage participantView /></ProtectedRoute>} />
      <Route path="/my-calendars" element={<ProtectedRoute><CalendarsPage participantView /></ProtectedRoute>} />
      <Route path="/my-circulars" element={<ProtectedRoute><CircularsPage participantView /></ProtectedRoute>} />
      <Route path="/my-leaves" element={<ProtectedRoute><LeavesPage participantView /></ProtectedRoute>} />
      <Route path="/my-attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
      <Route path="/my-documents" element={<ProtectedRoute><DocumentCenterPage participantView /></ProtectedRoute>} />
      <Route path="/submit-feedback" element={<ProtectedRoute><FeedbackPage submitMode /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}
