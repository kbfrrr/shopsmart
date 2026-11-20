import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

async function serve(t, checkDatabase) {
  const app = createApp({ checkDatabase });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('liveness succeeds without consulting a failing database', async (t) => {
  let checks = 0;
  const origin = await serve(t, async () => { checks += 1; throw new Error('Database down'); });
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(checks, 0);
});

test('readiness succeeds only after its database check completes', async (t) => {
  let checks = 0;
  const origin = await serve(t, async () => { checks += 1; });
  const response = await fetch(`${origin}/api/ready`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(checks, 1);
});

test('database failure produces a generic readiness error without connection secrets', async (t) => {
  const origin = await serve(t, async () => {
    throw new Error('postgresql://private-user:private-password@database/shopsmart');
  });
  const response = await fetch(`${origin}/api/ready`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});
