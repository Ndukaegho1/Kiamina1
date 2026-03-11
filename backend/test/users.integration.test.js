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
  process.env.DOCUMENTS_SERVICE_URL = "";
  process.env.DOCUMENTS_SERVICE_TIMEOUT_MS = "500";
  process.env.AUTH_SERVICE_URL = "";
  process.env.AUTH_SERVICE_TIMEOUT_MS = "500";
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

test("users integration: client workspace patch and get endpoints persist workspace payload", async (t) => {
  if (!ensureSetup(t)) return;

  const uid = "client_workspace_uid";
  const email = "workspace-client@example.com";

  await User.create({
    uid,
    email,
    roles: ["client"],
    displayName: "Workspace Client"
  });

  const patchResponse = await request(app)
    .patch("/api/v1/users/me/client-workspace")
    .set("x-user-id", uid)
    .set("x-user-email", email)
    .set("x-user-roles", "client")
    .send({
      documents: {
        expenses: [{ id: "exp_1", fileName: "receipt.pdf" }]
      },
      activityLog: [{ id: "act_1", action: "uploaded-document" }],
      notificationSettings: { inAppEnabled: true },
      profilePhoto: "https://cdn.example.com/profile.png"
    });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body?.uid, uid);
  assert.equal(
    patchResponse.body?.workspace?.documents?.expenses?.[0]?.fileName,
    "receipt.pdf"
  );
  assert.equal(
    patchResponse.body?.workspace?.profilePhoto,
    "https://cdn.example.com/profile.png"
  );

  const getResponse = await request(app)
    .get("/api/v1/users/me/client-workspace")
    .set("x-user-id", uid)
    .set("x-user-email", email)
    .set("x-user-roles", "client");

  assert.equal(getResponse.status, 200);
  assert.equal(getResponse.body?.uid, uid);
  assert.equal(
    getResponse.body?.workspace?.activityLog?.[0]?.action,
    "uploaded-document"
  );
});

test("users integration: admin client-management list and patch update client account", async (t) => {
  if (!ensureSetup(t)) return;

  const adminUid = "admin_uid_management";
  const adminEmail = "admin-management@example.com";
  const clientUid = "client_uid_management";
  const clientEmail = "client-management@example.com";

  await User.create({
    uid: adminUid,
    email: adminEmail,
    roles: ["admin"],
    displayName: "Admin Management"
  });

  await User.create({
    uid: clientUid,
    email: clientEmail,
    roles: ["client"],
    displayName: "Client Management",
    status: "active",
    entityProfile: {
      businessName: "Acme Logistics",
      country: "Nigeria",
      currency: "NGN",
      businessType: "business"
    }
  });

  const listResponse = await request(app)
    .get("/api/v1/users/admin/client-management")
    .set("x-user-id", adminUid)
    .set("x-user-email", adminEmail)
    .set("x-user-roles", "admin")
    .query({ q: "Acme", limit: 10, page: 1 });

  assert.equal(listResponse.status, 200);
  assert.ok(Array.isArray(listResponse.body?.clients));
  assert.equal(listResponse.body?.clients?.length, 1);
  assert.equal(listResponse.body?.clients?.[0]?.uid, clientUid);

  const patchResponse = await request(app)
    .patch(`/api/v1/users/admin/client-management/clients/${clientUid}`)
    .set("x-user-id", adminUid)
    .set("x-user-email", adminEmail)
    .set("x-user-roles", "admin")
    .send({
      status: "suspended",
      verificationStatus: "submitted",
      assignedToUid: "area_admin_11",
      tags: ["Priority", "Escalated"]
    });

  assert.equal(patchResponse.status, 200);
  assert.equal(patchResponse.body?.status, "suspended");
  assert.equal(patchResponse.body?.verification?.status, "submitted");
  assert.equal(
    patchResponse.body?.clientWorkspace?.statusControl?.assignedToUid,
    "area_admin_11"
  );
  assert.deepEqual(
    patchResponse.body?.clientWorkspace?.statusControl?.tags,
    ["priority", "escalated"]
  );
});

test("users integration: owner can delete client-management account by uid", async (t) => {
  if (!ensureSetup(t)) return;

  const ownerUid = "owner_uid_management";
  const ownerEmail = "owner-management@example.com";
  const clientUid = "client_uid_delete_management";
  const clientEmail = "client-delete-management@example.com";

  await User.create({
    uid: ownerUid,
    email: ownerEmail,
    roles: ["owner"],
    displayName: "Owner Management"
  });

  await User.create({
    uid: clientUid,
    email: clientEmail,
    roles: ["client"],
    displayName: "Client Delete Management",
    status: "active"
  });

  const response = await request(app)
    .delete(`/api/v1/users/admin/client-management/clients/${clientUid}`)
    .set("x-user-id", ownerUid)
    .set("x-user-email", ownerEmail)
    .set("x-user-roles", "owner")
    .send({
      reason: "cleanup"
    });

  assert.equal(response.status, 200);
  assert.equal(response.body?.uid, clientUid);
  assert.equal(response.body?.cascade?.documents?.attempted, false);
  assert.equal(response.body?.cascade?.auth?.attempted, false);

  const deletedUser = await User.findOne({ uid: clientUid }).lean();
  assert.equal(deletedUser, null);
});

test("users integration: delete /users/me removes user and returns cascade summary", async (t) => {
  if (!ensureSetup(t)) return;

  const uid = "client_delete_uid";
  const email = "client-delete@example.com";

  await User.create({
    uid,
    email,
    roles: ["client"],
    displayName: "Client Delete"
  });

  const response = await request(app)
    .delete("/api/v1/users/me")
    .set("x-user-id", uid)
    .set("x-user-email", email)
    .set("x-user-roles", "client")
    .send({
      reason: "user-requested"
    });

  assert.equal(response.status, 200);
  assert.equal(response.body?.uid, uid);
  assert.equal(response.body?.cascade?.documents?.attempted, false);
  assert.equal(response.body?.cascade?.auth?.attempted, false);

  const deletedUser = await User.findOne({ uid }).lean();
  assert.equal(deletedUser, null);
});
