import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StatusMessage from '../components/StatusMessage.jsx';
import { safeReturnPath } from '../utils/auth.js';

export default function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const destination = safeReturnPath(location.state?.from);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try { await auth.login(email.trim().toLowerCase(), password); navigate(destination, { replace: true }); }
    catch (caught) { setError(caught instanceof TypeError ? 'Could not reach ShopSmart. Try again.' : caught.message); }
    finally { setPassword(''); setSubmitting(false); }
  }

  if (auth.loading) return <StatusMessage>Checking your sign-in…</StatusMessage>;
  if (auth.user) return <Navigate to={destination} replace />;
  return <section className="account-layout">
    <div><p className="eyebrow">YOUR SHOPSMART ACCOUNT</p><h1>Sign in</h1>
      <p>View your orders and complete a simulated checkout.</p>
      <p>Use the fictional customer account provided by your team. Public registration is unavailable for this classroom demo.</p>
      <Link to="/">Continue browsing products</Link>
    </div>
    <form onSubmit={submit} aria-busy={submitting}>
      <h2>Welcome back</h2>
      <StatusMessage type="error">{error || auth.error}</StatusMessage>
      <label htmlFor="login-email">Email address<input id="login-email" name="email" type="email" autoComplete="username" maxLength="254" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label htmlFor="login-password">Password<input id="login-password" name="password" type="password" autoComplete="current-password" maxLength="128" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      <small>Simulated purchases only. Use fictional customer information.</small>
    </form>
  </section>;
}
