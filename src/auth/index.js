import jwt from 'jsonwebtoken';
import { AuthError } from '../utils/errors.js';

export class AuthEngine {
  constructor(config = {}) {
    this.config = config;
    this.secret = config.secret || 'change-me-in-production';
    this.expiresIn = config.expiresIn || '7d';
    this.refreshSecret = config.refreshSecret || this.secret + '_refresh';
    this.refreshExpiresIn = config.refreshExpiresIn || '30d';
  }

  sign(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
  }

  verify(token) {
    return jwt.verify(token, this.secret);
  }

  signRefresh(payload) {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiresIn });
  }

  verifyRefresh(token) {
    return jwt.verify(token, this.refreshSecret);
  }

  authenticate() {
    return (req, res, next) => {
      try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) {
          return next(new AuthError('No token provided'));
        }
        const token = header.split(' ')[1];
        const decoded = this.verify(token);
        req.user = decoded;
        next();
      } catch (err) {
        next(new AuthError('Invalid or expired token'));
      }
    };
  }

  authorize(roles = []) {
    return (req, res, next) => {
      if (!req.user) return next(new AuthError('Not authenticated'));
      if (roles.includes('*')) return next();

      const userRole = req.user.role || 'user';
      if (!roles.includes(userRole) && !roles.includes('owner')) {
        return next(new AuthError('Insufficient permissions', 403));
      }
      next();
    };
  }

  optionalAuthenticate() {
    return (req, _res, next) => {
      try {
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
          const token = header.split(' ')[1];
          req.user = this.verify(token);
        }
      } catch (_) {}
      next();
    };
  }
}
