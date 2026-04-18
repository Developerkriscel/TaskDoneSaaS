import { useAuth } from '../store/authContext.jsx';

export default function Topbar({ title, userName }) {
  const { logout } = useAuth();

  return (
    <header className="top-bar">
      <div>
        <h1>{title}</h1>
        <p>Live migration preview with legacy RPC parity</p>
      </div>
      <div className="top-actions">
        <span>{userName}</span>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
