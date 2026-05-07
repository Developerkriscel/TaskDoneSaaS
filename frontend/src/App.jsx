import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import AppAdminSecretLoginPage from './pages/AppAdminSecretLoginPage.jsx';
import LegacyTaskAppPage from './pages/LegacyTaskAppPage.jsx';
import PlatformPage from './pages/PlatformPage.jsx';
import AiChatWidget from './components/AiChatWidget.jsx';
import { useAuth } from './store/authContext.jsx';

const APP_ADMIN_LOGIN_PATH = '/platform-login';
const LEGACY_APP_ADMIN_LOGIN_PATH = '/auth/taskdone-platform-2026';

export default function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path={APP_ADMIN_LOGIN_PATH} element={<AppAdminSecretLoginPage />} />
        <Route path={LEGACY_APP_ADMIN_LOGIN_PATH} element={<Navigate to={APP_ADMIN_LOGIN_PATH} replace />} />
        <Route
          path="/"
          element={
            user ? (user.isAppAdmin ? <Navigate to="/platform" replace /> : <LegacyTaskAppPage />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/platform"
          element={user ? (user.isAppAdmin ? <PlatformPage /> : <Navigate to="/" replace />) : <Navigate to={APP_ADMIN_LOGIN_PATH} replace />}
        />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>

      {user && <AiChatWidget />}
    </>
  );
}
