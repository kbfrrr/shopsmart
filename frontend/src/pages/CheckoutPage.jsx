import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../services/api.js';
import { calculateItemSubtotal } from '../utils/cart.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function CheckoutPage() {
  const { cart, total, clearCart, checkoutDraft: form, setCheckoutDraft: setForm } = useCart();
  const auth = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const created = await api.createOrder({
        ...form,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      });
      setOrder(created);
      clearCart();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (order && auth.user) return (
    <section className="success-card">
      <p className="eyebrow">ORDER RECEIVED</p>
      <h1>Thank you, {order.customerName}!</h1>
      <p>Your simulated order number is <strong>#{order.id}</strong>.</p>
      <p>Total: <strong>₱{Number(order.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></p>
      <Link className="button" to="/">Continue shopping</Link>
      <Link className="button secondary" to={`/orders/${order.id}`}>View order</Link>
    </section>
  );

  if (auth.loading) return <StatusMessage>Checking your sign-in…</StatusMessage>;
  if (auth.error) return <section><StatusMessage type="error">{auth.error}</StatusMessage><button onClick={auth.reload}>Try again</button></section>;
  if (!auth.user) return <section className="account-prompt"><p className="eyebrow">SIMULATED CHECKOUT</p><h1>Sign in to checkout</h1><p>Your cart and delivery information will stay here while you sign in.</p><Link className="button" to="/login" state={{ from: '/checkout' }}>Sign in</Link></section>;

  if (cart.length === 0) return <section><div className="empty-state"><h1>Your cart is empty</h1><Link className="button" to="/">Browse products</Link></div></section>;

  return (
    <section className="checkout-layout">
      <form onSubmit={submitOrder}>
        <p className="eyebrow">SIMULATED CHECKOUT</p><h1>Delivery information</h1>
        <StatusMessage type="error">{error}</StatusMessage>
        <div className="form-field"><label htmlFor="checkout-name">Full name</label><input id="checkout-name" name="customerName" autoComplete="name" value={form.customerName} onChange={updateField} minLength="2" maxLength="80" required /></div>
        <div className="form-field"><label htmlFor="checkout-email">Email address</label><input id="checkout-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} required /></div>
        <div className="form-field"><label htmlFor="checkout-address">Delivery address</label><textarea id="checkout-address" name="address" autoComplete="street-address" value={form.address} onChange={updateField} minLength="10" maxLength="300" required /></div>
        <button disabled={submitting}>{submitting ? 'Submitting order…' : 'Place simulated order'}</button>
      </form>
      <aside className="summary">
        <h2>Amount due</h2>
        <ul className="checkout-items">
          {cart.map((item) => (
            <li key={item.productId}>
              <div><strong>{item.name}</strong><span>Quantity: {item.quantity}</span></div>
              <strong>₱{calculateItemSubtotal(item).toLocaleString('en-PH', {
                minimumFractionDigits: 2, maximumFractionDigits: 2
              })}</strong>
            </li>
          ))}
        </ul>
        <p className="summary-total"><span>Total</span><strong>₱{total.toLocaleString('en-PH', {
          minimumFractionDigits: 2, maximumFractionDigits: 2
        })}</strong></p>
        <small>No actual payment will be collected.</small>
      </aside>
    </section>
  );
}
