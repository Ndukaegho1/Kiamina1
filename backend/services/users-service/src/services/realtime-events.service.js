import { env } from "../config/env.js";

const DEFAULT_EVENT_TOPIC = "users";

const toIdArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const toRoleArray = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);

export const publishUsersRealtimeEvent = async ({
  eventType = "",
  topic = DEFAULT_EVENT_TOPIC,
  actorUid = "",
  actorEmail = "",
  actorRoles = [],
  audienceUserIds = [],
  audienceRoles = [],
  payload = {}
} = {}) => {
  if (!env.notificationsServiceUrl || !eventType) {
    return { published: false };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, env.notificationsServiceTimeoutMs);

  try {
    const response = await fetch(
      `${env.notificationsServiceUrl}/api/v1/notifications/events/publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.notificationsServiceEventToken
            ? { "x-service-token": env.notificationsServiceEventToken }
            : {})
        },
        body: JSON.stringify({
          eventType: String(eventType || "").trim().toLowerCase(),
          topic: String(topic || DEFAULT_EVENT_TOPIC).trim().toLowerCase(),
          actor: {
            uid: String(actorUid || "").trim(),
            email: String(actorEmail || "").trim().toLowerCase(),
            roles: toRoleArray(actorRoles)
          },
          audience: {
            userIds: toIdArray(audienceUserIds),
            roles: toRoleArray(audienceRoles)
          },
          payload:
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? payload
              : {}
        }),
        signal: abortController.signal
      }
    );

    return { published: response.ok };
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("users-service realtime event publish warning:", error.message);
    }
    return { published: false };
  } finally {
    clearTimeout(timeoutId);
  }
};
