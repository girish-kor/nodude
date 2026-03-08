import { loadConfig } from '../../src/config/loader.js';

describe('loadConfig', () => {
  test('returns defaults when no config provided', () => {
    const cfg = loadConfig();
    expect(cfg.port).toBe(3000);
    expect(cfg.apiPrefix).toBe('/api/v1');
    expect(cfg.database.type).toBe('mongodb');
  });

  test('merges user config over defaults', () => {
    const cfg = loadConfig({ port: 8080, apiPrefix: '/v2' });
    expect(cfg.port).toBe(8080);
    expect(cfg.apiPrefix).toBe('/v2');
    expect(cfg.database.type).toBe('mongodb');
  });

  test('deep merges nested config', () => {
    const cfg = loadConfig({ auth: { expiresIn: '1d' } });
    expect(cfg.auth.expiresIn).toBe('1d');
    expect(cfg.auth.saltRounds).toBe(10);
  });
});
