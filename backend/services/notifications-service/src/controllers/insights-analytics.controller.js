import { getRequestActor, isAdminActor } from "../utils/request-actor.js";
import {
  getWebsiteInsightSummaryForAdmin,
  recordWebsiteInsightEvent
} from "../services/insights-analytics.service.js";
import {
  validateInsightAnalyticsEventPayload,
  validateInsightAnalyticsSummaryQuery
} from "../validation/insights-analytics.validation.js";

const readRequestIpAddress = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return String(req.ip || req.socket?.remoteAddress || "").trim();
};

const requireAdminActor = (req, res) => {
  const actor = getRequestActor(req);
  if (!actor.uid) {
    res.status(401).json({
      message: "Missing x-user-id header from authenticated gateway request"
    });
    return null;
  }

  if (!isAdminActor(actor)) {
    res.status(403).json({ message: "Only admin users can perform this action." });
    return null;
  }

  return actor;
};

export const createInsightAnalyticsEvent = async (req, res, next) => {
  try {
    const { errors, payload } = validateInsightAnalyticsEventPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const ipAddress = readRequestIpAddress(req);
    const userAgent = String(req.headers["user-agent"] || "").trim();
    const country = String(payload.country || req.headers["x-country"] || "").trim();
    const savedEvent = await recordWebsiteInsightEvent({
      payload,
      ipAddress,
      country,
      userAgent
    });

    return res.status(202).json({
      accepted: true,
      eventId: savedEvent.eventId
    });
  } catch (error) {
    return next(error);
  }
};

export const getInsightAnalyticsSummary = async (req, res, next) => {
  try {
    const actor = requireAdminActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateInsightAnalyticsSummaryQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const summary = await getWebsiteInsightSummaryForAdmin({
      days: payload.days,
      topLimit: payload.top
    });
    return res.status(200).json(summary);
  } catch (error) {
    return next(error);
  }
};
