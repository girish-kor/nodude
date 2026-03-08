import { AppError, AuthError, NotFoundError, ValidationError } from '../../src/utils/errors.js';

describe('Error classes', () => {
  test('AppError sets status and message', () => {
    const err = new AppError('Something broke', 500);
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(500);
  });

  test('AuthError defaults to 401', () => {
    const err = new AuthError();
    expect(err.statusCode).toBe(401);
  });

  test('NotFoundError defaults to 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
  });

  test('ValidationError defaults to 422', () => {
    const err = new ValidationError('Bad input');
    expect(err.statusCode).toBe(422);
  });
});
