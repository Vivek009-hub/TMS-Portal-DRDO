import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { testConnection } from './config/database.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet());
app.use(cors({
  origin: config.app.url,
  credentials: true,
}));
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts' },
});
app.use('/api/auth/login', authLimiter);

const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many password reset requests, please try again later' },
});
app.use('/api/auth/forgot-password', resetRequestLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Training Management Portal API is running', timestamp: new Date().toISOString() });
});

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.warn('Starting server without database connection. Run npm run db:init && npm run db:seed');
  }

  app.listen(config.port, () => {
    logger.info(`${config.app.name} API running on port ${config.port} [${config.env}]`);
  });
}

startServer();

export default app;
