import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import { createOrdersRouter } from './routes/orders.js';
import assistantRouter from './routes/assistant.js';
import { prisma } from './lib/prisma.js';
import { createSessionStore, sessionMiddleware } from './lib/sessions.js';
import { createAuthRouter } from './routes/auth.js';

export function createApp({ checkDatabase = () => prisma.$queryRaw`SELECT 1`, database = prisma, sessionStore, sessionSecret } = {}) {
  const app = express();
  const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
  const store = sessionStore || createSessionStore();
  app.locals.sessionStore = store;
  app.disable('x-powered-by');
  // Enable only behind the deployment's single proxy; the API has no public port.
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use((request, response, next) => { request.id = crypto.randomUUID(); response.setHeader('X-Request-ID', request.id); next(); });
  app.use(morgan(':method :url :status :response-time ms'));

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/api/ready', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try {
      await checkDatabase();
      response.json({ status: 'ok' });
    } catch {
      response.status(503).json({ status: 'unavailable' });
    }
  });
  app.use('/api/products', productsRouter);
  const customerSession = sessionMiddleware(store, sessionSecret);
  app.use('/api/auth', customerSession, createAuthRouter(database, origin));
  app.use('/api/orders', customerSession, createOrdersRouter(database, origin));
  app.use('/api/assistant', assistantRouter);
  app.use((_request, response) => response.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'API route could not be found.' } }));
  app.use((error, request, response, _next) => {
    console.error(`[${request.id}] ${error.code || 'INTERNAL_ERROR'}`);
    response.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'The server could not complete the request.', traceId: request.id } });
  });
  return app;
}
