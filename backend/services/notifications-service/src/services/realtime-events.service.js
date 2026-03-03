import crypto from "node:crypto";

const subscribers = new Map();
const HEARTBEAT_INTERVAL_MS = 25000;

const toString = (value) => String(value || "").trim();
const toLower = (value) => toString(value).toLowerCase();
const toStringArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => toString(item))
    .filter(Boolean);

const toLowerArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => toLower(item))
    .filter(Boolean);

const buildEventId = () =>
  `rt_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;

const nowIso = () => new Date().toISOString();

const parseFilterSet = (values = []) => {
  const normalized = toLowerArray(values);
  return new Set(normalized);
};

const parseCsvList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const writeEvent = (res, { eventName = "message", eventId, data = {} }) => {
  const payload = data && typeof data === "object" ? data : {};
  if (eventId) {
    res.write(`id: ${eventId}\n`);
  }
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const cleanupSubscriber = (subscriberId) => {
  const subscriber = subscribers.get(subscriberId);
  if (!subscriber) return;

  clearInterval(subscriber.heartbeatInterval);
  subscribers.delete(subscriberId);
};

const eventTargetsSubscriber = (event, subscriber) => {
  const eventTypes = subscriber.eventTypes;
  if (eventTypes.size > 0 && !eventTypes.has(event.eventType)) {
    return false;
  }

  const topics = subscriber.topics;
  if (topics.size > 0 && !topics.has(event.topic)) {
    return false;
  }

  if (subscriber.scope === "all" && subscriber.isAdmin) {
    return true;
  }

  const audienceUserIds = toStringArray(event.audience?.userIds);
  const audienceRoles = toLowerArray(event.audience?.roles);
  if (audienceUserIds.length === 0 && audienceRoles.length === 0) {
    return true;
  }

  if (audienceUserIds.includes(subscriber.actorUid)) {
    return true;
  }

  return subscriber.actorRoles.some((role) => audienceRoles.includes(role));
};

export const subscribeRealtimeEvents = ({
  req,
  res,
  actor,
  scope = "me",
  eventTypes = [],
  topics = []
}) => {
  const subscriberId = buildEventId();
  const safeScope = scope === "all" ? "all" : "me";
  const actorRoles = toStringArray(actor.roles);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const subscriber = {
    id: subscriberId,
    req,
    res,
    scope: safeScope,
    isAdmin: Boolean(actor.isAdmin),
    actorUid: toString(actor.uid),
    actorRoles,
    eventTypes: parseFilterSet(eventTypes),
    topics: parseFilterSet(topics),
    heartbeatInterval: null
  };

  subscriber.heartbeatInterval = setInterval(() => {
    try {
      writeEvent(res, {
        eventName: "heartbeat",
        data: { ts: nowIso() }
      });
    } catch {
      cleanupSubscriber(subscriberId);
    }
  }, HEARTBEAT_INTERVAL_MS);

  subscribers.set(subscriberId, subscriber);

  writeEvent(res, {
    eventName: "ready",
    eventId: buildEventId(),
    data: {
      subscriberId,
      scope: safeScope,
      connectedAt: nowIso()
    }
  });

  req.on("close", () => {
    cleanupSubscriber(subscriberId);
  });

  return { subscriberId };
};

export const publishRealtimeEvent = ({
  eventType,
  topic = "notifications",
  sourceService = "notifications-service",
  actor = {},
  audience = {},
  payload = {}
} = {}) => {
  const normalizedEventType = toLower(eventType);
  if (!normalizedEventType) {
    throw new Error("eventType is required");
  }

  const event = {
    eventId: buildEventId(),
    eventType: normalizedEventType,
    topic: toLower(topic) || "notifications",
      sourceService: toLower(sourceService) || "notifications-service",
      actor: {
        uid: toString(actor.uid),
        email: toLower(actor.email),
        roles: toLowerArray(actor.roles)
      },
      audience: {
        userIds: toStringArray(audience.userIds),
        roles: toLowerArray(audience.roles)
      },
    payload:
      payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {},
    createdAt: nowIso()
  };

  let deliveredCount = 0;
  for (const subscriber of subscribers.values()) {
    if (!eventTargetsSubscriber(event, subscriber)) {
      continue;
    }

    try {
      writeEvent(subscriber.res, {
        eventName: "event",
        eventId: event.eventId,
        data: event
      });
      deliveredCount += 1;
    } catch {
      cleanupSubscriber(subscriber.id);
    }
  }

  return {
    event,
    deliveredCount
  };
};

export const parseRealtimeFilterQuery = (query = {}) => {
  const source = query && typeof query === "object" ? query : {};
  return {
    scope: toLower(source.scope) === "all" ? "all" : "me",
    eventTypes: parseCsvList(source.types),
    topics: parseCsvList(source.topics)
  };
};
