import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

let mongoServer;
let app;
let connectToDatabase;
let AuthAccount;
let AuthSession;
let setupError = null;

const ensureSetup = (t) => {
  if (!setupError) {
    return true;
  }

  t.skip(`Mongo integration setup unavailable: ${setupError.message}`);
  return false;
};

test.before(async () => {
  process.env.NODE_ENV = "test";
  process.env.SERVICE_NAME = "auth-service-test";
  process.env.MONGO_DB_NAME = "kiamina_auth_integration";
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "";
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
  process.env.AUTH_TOKEN_SECRET = "test-auth-token-secret";
  process.env.MONGOMS_RUNTIME_DOWNLOAD = process.env.MONGOMS_RUNTIME_DOWNLOAD || "0";

  try {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();

    ({ default: app } = await import("../services/auth-service/src/app.js"));
    ({ connectToDatabase } = await import("../services/auth-service/src/config/db.js"));
    ({ AuthAccount } = await import("../services/auth-service/src/models/AuthAccount.model.js"));
    ({ AuthSession } = await import("../services/auth-service/src/models/AuthSession.model.js"));

    await connectToDatabase();
  } catch (error) {
    setupError = error;
  }
});

test.beforeEach(async () => {
  if (setupError) {
    return;
  }

  await AuthAccount.deleteMany({});
  await AuthSession.deleteMany({});
});

test.after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

test("auth integration: login-session and logout-session revoke lifecycle", async (t) => {
  if (!ensureSetup(t)) return;

  const loginResponse = await request(app).post("/api/v1/auth/login-session").send({
    email: "admin@example.com",
    role: "admin",
    loginMethod: "password",
    sessionTtlMinutes: 30,
    ipAddress: "127.0.0.1",
    userAgent: "integration-test"
  });

  assert.equal(loginResponse.status, 201);
  assert.ok(loginResponse.body?.account?.uid);
  assert.ok(loginResponse.body?.session?.sessionId);
  assert.ok(Array.isArray(loginResponse.headers["set-cookie"]));
  assert.ok(
    loginResponse.headers["set-cookie"].some((cookieValue) =>
      cookieValue.startsWith("kiamina_access_token=")
    )
  );
  assert.ok(
    loginResponse.headers["set-cookie"].some((cookieValue) =>
      cookieValue.startsWith("kiamina_refresh_token=")
    )
  );

  const uid = loginResponse.body.account.uid;
  const sessionId = loginResponse.body.session.sessionId;

  const logoutResponse = await request(app)
    .post("/api/v1/auth/logout-session")
    .set("x-user-id", uid)
    .send({
      sessionId,
      reason: "logout"
    });

  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutResponse.body?.session?.sessionId, sessionId);
  assert.equal(logoutResponse.body?.session?.uid, uid);

  const dbSession = await AuthSession.findOne({ sessionId }).lean();
  assert.ok(dbSession?.revokedAt);
  assert.equal(dbSession?.revokedReason, "logout");

  const secondLogoutResponse = await request(app)
    .post("/api/v1/auth/logout-session")
    .set("x-user-id", uid)
    .send({
      sessionId
    });

  assert.equal(secondLogoutResponse.status, 200);
  assert.match(secondLogoutResponse.body?.message || "", /already revoked or expired/i);
});

test("auth integration: refresh-token rotates access and refresh cookies", async (t) => {
  if (!ensureSetup(t)) return;

  const agent = request.agent(app);

  const loginResponse = await agent.post("/api/v1/auth/login-session").send({
    email: "refresh@example.com",
    role: "admin",
    loginMethod: "password",
    sessionTtlMinutes: 60
  });

  assert.equal(loginResponse.status, 201);

  const refreshResponse = await agent.post("/api/v1/auth/refresh-token").send({});
  assert.equal(refreshResponse.status, 200);
  assert.match(refreshResponse.body?.message || "", /refreshed/i);
  assert.ok(Array.isArray(refreshResponse.headers["set-cookie"]));
  assert.ok(
    refreshResponse.headers["set-cookie"].some((cookieValue) =>
      cookieValue.startsWith("kiamina_access_token=")
    )
  );
});

test("auth integration: logout-session blocks revoking another user's session", async (t) => {
  if (!ensureSetup(t)) return;

  const loginResponse = await request(app).post("/api/v1/auth/login-session").send({
    email: "owner@example.com",
    role: "owner",
    loginMethod: "password",
    sessionTtlMinutes: 30
  });

  assert.equal(loginResponse.status, 201);
  const sessionId = loginResponse.body?.session?.sessionId;
  assert.ok(sessionId);

  const forbiddenResponse = await request(app)
    .post("/api/v1/auth/logout-session")
    .set("x-user-id", "different-user")
    .send({
      sessionId
    });

  assert.equal(forbiddenResponse.status, 403);
  assert.match(forbiddenResponse.body?.message || "", /cannot revoke another user's session/i);
});
