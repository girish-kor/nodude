const LEVELS = { silent: -1, error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const COLORS = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  http: '\x1b[35m',
  debug: '\x1b[37m',
  reset: '\x1b[0m'
};

class Logger {
  constructor() {
    this.level = 'info';
  }

  setLevel(level) {
    this.level = level;
  }

  _log(level, ...args) {
    if (LEVELS[level] > LEVELS[this.level]) return;
    const color = COLORS[level] || '';
    const reset = COLORS.reset;
    const ts = new Date().toISOString();
    const prefix = `${color}[${ts}] [${level.toUpperCase()}]${reset}`;
    console.log(prefix, ...args);
  }

  error(...args) { this._log('error', ...args); }
  warn(...args) { this._log('warn', ...args); }
  info(...args) { this._log('info', ...args); }
  http(...args) { this._log('http', ...args); }
  debug(...args) { this._log('debug', ...args); }
}

export const logger = new Logger();
