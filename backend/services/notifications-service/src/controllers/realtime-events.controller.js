import { env } from "../config/env.js";
import { getRequestActor, isAdminActor } from "../utils/request-actor.js";
import {
  parseRealtimeFilterQuery,
  publishRealtimeEvent,
  subscribeRealtimeEvents
} from "../services/realtime-events.service.js";
import {
  validateRealtimePublishPayload,
  validateRealtimeStreamQuery
} from "../validation/realtime-events.validation.js";

const hasValidServiceToken = (req) => {
  const configuredToken = String(env.realtimeEventsServiceToken || "").trim();
  if (!configuredToken) {
    return false;
  }

  const providedToken = String(req.headers["x-service-token"] || "").trim();
  return Boolean(providedToken && providedToken === configuredToken);
};

const requireActor = (req, res) => {
  const actor = getRequestActor(req);
  if (!actor.uid) {
    res.status(401).json({
      message: "Missing x-user-id header from authenticated gateway request"
    });
    return null;
  }

  return actor;
};

export const streamEvents = async (req, res, next) => {
  try {
    const actor = requireActor(req, res);
    if (!actor) return;

    const { errors, payload } = validateRealtimeStreamQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const actorIsAdmin = isAdminActor(actor);
    if (payload.scope === "all" && !actorIsAdmin) {
      return res.status(403).json({ message: "Only admin users can subscribe with scope=all." });
    }

    const filters = parseRealtimeFilterQuery(payload);
    subscribeRealtimeEvents({
      req,
      res,
      actor: {
        uid: actor.uid,
        roles: actor.roles,
        isAdmin: actorIsAdmin
      },
      scope: filters.scope,
      eventTypes: filters.eventTypes,
      topics: filters.topics
    });
  } catch (error) {
    return next(error);
  }
};

export const publishEvent = async (req, res, next) => {
  try {
    const internalPublisher = hasValidServiceToken(req);
    let actor = getRequestActor(req);

    if (!internalPublisher) {
      actor = requireActor(req, res);
      if (!actor) return;

      if (!isAdminActor(actor)) {
        return res.status(403).json({ message: "Only admin users can publish realtime events." });
      }
    }

    const { errors, payload } = validateRealtimePublishPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join("; ") });
    }

    const actorSnapshot = payload.actor?.uid
      ? payload.actor
      : {
          uid: actor.uid || "",
          email: actor.email || "",
          roles: actor.roles || []
        };

    const published = publishRealtimeEvent({
      eventType: payload.eventType,
      topic: payload.topic,
      sourceService: payload.sourceService || env.serviceName,
      actor: actorSnapshot,
      audience: payload.audience || {},
      payload: payload.payload || {}
    });

    return res.status(202).json({
      message: "Realtime event accepted.",
      eventId: published.event.eventId,
      deliveredCount: published.deliveredCount
    });
  } catch (error) {
    return next(error);
  }
};
