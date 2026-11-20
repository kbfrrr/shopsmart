import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useCart } from './CartContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { clearCart } = useCart();

  async function reload() {
    setLoading(true);
    setError('');
    try { setUser((await api.getSession()).user); }
    catch { setError('Could not check your sign-in. Try again.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    api.getSession().then((session) => { if (active) setUser(session.user); })
      .catch(() => { if (active) setError('Could not check your sign-in. Try again.'); })
      .finally(() => { if (active) setLoading(false); });
    const expire = () => { setUser(null); };
    window.addEventListener('shopsmart:session-expired', expire);
    return () => { active = false; window.removeEventListener('shopsmart:session-expired', expire); };
  }, []);

  async function login(email, password) {
    const session = await api.login(email, password);
    setUser(session.user);
    setError('');
  }

  async function logout() {
    await api.logout();
    clearCart();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, error, login, logout, reload }}>{children}</AuthContext.Provider>;
}

// This hook shares the same module as its provider, matching CartContext.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
