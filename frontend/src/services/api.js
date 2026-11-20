const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
let csrfToken = '';
let sessionRequest;

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    if (error.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('shopsmart:session-expired'));
    throw error;
  }
  if (data?.csrfToken) csrfToken = data.csrfToken;
  return data;
}

export const api = {
  getSession: () => {
    sessionRequest ||= request('/auth/me').finally(() => { sessionRequest = null; });
    return sessionRequest;
  },
  login: async (email, password) => {
    await api.getSession();
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  logout: async () => {
    await api.getSession();
    await request('/auth/logout', { method: 'POST' });
    csrfToken = '';
  },
  getOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${encodeURIComponent(id)}`),
  getProducts: (query = '') => request(`/products${query ? `?search=${encodeURIComponent(query)}` : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  createOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  askAssistant: (question) => request('/assistant/questions', {
    method: 'POST', body: JSON.stringify({ question })
  })
};
