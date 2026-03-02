import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateRecordPayload,
  validateMonthlyReportQuery
} from "../services/documents-service/src/validation/accounting-records.validation.js";
import {
  validateCreateDocumentPayload,
  validateStatusPayload
} from "../services/documents-service/src/validation/documents.validation.js";

test("documents: create document validator parses tags and metadata strings", () => {
  const { errors, payload } = validateCreateDocumentPayload({
    ownerUserId: "uid_1",
    fileName: "invoice.pdf",
    category: "sales",
    tags: "urgent, q1",
    metadata: "{\"source\":\"upload\"}"
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(payload.tags, ["urgent", "q1"]);
  assert.deepEqual(payload.metadata, { source: "upload" });
});

test("documents: status validator rejects unsupported statuses", () => {
  const { error } = validateStatusPayload({ status: "archived" });
  assert.equal(error, "status must be one of: processing, to-review, ready");
});

test("records: create record validator accepts normalized valid payload", () => {
  const { errors, payload } = validateCreateRecordPayload({
    ownerUserId: "uid_1",
    category: "expenses",
    amount: 1250.4,
    currency: "ngn",
    transactionType: "debit",
    transactionDate: "2026-03-01",
    metadata: "{\"source\":\"import\"}"
  });

  assert.deepEqual(errors, []);
  assert.equal(payload.currency, "NGN");
  assert.equal(payload.transactionType, "debit");
  assert.ok(payload.transactionDate instanceof Date);
  assert.deepEqual(payload.metadata, { source: "import" });
});

test("records: monthly report query validator builds date range from year and month", () => {
  const { errors, payload } = validateMonthlyReportQuery(
    { year: "2025", month: "12" },
    { uid: "uid_1" }
  );

  assert.deepEqual(errors, []);
  assert.equal(payload.ownerUserId, "uid_1");
  assert.equal(payload.year, 2025);
  assert.equal(payload.month, 12);
  assert.ok(payload.dateFrom instanceof Date);
  assert.ok(payload.dateTo instanceof Date);
});
