import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { verifyPassword } from '../services/passwords.js';
import { csrfProtection, publicCustomer } from '../middleware/auth.js';
import { sessionCookie, sessionCookieName } from '../lib/sessions.js';

const loginSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(1).max(128) });
const dummyHash = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
const changeSession = (request) => new Promise((resolve, reject) => request.session.regenerate((error) => error ? reject(error) : resolve()));
const saveSession = (request) => new Promise((resolve, reject) => request.session.save((error) => error ? reject(error) : resolve()));

export function createAuthRouter(database, origin) {
  const router = Router();
  router.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  router.get('/me', async (request, response, next) => {
    try {
      request.session.csrfToken ||= randomBytes(32).toString('hex');
      const user = request.session.userId
        ? await database.user.findUnique({ where: { id: request.session.userId }, select: publicCustomer }) : null;
      response.json({ user, csrfToken: request.session.csrfToken });
    } catch (error) { next(error); }
  });
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'LOGIN_RATE_LIMIT', message: 'Too many sign-in attempts. Try again in 15 minutes.' } }
  });
  router.post('/login', limiter, csrfProtection(origin), async (request, response, next) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) return response.status(422).json({ error: { code: 'INVALID_LOGIN', message: 'Enter a valid email and password.' } });
      const user = await database.user.findUnique({ where: { email: parsed.data.email } });
      const matches = await verifyPassword(parsed.data.password, user?.passwordHash || dummyHash);
      if (!user || !matches) return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
      await changeSession(request);
      request.session.userId = user.id;
      request.session.csrfToken = randomBytes(32).toString('hex');
      await saveSession(request);
      response.json({ user: { id: user.id, name: user.name, email: user.email }, csrfToken: request.session.csrfToken });
    } catch (error) { next(error); }
  });
  router.post('/logout', csrfProtection(origin), (request, response, next) => {
    request.session.destroy((error) => {
      if (error) return next(error);
      response.clearCookie(sessionCookieName, sessionCookie);
      response.status(204).end();
    });
  });
  return router;
}
