import bcrypt from 'bcryptjs';
import { AppError, AuthError } from '../utils/errors.js';
import { validationResult } from 'express-validator';
import { sanitize } from '../utils/sanitize.js';

export class AuthController {
  constructor({ model, modelDef, authEngine, hooks, modelName }) {
    this.model = model;
    this.modelDef = modelDef;
    this.authEngine = authEngine;
    this.hooks = hooks;
    this.modelName = modelName;
  }

  register() {
    return async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({ success: false, errors: errors.array() });
        }

        const data = sanitize(req.body);

        const existing = await this.model.findOne({ email: data.email });
        if (existing) return next(new AppError('Email already registered', 409));

        const saltRounds = this.authEngine.config?.saltRounds || 10;
        data.password = await bcrypt.hash(data.password, saltRounds);

        if (this.hooks[`${this.modelName.toLowerCase()}.beforeCreate`]) {
          Object.assign(data, await this.hooks[`${this.modelName.toLowerCase()}.beforeCreate`](data, req) || {});
        }

        const user = await this.model.create(data);

        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete userObj.password;

        const token = this.authEngine.sign({ id: userObj._id || userObj.id, role: userObj.role || 'user' });

        if (this.hooks[`${this.modelName.toLowerCase()}.afterCreate`]) {
          await this.hooks[`${this.modelName.toLowerCase()}.afterCreate`](user, { req });
        }

        res.status(201).json({ success: true, data: { user: userObj, token } });
      } catch (err) {
        next(err);
      }
    };
  }

  login() {
    return async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(422).json({ success: false, errors: errors.array() });
        }

        const { email, password } = sanitize(req.body);
        const user = await this.model.findOne({ email });
        if (!user) return next(new AuthError('Invalid credentials'));

        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        const isMatch = await bcrypt.compare(password, userObj.password);
        if (!isMatch) return next(new AuthError('Invalid credentials'));

        delete userObj.password;

        const token = this.authEngine.sign({ id: userObj._id || userObj.id, role: userObj.role || 'user' });
        const result = { token, user: userObj };

        if (this.authEngine.config?.refreshEnabled) {
          result.refreshToken = this.authEngine.signRefresh({ id: userObj._id || userObj.id });
        }

        res.json({ success: true, data: result });
      } catch (err) {
        next(err);
      }
    };
  }

  logout() {
    return async (req, res) => {
      res.json({ success: true, message: 'Logged out' });
    };
  }

  me() {
    return async (req, res, next) => {
      try {
        let user;
        if (typeof this.model.findById === 'function') {
          user = await this.model.findById(req.user.id);
        } else {
          user = await this.model.findOne({ id: req.user.id });
        }
        if (!user) return next(new AuthError('User not found'));
        const userObj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
        delete userObj.password;
        res.json({ success: true, data: userObj });
      } catch (err) {
        next(err);
      }
    };
  }

  refresh() {
    return async (req, res, next) => {
      try {
        const { refreshToken } = req.body;
        if (!refreshToken) return next(new AuthError('Refresh token required'));
        const decoded = this.authEngine.verifyRefresh(refreshToken);
        const token = this.authEngine.sign({ id: decoded.id, role: decoded.role || 'user' });
        res.json({ success: true, data: { token } });
      } catch (err) {
        next(new AuthError('Invalid refresh token'));
      }
    };
  }
}
