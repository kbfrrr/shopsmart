import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { api } from '../services/api.js';

export default function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(event) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setResult(null);
    setLoading(true);
    try { setResult(await api.askAssistant(question)); }
    catch (caught) {
      setError(caught instanceof TypeError
        ? 'Could not reach ShopSmart. Try again in a moment.'
        : caught.message);
    }
    finally { setLoading(false); }
  }

  return (
    <section className="assistant-layout">
      <div>
        <p className="eyebrow">SHOPSMART ASSISTANT</p>
        <h1>Find a product</h1>
        <p>Ask about a product, feature, or budget to find in-stock matches in the ShopSmart catalog.</p>
        <form onSubmit={ask}>
          <label>Your question<textarea value={question} onChange={(event) => setQuestion(event.target.value)} minLength="3" maxLength="300" placeholder="Which keyboard is below ₱2,000?" required /></label>
          <button disabled={loading}>{loading ? 'Searching…' : 'Ask ShopSmart'}</button>
        </form>
      </div>
      <div className="assistant-answer">
        <h2>Assistant response</h2>
        <StatusMessage type="error">{error}</StatusMessage>
        {loading && <StatusMessage>Checking the ShopSmart catalog…</StatusMessage>}
        {!loading && !result && !error && <p>Your answer will appear here.</p>}
        <div aria-live="polite">
          {result && <>
            {result.mode === 'catalog' && <p>Showing results directly from the ShopSmart catalog.</p>}
            <p>{result.answer}</p>
          </>}
        </div>
        {result?.recommendedProducts.length > 0 && (
          <section aria-labelledby="catalog-sources">
            <h3 id="catalog-sources">Catalog sources</h3>
            <div className="recommendations">
              {result.recommendedProducts.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  {product.name} — ₱{Number(product.price).toLocaleString('en-PH')}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
