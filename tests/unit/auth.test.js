import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { AuthEngine } from "../../src/auth/index.js";

describe("AuthEngine", () => {
  let auth;

  beforeEach(() => {
    auth = new AuthEngine({ secret: "test-secret", expiresIn: "1h" });
  });

  test("signs and verifies a token", () => {
    const token = auth.sign({ id: "123", role: "user" });
    expect(token).toBeTruthy();
    const decoded = auth.verify(token);
    expect(decoded.id).toBe("123");
    expect(decoded.role).toBe("user");
  });

  test("throws on invalid token", () => {
    expect(() => auth.verify("invalid.token.here")).toThrow();
  });

  test("authenticate middleware sets req.user", () => {
    const token = auth.sign({ id: "abc" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();
    auth.authenticate()(req, res, next);
    expect(req.user.id).toBe("abc");
    expect(next).toHaveBeenCalledWith();
  });

  test("authenticate middleware rejects missing token", () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();
    auth.authenticate()(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
    );
  });

  test("authorize allows matching role", () => {
    const req = { user: { role: "admin" } };
    const res = {};
    const next = jest.fn();
    auth.authorize(["admin"])(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test("authorize rejects wrong role", () => {
    const req = { user: { role: "user" } };
    const res = {};
    const next = jest.fn();
    auth.authorize(["admin"])(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
    );
  });
});
