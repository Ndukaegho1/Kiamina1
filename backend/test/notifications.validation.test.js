import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePatchStatusPayload,
  validateSendEmailPayload
} from "../services/notifications-service/src/validation/notifications.validation.js";

test("notifications: send-email validator normalizes recipient list", () => {
  const { errors, payload } = validateSendEmailPayload({
    to: "a@example.com, b@example.com",
    subject: "Hello",
    message: "World"
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(payload.to, ["a@example.com", "b@example.com"]);
  assert.equal(payload.subject, "Hello");
  assert.equal(payload.message, "World");
});

test("notifications: patch-status validator blocks unsupported status", () => {
  const result = validatePatchStatusPayload({ status: "queued-later" });
  assert.equal(result.error, "status must be one of: queued, sent, failed");
});
