import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { PrismaClient } from '@prisma/client';
import { demoCustomers, provisionCustomer } from '../src/services/demoAccounts.js';

const database = new PrismaClient();
let muted = false;
const output = new Writable({ write(chunk, encoding, done) {
  if (!muted) process.stdout.write(chunk, encoding);
  done();
} });
const terminal = createInterface({ input: process.stdin, output, terminal: true });

async function secret(prompt) {
  process.stdout.write(prompt);
  muted = true;
  try { return await terminal.question(''); }
  finally { muted = false; process.stdout.write('\n'); }
}

try {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal (docker compose exec without -T).');
  for (const customer of demoCustomers) {
    if (await database.user.findUnique({ where: { email: customer.email } })) {
      console.log(`${customer.email} already exists; credentials unchanged.`);
      continue;
    }
    const password = await secret(`Password for ${customer.email} (hidden, 12–128 characters): `);
    const confirm = await secret('Confirm password (hidden): ');
    if (password !== confirm) throw new Error('Passwords did not match. Run the command again.');
    await provisionCustomer(database, customer, password);
    console.log(`Created ${customer.email}.`);
  }
} catch (error) {
  console.error(error.message.startsWith('Use ') || error.message.startsWith('Passwords')
    ? error.message : 'Account provisioning failed. Check migrations and database connectivity.');
  process.exitCode = 1;
} finally {
  terminal.close();
  await database.$disconnect();
}
