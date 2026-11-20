import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import StatusMessage from '../components/StatusMessage.jsx';

export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setOrders(null); setError('');
    api.getOrders().then((result) => { if (active) setOrders(result.orders); })
      .catch(() => { if (active) setError('Could not load your orders. Try again.'); });
    return () => { active = false; };
  }, [attempt]);
  return <section>
    <div className="page-heading"><p className="eyebrow">YOUR ACCOUNT</p><h1>My orders</h1><p>Your most recent 50 simulated orders.</p></div>
    {error && <><StatusMessage type="error">{error}</StatusMessage><button onClick={() => setAttempt((value) => value + 1)}>Try again</button></>}
    {!orders && !error && <StatusMessage>Loading your orders…</StatusMessage>}
    {orders?.length === 0 && <div className="empty-state"><h2>No orders yet</h2><p>Your orders will appear here after checkout.</p><Link className="button" to="/">Browse products</Link></div>}
    <div className="order-list">{orders?.map((order) => <article className="summary order-row" key={order.id}>
      <div><h2><Link to={`/orders/${order.id}`}>Order #{order.id}</Link></h2><span>{new Date(order.createdAt).toLocaleDateString('en-PH')}</span></div>
      <div><strong>₱{order.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong><p>{order.status}</p></div>
      <Link className="button secondary" to={`/orders/${order.id}`}>View order</Link>
    </article>)}</div>
  </section>;
}
