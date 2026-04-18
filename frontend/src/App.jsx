import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import AppAdminSecretLoginPage from './pages/AppAdminSecretLoginPage.jsx';
import LegacyTaskAppPage from './pages/LegacyTaskAppPage.jsx';
import PlatformPage from './pages/PlatformPage.jsx';
import AiChatWidget from './components/AiChatWidget.jsx';
import { useAuth } from './store/authContext.jsx';

const SECRET_APP_ADMIN_PATH = '/auth/taskdone-platform-2026';

export default function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return null;
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path={SECRET_APP_ADMIN_PATH} element={<AppAdminSecretLoginPage />} />
        <Route
          path="/"
          element={
            user ? (user.isAppAdmin ? <Navigate to="/platform" replace /> : <LegacyTaskAppPage />) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/platform"
          element={user ? (user.isAppAdmin ? <PlatformPage /> : <Navigate to="/" replace />) : <Navigate to={SECRET_APP_ADMIN_PATH} replace />}
        />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>

      {user && <AiChatWidget />}
    </>
  );
}
