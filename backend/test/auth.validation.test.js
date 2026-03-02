import assert from "node:assert/strict";
import test from "node:test";
import {
  validateLogoutSessionPayload,
  validateLoginSessionPayload,
  validateRegisterAccountPayload,
  validateSendOtpPayload
} from "../services/auth-service/src/validation/auth.validation.js";

test("auth: send otp validator normalizes email and default purpose", () => {
  const { errors, payload } = validateSendOtpPayload({
    email: "  USER@Example.com  "
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.email, "user@example.com");
  assert.equal(payload.purpose, "login");
});

test("auth: register validator supports displayName alias and role/provider normalization", () => {
  const { errors, payload } = validateRegisterAccountPayload({
    email: "new.user@example.com",
    displayName: " New User ",
    role: "ADMIN",
    status: "ACTIVE",
    provider: "GOOGLE",
    emailVerified: "yes"
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.fullName, "New User");
  assert.equal(payload.role, "admin");
  assert.equal(payload.status, "active");
  assert.equal(payload.provider, "google");
  assert.equal(payload.emailVerified, true);
});

test("auth: login session validator requires uid or email", () => {
  const { errors } = validateLoginSessionPayload({});
  assert.ok(errors.includes("At least one of uid or email is required"));
});

test("auth: logout validator requires session id", () => {
  const { errors } = validateLogoutSessionPayload({});
  assert.ok(errors.includes("sessionId is required"));
});
