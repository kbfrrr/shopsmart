import { randomBytes } from 'node:crypto';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';

export const sessionCookieName = 'shopsmart.sid';
export const sessionDuration = 8 * 60 * 60 * 1000;
export const sessionCookie = {
  httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production'
};

export function createSessionStore(connectionString = process.env.DATABASE_URL) {
  const Store = connectPgSimple(session);
  return new Store({
    conString: connectionString, tableName: 'session', createTableIfMissing: false, disableTouch: true,
    errorLog: () => console.error('Session database operation failed.')
  });
}

export function sessionMiddleware(store, suppliedSecret = process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production' && (!suppliedSecret || suppliedSecret.length < 32)) {
    throw new Error('Set SESSION_SECRET to a private random value of at least 32 characters.');
  }
  return session({
    name: sessionCookieName,
    secret: suppliedSecret || randomBytes(32).toString('hex'),
    store, resave: false, saveUninitialized: false,
    cookie: { ...sessionCookie, maxAge: sessionDuration }
  });
}
