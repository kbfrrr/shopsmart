import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StatusMessage from './StatusMessage.jsx';

export default function RequireCustomer({ children }) {
  const { user, loading, error, reload } = useAuth();
  const location = useLocation();
  if (loading) return <StatusMessage>Checking your sign-in…</StatusMessage>;
  if (error) return <section><StatusMessage type="error">{error}</StatusMessage><button onClick={reload}>Try again</button></section>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
