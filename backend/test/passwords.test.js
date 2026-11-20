import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/services/passwords.js';
import { provisionCustomer } from '../src/services/demoAccounts.js';

test('password hashes are salted and only verify the correct password', async () => {
  const password = 'Fictional-password-only-2026';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
  assert.equal(await verifyPassword(password, 'broken'), false);
});

test('account provisioning preserves existing credentials', async () => {
  const database = { user: { findUnique: async () => ({ id: 1 }) } };
  assert.equal(await provisionCustomer(database, { email: 'customer-a@example.test' }, 'replacement-password'), false);
});
