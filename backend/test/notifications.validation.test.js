import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePatchStatusPayload,
  validateSendEmailPayload
} from "../services/notifications-service/src/validation/notifications.validation.js";
import {
  buildSupportTicketUpdatePayload,
  validateCreateSupportMessagePayload,
  validateCreateSupportTicketPayload
} from "../services/notifications-service/src/validation/support.validation.js";
import {
  validateCreateChatSessionPayload,
  validateEscalateChatSessionPayload,
  validatePostChatMessagePayload
} from "../services/notifications-service/src/validation/chatbot.validation.js";
import {
  buildKnowledgeBaseArticleUpdatePayload,
  validateCreateKnowledgeBaseArticlePayload
} from "../services/notifications-service/src/validation/knowledge-base.validation.js";

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

test("support: create ticket validator accepts normalized payload", () => {
  const { errors, payload } = validateCreateSupportTicketPayload({
    subject: "Need Help",
    description: "Issue details",
    priority: "HIGH",
    tags: "billing,urgent"
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.priority, "high");
  assert.deepEqual(payload.tags, ["billing", "urgent"]);
});

test("support: update ticket payload rejects invalid status", () => {
  const { errors } = buildSupportTicketUpdatePayload({ status: "pending" });
  assert.ok(errors.includes("status must be one of: open, in-progress, waiting-user, resolved, closed"));
});

test("support: message validator requires content", () => {
  const { errors } = validateCreateSupportMessagePayload({ content: "" });
  assert.ok(errors.includes("content is required"));
});

test("chatbot: create session payload defaults channel and reuseActive", () => {
  const { errors, payload } = validateCreateChatSessionPayload({});
  assert.deepEqual(errors, []);
  assert.equal(payload.channel, "web");
  assert.equal(payload.reuseActive, true);
});

test("chatbot: message validator requires non-empty message", () => {
  const { errors } = validatePostChatMessagePayload({ message: "" });
  assert.ok(errors.includes("message is required"));
});

test("chatbot: escalate payload validates priority", () => {
  const { errors } = validateEscalateChatSessionPayload({ priority: "critical" });
  assert.ok(errors.includes("priority must be one of: low, medium, high, urgent"));
});

test("knowledge-base: create article validator accepts required fields", () => {
  const { errors, payload } = validateCreateKnowledgeBaseArticlePayload({
    title: "How to upload docs",
    content: "Upload docs using dashboard.",
    status: "published",
    tags: "docs,onboarding"
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.status, "published");
  assert.deepEqual(payload.tags, ["docs", "onboarding"]);
});

test("knowledge-base: update payload rejects invalid category", () => {
  const { errors } = buildKnowledgeBaseArticleUpdatePayload({ category: "product" });
  assert.ok(
    errors.includes("category must be one of [faq, billing, technical, security, getting-started, other]")
  );
});
