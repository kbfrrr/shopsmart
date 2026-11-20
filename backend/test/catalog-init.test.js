import test from 'node:test';
import assert from 'node:assert/strict';
import { demoProducts, initializeDemoCatalog } from '../prisma/catalog.js';

function databaseWithCounts({ products = 0, orders = 0, items = 0 } = {}) {
  const writes = [];
  const transaction = {
    product: {
      count: async () => products,
      createMany: async ({ data }) => {
        writes.push(data);
        products += data.length;
        return { count: data.length };
      }
    },
    order: { count: async () => orders },
    orderItem: { count: async () => items }
  };
  return { writes, $transaction: async (action) => action(transaction) };
}

test('initializes an empty catalog once and preserves it on a second deploy', async () => {
  const client = databaseWithCounts();
  assert.deepEqual(await initializeDemoCatalog(client), { count: 6 });
  assert.deepEqual(await initializeDemoCatalog(client), { count: 0 });
  assert.deepEqual(client.writes, [demoProducts]);
});

for (const existing of [{ products: 1 }, { orders: 1 }, { items: 1 }]) {
  test(`does not insert or reset data when ${Object.keys(existing)[0]} exist`, async () => {
    const client = databaseWithCounts(existing);
    assert.deepEqual(await initializeDemoCatalog(client), { count: 0 });
    assert.deepEqual(client.writes, []);
  });
}
