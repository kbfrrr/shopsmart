import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { createSessionStore } from '../src/lib/sessions.js';
import { hashPassword } from '../src/services/passwords.js';

const url = process.env.TEST_DATABASE_URL;
test('customer sessions and order ownership against PostgreSQL', { skip: !url }, async (t) => {
  assert.match(new URL(url).pathname, /_auth_test$/, 'Use a dedicated database ending in _auth_test');
  const database = new PrismaClient({ datasources: { db: { url } } });
  const store = createSessionStore(url);
  const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
  const suffix = randomUUID();
  const password = 'Integration-only-password-2026';
  const passwordHash = await hashPassword(password);
  const users = await Promise.all(['a', 'b'].map((label) => database.user.create({ data: { name: `Demo ${label}`, email: `${label}-${suffix}@example.test`, passwordHash } })));
  const product = await database.product.create({ data: { name: 'Auth Test Mouse', description: 'Test-only mouse', category: 'Test', price: 25, stock: 3 } });
  const legacy = await database.order.create({ data: { customerName: 'Legacy', email: users[0].email, address: 'Fictional legacy address', total: 25 } });
  const app = createApp({ database, sessionStore: store, sessionSecret: 'test-secret-at-least-32-characters-long' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await store.close();
    await database.$disconnect();
  });
  function browser() {
    let cookie = '';
    let csrf = '';
    return {
      get cookie() { return cookie; },
      async call(path, { method = 'GET', data, token = true, requestOrigin = origin } = {}) {
        const response = await fetch(endpoint + path, { method,
          headers: { 'Content-Type': 'application/json', Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}), ...(token ? { 'X-CSRF-Token': csrf } : {}) },
          ...(data ? { body: JSON.stringify(data) } : {})
        });
        if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
        const body = await response.json().catch(() => null);
        if (body?.csrfToken) csrf = body.csrfToken;
        return { status: response.status, body, headers: response.headers };
      }
    };
  }
  const guest = browser();
  assert.equal((await guest.call('/api/orders')).status, 401);
  assert.equal((await guest.call('/api/orders', { method: 'POST', data: {} })).status, 401);
  const a = browser(); const b = browser();
  const initial = await a.call('/api/auth/me');
  assert.equal(initial.body.user, null);
  assert.match(initial.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(initial.headers.get('set-cookie'), /SameSite=Lax/i);
  const oldCookie = a.cookie;
  const loginData = { email: users[0].email, password };
  assert.equal((await a.call('/api/auth/login', { method: 'POST', data: loginData, token: false })).status, 403);
  assert.equal((await a.call('/api/auth/login', { method: 'POST', data: loginData, requestOrigin: 'https://attacker.invalid' })).status, 403);
  assert.equal((await a.call('/api/auth/login', { method: 'POST', data: { ...loginData, password: 'wrong' } })).status, 401);
  const login = await a.call('/api/auth/login', { method: 'POST', data: loginData });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.passwordHash, undefined);
  assert.notEqual(a.cookie, oldCookie, 'Login rotates the anonymous session ID');
  assert.equal((await a.call('/api/auth/me')).body.user.id, users[0].id);
  await b.call('/api/auth/me');
  assert.equal((await b.call('/api/auth/login', { method: 'POST', data: { email: users[1].email, password } })).status, 200);
  const payload = { customerName: 'Fictional Buyer', email: users[1].email, address: '101 Fictional Street, Test City', userId: users[1].id, items: [{ productId: product.id, quantity: 1 }] };
  assert.equal((await a.call('/api/orders', { method: 'POST', data: payload, token: false })).status, 403);
  const created = await a.call('/api/orders', { method: 'POST', data: payload });
  assert.equal(created.status, 201);
  assert.equal(created.body.userId, users[0].id, 'Owner comes from the session, not payload or delivery email');
  const id = created.body.id;
  assert.equal((await a.call(`/api/orders/${id}`)).status, 200);
  assert.equal((await b.call(`/api/orders/${id}`)).status, 404);
  assert.equal((await guest.call(`/api/orders/${id}`)).status, 401);
  assert.equal((await a.call(`/api/orders/${legacy.id}`)).status, 404, 'Email match never claims an old guest order');
  assert.deepEqual((await b.call('/api/orders')).body.orders, []);
  assert.equal((await a.call('/api/orders')).body.orders.some((order) => order.id === id), true);
  const freshStore = createSessionStore(url);
  const freshServer = createApp({ database, sessionStore: freshStore, sessionSecret: 'test-secret-at-least-32-characters-long' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => freshServer.once('listening', resolve));
  try {
    const restored = await fetch(`http://127.0.0.1:${freshServer.address().port}/api/auth/me`, { headers: { Cookie: a.cookie } });
    assert.equal((await restored.json()).user.id, users[0].id, 'A fresh application instance restores the PostgreSQL session');
  } finally {
    await new Promise((resolve) => freshServer.close(resolve));
    await freshStore.close();
  }
  assert.equal((await a.call('/api/orders/1.5')).status, 400);
  assert.equal((await a.call('/api/orders', { method: 'POST', data: { ...payload, items: [{ productId: product.id, quantity: 21 }] } })).status, 422);
  assert.equal((await a.call('/api/orders', { method: 'POST', data: { ...payload, items: [{ productId: product.id, quantity: 3 }] } })).status, 409);
  assert.equal(await database.order.count({ where: { userId: users[0].id } }), 1);
  assert.equal((await a.call('/api/auth/logout', { method: 'POST' })).status, 204);
  assert.equal((await a.call(`/api/orders/${id}`)).status, 401);
  await database.session.updateMany({ data: { expire: new Date(0) } });
  assert.equal((await b.call(`/api/orders/${id}`)).status, 401, 'Expired sessions cannot read orders');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const limited = await guest.call('/api/auth/login', { method: 'POST', data: loginData, token: false });
    if (limited.status === 429) return;
  }
  assert.fail('Repeated sign-in attempts should be rate limited');
});
