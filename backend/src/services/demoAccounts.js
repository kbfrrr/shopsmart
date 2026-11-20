import { hashPassword } from './passwords.js';

export const demoCustomers = [
  { name: 'Demo Customer A', email: 'customer.test1@example.com' },
  { name: 'Demo Customer B', email: 'customer.test2@example.com' }
];

export async function provisionCustomer(database, customer, password) {
  if (await database.user.findUnique({ where: { email: customer.email } })) return false;
  if (password.length < 12 || password.length > 128) throw new Error('Use a password of 12 to 128 characters.');
  await database.user.create({ data: { ...customer, passwordHash: await hashPassword(password) } });
  return true;
}
