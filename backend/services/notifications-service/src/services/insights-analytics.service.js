import crypto from "node:crypto";
import {
  createWebsiteInsightEvent,
  getWebsiteInsightAnalyticsSummary
} from "../repositories/insights-analytics.repository.js";

const VISIT_EVENT_TYPES = new Set(["site_visit", "page_view"]);

const normalizeEventType = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

const normalizePage = (value = "") => String(value || "").trim().toLowerCase().slice(0, 80);
const normalizeTargetType = (value = "") => String(value || "").trim().toLowerCase().slice(0, 50);
const normalizeTargetValue = (value = "") => String(value || "").trim().slice(0, 160);

const normalizeMetadata = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const resolveSessionId = ({ sessionId = "", ipAddress = "", userAgent = "" } = {}) => {
  const normalizedSessionId = String(sessionId || "").trim();
  if (normalizedSessionId) return normalizedSessionId;

  const fallbackSeed = `${ipAddress || "unknown-ip"}::${userAgent || "unknown-agent"}`;
  const hash = crypto.createHash("sha1").update(fallbackSeed).digest("hex").slice(0, 20);
  return `anon_${hash}`;
};

const buildEventId = () =>
  `evt_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

export const recordWebsiteInsightEvent = async ({
  payload,
  ipAddress = "",
  country = "",
  userAgent = ""
}) => {
  const normalizedType = normalizeEventType(payload.eventType);
  const category = VISIT_EVENT_TYPES.has(normalizedType) ? "visit" : "interaction";
  const normalizedSessionId = resolveSessionId({
    sessionId: payload.sessionId,
    ipAddress,
    userAgent
  });

  return createWebsiteInsightEvent({
    eventId: buildEventId(),
    sessionId: normalizedSessionId,
    eventType: normalizedType,
    category,
    page: normalizePage(payload.page),
    targetType: normalizeTargetType(payload.targetType),
    targetId: normalizeTargetValue(payload.targetId),
    targetLabel: normalizeTargetValue(payload.targetLabel),
    metadata: normalizeMetadata(payload.metadata),
    ipAddress: String(ipAddress || "").trim().slice(0, 120),
    country: String(country || "").trim().slice(0, 60),
    userAgent: String(userAgent || "").trim().slice(0, 300)
  });
};

export const getWebsiteInsightSummaryForAdmin = async ({
  days = 30,
  topLimit = 8
} = {}) =>
  getWebsiteInsightAnalyticsSummary({ days, topLimit });
