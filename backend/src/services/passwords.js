import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const options = { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };
let running = 0;

async function key(password, salt) {
  if (running >= 2) throw Object.assign(new Error('Sign-in is busy. Try again in a moment.'), { status: 429, code: 'AUTH_BUSY' });
  running += 1;
  try { return await derive(password, salt, 64, options); }
  finally { running -= 1; }
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const result = await key(password, salt);
  return `scrypt$${salt}$${result.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, encoded] = String(stored).split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(encoded)) return false;
  return timingSafeEqual(await key(password, salt), Buffer.from(encoded, 'hex'));
}
