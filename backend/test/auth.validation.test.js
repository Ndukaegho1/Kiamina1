import assert from "node:assert/strict";
import test from "node:test";
import {
  validateRefreshTokenPayload,
  validateLogoutSessionPayload,
  validateLoginSessionPayload,
  validateRegisterAccountPayload,
  validateSendOtpPayload,
  validateSendPasswordResetLinkPayload,
  validateSendSmsOtpPayload,
  validateVerifySmsOtpPayload,
  validateVerifyTokenPayload
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

test("auth: verify-token validator accepts accessToken without idToken", () => {
  const { accessToken, error } = validateVerifyTokenPayload({
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature"
  });

  assert.equal(error, undefined);
  assert.equal(accessToken, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature");
});

test("auth: refresh-token validator allows cookie-based fallback payload", () => {
  const { errors, payload } = validateRefreshTokenPayload({});
  assert.deepEqual(errors, []);
  assert.equal(payload.sessionId, "");
  assert.equal(payload.refreshToken, "");
});

test("auth: password-reset validator requires email and resetLink", () => {
  const { errors } = validateSendPasswordResetLinkPayload({ email: "user@example.com" });
  assert.ok(errors.includes("resetLink is required"));
});

test("auth: send-sms-otp validator normalizes fields", () => {
  const { errors, payload } = validateSendSmsOtpPayload({
    phoneNumber: "+2348012345678",
    purpose: "ADMIN-EMAIL-CHANGE",
    email: "NEW@EXAMPLE.COM",
    currentEmail: "OLD@EXAMPLE.COM"
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.purpose, "admin-email-change");
  assert.equal(payload.email, "new@example.com");
  assert.equal(payload.currentEmail, "old@example.com");
});

test("auth: verify-sms-otp validator enforces otp digits", () => {
  const { errors } = validateVerifySmsOtpPayload({
    phoneNumber: "+2348012345678",
    otp: "ABCD"
  });

  assert.ok(errors.includes("otp must be 4 to 8 digits"));
});
