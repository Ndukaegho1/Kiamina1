import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminDashboardUpdatePayload,
  buildClientDashboardUpdatePayload,
  buildClientProfileUpdatePayload,
  validateSyncFromAuthPayload
} from "../services/users-service/src/validation/users.validation.js";

test("users: sync-from-auth validator accepts valid payload", () => {
  const { errors, payload } = validateSyncFromAuthPayload({
    uid: "uid_1",
    email: "Member@Example.com",
    displayName: "Member Name",
    roles: ["client", "admin"]
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.email, "member@example.com");
  assert.deepEqual(payload.roles, ["client", "admin"]);
});

test("users: profile payload normalizes names and financial month", () => {
  const { errors, payload } = buildClientProfileUpdatePayload({
    firstName: "jane",
    lastName: "doe",
    businessType: "Business",
    reportingCycle: "March"
  });

  assert.deepEqual(errors, []);
  assert.equal(payload["clientProfile.firstName"], "Jane");
  assert.equal(payload["clientProfile.lastName"], "Doe");
  assert.equal(payload["entityProfile.businessType"], "business");
  assert.equal(payload["entityProfile.financialYearEndMonth"], "03");
});

test("users: dashboard payload rejects unknown default page", () => {
  const { errors } = buildClientDashboardUpdatePayload({
    defaultLandingPage: "unknown-page"
  });

  assert.ok(
    errors.includes(
      "defaultLandingPage must be one of: dashboard, expenses, sales, bank-statements, upload-history, recent-activities, support, settings"
    )
  );
});

test("users: admin dashboard payload builds support leads and newsletters", () => {
  const { errors, payload } = buildAdminDashboardUpdatePayload({
    defaultLandingPage: "support-leads",
    supportLeads: [{ email: "lead@example.com", status: "new" }],
    newsletters: [{ email: "newsletter@example.com", status: "subscribed" }]
  });

  assert.deepEqual(errors, []);
  assert.equal(payload["adminDashboard.defaultLandingPage"], "support-leads");
  assert.equal(payload["adminDashboard.supportLeads"].length, 1);
  assert.equal(payload["adminDashboard.newsletters"].length, 1);
  assert.equal(payload["adminDashboard.stats.openSupportLeads"], 1);
  assert.equal(payload["adminDashboard.stats.newsletterSubscribers"], 1);
});
