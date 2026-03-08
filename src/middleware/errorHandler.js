import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    logger.error(`[${req.method}] ${req.path} - ${status}: ${message}`, err.stack);
  } else {
    logger.warn(`[${req.method}] ${req.path} - ${status}: ${message}`);
  }

  const body = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  if (err.name === 'ValidationError' && err.errors) {
    body.errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    body.message = `${field} already exists`;
    return res.status(409).json({ ...body, message: body.message });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ ...body, message: 'Invalid ID format' });
  }

  res.status(status).json(body);
}
