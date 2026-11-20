import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import StatusMessage from '../components/StatusMessage.jsx';

export default function OrderDetailsPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setOrder(null); setError('');
    api.getOrder(orderId).then((result) => { if (active) setOrder(result); })
      .catch((caught) => { if (active) setError(caught.status === 404 ? 'This order could not be found in your account.' : 'Could not load this order. Try again.'); });
    return () => { active = false; };
  }, [orderId, attempt]);
  return <section>
    <Link to="/orders">← My orders</Link>
    <div className="page-heading"><p className="eyebrow">SIMULATED PURCHASE</p><h1>Order {order ? `#${order.id}` : 'details'}</h1></div>
    {error && <><StatusMessage type="error">{error}</StatusMessage><button onClick={() => setAttempt((value) => value + 1)}>Try again</button></>}
    {!order && !error && <StatusMessage>Loading your order…</StatusMessage>}
    {order && <div className="checkout-layout">
      <article className="summary"><h2>Delivery information</h2><p>{order.customerName}</p><p>{order.email}</p><p className="address-text">{order.address}</p><p>Status: {order.status}</p><p>{new Date(order.createdAt).toLocaleString('en-PH')}</p></article>
      <article className="summary"><h2>Order summary</h2><ul className="checkout-items">{order.items.map((item) => <li key={item.id}><div><strong>{item.product.name}</strong><span>Quantity: {item.quantity}</span></div><strong>₱{(item.unitPrice * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></li>)}</ul>
        <p className="summary-total"><span>Total</span><strong>₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></p>
        <small>No actual payment was collected.</small>
      </article>
    </div>}
  </section>;
}
