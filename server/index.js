/**
 * Express server entry: diet generation API and history.
 * Run from server/: node index.js (or npm run dev)
 * Loads .env from project root (parent of server/) and server/.env.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
          if (key) process.env[key] = value;
        }
      }
    }
  } catch (_) {}
}
[path.join(__dirname, '..', '.env'), path.join(__dirname, '.env'), path.join(process.cwd(), '.env')].forEach(loadEnvFile);

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger.js';
import { generateDietRouter } from './routes/generateDiet.js';
import { historyRouter } from './routes/history.js';
import { groceryRouter } from './routes/grocery.js';
import { swapMealRouter } from './routes/swapMeal.js';
import { authRouter } from './routes/auth.js';
import { adminAuthRouter } from './routes/adminAuth.js';
import { adminRouter } from './routes/admin.js';
import { complianceRouter } from './routes/compliance.js';
import { settingsRouter } from './routes/settings.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const RATE_LIMIT_MESSAGE = { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests. Try again later.' } };

const apiStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: RATE_LIMIT_MESSAGE,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: RATE_LIMIT_MESSAGE,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({ origin: true }));
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && (err.status === 400 || 'body' in err)) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid JSON in request body.' },
    });
  }
  next(err);
});

app.get('/', (_req, res) => {
  res.redirect(302, '/api');
});

app.get('/api', (_req, res) => {
  res.json({
    success: true,
    message: 'Diet API',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/generate-diet',
      'GET /api/history?user_id=...',
      'POST /api/grocery-list',
      'POST /api/swap-meal',
      'POST /api/compliance',
      'GET /api/compliance?user_id=...',
      'GET /api/settings?user_id=...',
      'PUT /api/settings',
      'POST /api/admin/auth/login',
      'POST /api/admin/auth/seed',
      'GET /api/admin/* (JWT required)',
      'GET /api/health',
    ],
  });
});

app.use('/api/auth', apiStrictLimiter, authRouter);
app.use('/api/generate-diet', apiGeneralLimiter, generateDietRouter);
app.use('/api/history', historyRouter);
app.use('/api/grocery-list', apiGeneralLimiter, groceryRouter);
app.use('/api/swap-meal', apiGeneralLimiter, swapMealRouter);
app.use('/api/compliance', apiGeneralLimiter, complianceRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin/auth', apiStrictLimiter, adminAuthRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', async (_req, res) => {
  try {
    const { getDb } = await import('./config/db.js');
    await getDb();
    logger.info('Health check OK', { db: 'connected' });
    res.json({ success: true, message: 'Diet API running', db: 'connected' });
  } catch (err) {
    const detail = err?.message ?? err?.errmsg ?? String(err);
    logger.warn('Health check: DB unavailable', { message: detail });
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      error: detail,
    });
  }
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err?.message ?? String(err), stack: err?.stack });
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: 'Something went wrong' },
  });
});

async function logMongoStatus() {
  const uri = process.env.MONGODB_URI?.trim?.() ?? '';
  if (!uri) {
    logger.info('MongoDB: not configured (missing MONGODB_URI in .env)');
    return;
  }
  try {
    const { getDb } = await import('./config/db.js');
    await getDb();
    logger.info('MongoDB: connected');
  } catch (err) {
    const msg = err?.message ?? String(err);
    logger.warn('MongoDB: disconnected', { message: msg });
    logger.info('App still works: diet generation and UI; only history save/load is disabled.');
  }
}

function tryListen(port) {
  const server = app.listen(port, () => {
    logger.info(`Server running at http://localhost:${port}`);
    if (port !== 5000) {
      logger.info(`Tip: In client folder add VITE_API_PORT=${port} to .env.local so the app can reach the API.`);
    }
    logMongoStatus();
  });
  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE' && port < 5010) {
      logger.warn(`Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1);
    } else {
      logger.error('Server error', { message: err?.message ?? err });
      process.exit(1);
    }
  });
}

tryListen(PORT);
