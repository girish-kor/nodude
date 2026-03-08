import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

export function setupMiddleware(app, config) {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  app.use(cors(config.cors || { origin: '*' }));

  if (config.logging?.level !== 'silent') {
    const format = config.logging?.format || 'combined';
    app.use(morgan(format, {
      stream: { write: (msg) => logger.http(msg.trim()) }
    }));
  }

  const rateLimitConfig = config.rateLimit || { windowMs: 15 * 60 * 1000, max: 100 };
  app.use(rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
  }));

  app.disable('x-powered-by');
}
