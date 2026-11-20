import { timingSafeEqual } from 'node:crypto';

export const publicCustomer = { id: true, name: true, email: true };

export function csrfProtection(origin) {
  return (request, response, next) => {
    const supplied = request.get('X-CSRF-Token') || '';
    const expected = request.session.csrfToken || '';
    const valid = /^[a-f0-9]{64}$/.test(supplied) && /^[a-f0-9]{64}$/.test(expected)
      && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
    if (request.get('Origin') !== origin || !valid) {
      return response.status(403).json({ error: { code: 'INVALID_CSRF', message: 'Your session changed. Refresh the page and try again.' } });
    }
    next();
  };
}

export function requireCustomer(database) {
  return async (request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      const userId = request.session.userId;
      const user = Number.isInteger(userId)
        ? await database.user.findUnique({ where: { id: userId }, select: publicCustomer }) : null;
      if (!user) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Please sign in to continue.' } });
      request.user = user;
      next();
    } catch (error) { next(error); }
  };
}
