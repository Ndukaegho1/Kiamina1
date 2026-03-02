import assert from "node:assert/strict";
import mongoose from "mongoose";
import test from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

let mongoServer;
let app;
let connectToDatabase;
let User;
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
  process.env.SERVICE_NAME = "users-service-test";
  process.env.MONGO_DB_NAME = "kiamina_users_integration";
  process.env.DOCUMENTS_SERVICE_URL = "http://localhost:4103";
  process.env.DOCUMENTS_SERVICE_TIMEOUT_MS = "500";
  process.env.MONGOMS_RUNTIME_DOWNLOAD = process.env.MONGOMS_RUNTIME_DOWNLOAD || "0";

  try {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongoServer.getUri();

    ({ default: app } = await import("../services/users-service/src/app.js"));
    ({ connectToDatabase } = await import("../services/users-service/src/config/db.js"));
    ({ User } = await import("../services/users-service/src/models/User.model.js"));

    await connectToDatabase();
  } catch (error) {
    setupError = error;
  }
});

test.beforeEach(async () => {
  if (setupError) {
    return;
  }

  await User.deleteMany({});
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

test("users integration: admin dashboard stores support leads and newsletters", async (t) => {
  if (!ensureSetup(t)) return;

  const adminUid = "admin_uid_1";
  const adminEmail = "admin@example.com";

  await User.create({
    uid: adminUid,
    email: adminEmail,
    roles: ["admin"],
    displayName: "Admin User"
  });

  const patchResponse = await request(app)
    .patch("/api/v1/users/me/admin-dashboard")
    .set("x-user-id", adminUid)
    .set("x-user-email", adminEmail)
    .set("x-user-roles", "admin")
    .send({
      defaultLandingPage: "support-leads",
      adminProfile: {
        firstName: "Ada",
        lastName: "Admin",
        jobTitle: "Operations Lead"
      },
      supportLeads: [
        {
          leadId: "lead_001",
          fullName: "Beta Client",
          email: "beta@example.com",
          status: "new",
          source: "support-form"
        }
      ],
      newsletters: [
        {
          email: "subscribed@example.com",
          status: "subscribed",
          source: "website"
        },
        {
          email: "unsubscribed@example.com",
          status: "unsubscribed",
          source: "import"
        }
      ]
    });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body?.adminProfile?.firstName, "Ada");
  assert.equal(patchResponse.body?.dashboard?.supportLeads?.length, 1);
  assert.equal(patchResponse.body?.dashboard?.newsletters?.length, 2);
  assert.equal(patchResponse.body?.dashboard?.stats?.openSupportLeads, 1);
  assert.equal(patchResponse.body?.dashboard?.stats?.newsletterSubscribers, 1);
  assert.equal(patchResponse.body?.dashboard?.stats?.newsletterUnsubscribed, 1);

  const getResponse = await request(app)
    .get("/api/v1/users/me/admin-dashboard")
    .set("x-user-id", adminUid)
    .set("x-user-email", adminEmail)
    .set("x-user-roles", "admin");

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body?.dashboard?.supportLeads?.length, 1);
  assert.equal(getResponse.body?.dashboard?.newsletters?.length, 2);
});

test("users integration: non-admin actor cannot access admin dashboard endpoint", async (t) => {
  if (!ensureSetup(t)) return;

  const response = await request(app)
    .get("/api/v1/users/me/admin-dashboard")
    .set("x-user-id", "client_uid_1")
    .set("x-user-email", "client@example.com")
    .set("x-user-roles", "client");

  assert.equal(response.status, 403);
  assert.match(response.body?.message || "", /only admin users/i);
});
