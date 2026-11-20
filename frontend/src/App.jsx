import { NavLink, Route, Routes } from 'react-router-dom';
import { useCart } from './context/CartContext.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import ProductDetailsPage from './pages/ProductDetailsPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import OrderDetailsPage from './pages/OrderDetailsPage.jsx';
import RequireCustomer from './components/RequireCustomer.jsx';
import StatusMessage from './components/StatusMessage.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useState } from 'react';

export default function App() {
  const { itemCount } = useCart();
  const { user, loading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState('');
  async function signOut() {
    setSigningOut(true); setAuthError('');
    try { await logout(); }
    catch { setAuthError('Could not sign out. Try again.'); }
    finally { setSigningOut(false); }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">ShopSmart</NavLink>
        <nav aria-label="Primary navigation">
          <NavLink to="/">Products</NavLink>
          <NavLink to="/assistant">AI Assistant</NavLink>
          <NavLink to="/cart">Cart ({itemCount})</NavLink>
          {!loading && (user ? <><NavLink to="/orders">My orders</NavLink><button className="nav-signout" onClick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button></> : <NavLink to="/login">Sign in</NavLink>)}
        </nav>
      </header>

      <main>
        <StatusMessage type="error">{authError}</StatusMessage>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/orders" element={<RequireCustomer><OrdersPage /></RequireCustomer>} />
          <Route path="/orders/:orderId" element={<RequireCustomer><OrderDetailsPage /></RequireCustomer>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        ShopSmart classroom starter • Simulated purchases only
      </footer>
    </div>
  );
}
