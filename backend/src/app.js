import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import apiRoutes from './routes/api.js';
import v1Routes from './routes/v1.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

function buildCorsOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowAnyOrigin = process.env.CORS_ALLOW_ANY_ORIGIN
    ? process.env.CORS_ALLOW_ANY_ORIGIN === 'true'
    : !isProd;

  const allowlist = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((x) => x.trim().replace(/\/$/, '')) // strip trailing slash if present
    .filter(Boolean);
  const defaultAllowedPatterns = [/^https:\/\/.*\.vercel\.app$/i, /^http:\/\/localhost(?::\d+)?$/i, /^http:\/\/127\.0\.0\.1(?::\d+)?$/i];

  if (allowAnyOrigin) {
    return {
      origin: true,
      credentials: true
    };
  }

  return {
    origin(origin, cb) {
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowlist.includes(origin)) {
        cb(null, true);
        return;
      }
      if (allowlist.length === 0 && defaultAllowedPatterns.some((pattern) => pattern.test(origin))) {
        cb(null, true);
        return;
      }
      cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  };
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 300
    })
  );

  app.get('/health', (req, res) => {
    res.json({ success: true, status: 'ok' });
  });

  app.use('/api', apiRoutes);
  app.use('/api/v1', v1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
