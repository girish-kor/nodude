import { beforeAll, describe, expect, test } from "@jest/globals";
import request from "supertest";
import { createApp } from "../../src/index.js";

let app;

beforeAll(async () => {
  app = await createApp({
    database: { type: "sqlite", filename: ":memory:" },
    auth: { secret: "test-secret", expiresIn: "1h" },
    logging: { level: "silent" },
    models: [
      {
        name: "User",
        auth: true,
        schema: {
          name: { type: "String", required: true },
          email: { type: "String", required: true, unique: true },
          password: { type: "String", required: true, private: true },
          role: { type: "String", default: "user", enum: ["user", "admin"] },
        },
      },
    ],
  });
}, 30000);

describe("Health check", () => {
  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
  });
});

describe("Auth endpoints", () => {
  let token;

  test("POST /api/v1/auth/register creates user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
    token = res.body.data.token;
  });

  test("POST /api/v1/auth/register rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test User 2",
        email: "test@example.com",
        password: "password123",
      });
    expect(res.status).toBe(409);
  });

  test("POST /api/v1/auth/login returns token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
  });

  test("POST /api/v1/auth/login rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  test("GET /api/v1/auth/me returns current user", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "password123" });
    const t = loginRes.body.data.token;

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("test@example.com");
  });
});
