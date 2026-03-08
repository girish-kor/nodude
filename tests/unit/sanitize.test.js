import { sanitize } from '../../src/utils/sanitize.js';

describe('sanitize', () => {
  test('strips xss from string', () => {
    const result = sanitize('<script>alert(1)</script>hello');
    expect(result).not.toContain('<script>');
    expect(result).toContain('hello');
  });

  test('handles plain strings', () => {
    expect(sanitize('hello world')).toBe('hello world');
  });

  test('recursively sanitizes objects', () => {
    const result = sanitize({ name: '<b>evil</b>', age: 5 });
    expect(result.name).not.toContain('<b>');
    expect(result.age).toBe(5);
  });

  test('sanitizes arrays', () => {
    const result = sanitize(['<script>', 'safe']);
    expect(result[0]).not.toContain('<script>');
    expect(result[1]).toBe('safe');
  });

  test('handles null and undefined', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
  });
});
