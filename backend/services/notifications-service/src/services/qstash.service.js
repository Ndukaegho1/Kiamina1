import { env } from "../config/env.js";

export const publishToQstash = async (payload) => {
  if (!env.qstashBaseUrl || !env.qstashToken || !env.qstashForwardUrl) {
    return {
      published: false,
      reason: "QStash not configured"
    };
  }

  const publishUrl = `${env.qstashBaseUrl.replace(/\/$/, "")}/v2/publish/${encodeURIComponent(
    env.qstashForwardUrl
  )}`;

  const response = await fetch(publishUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.qstashToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`QStash publish failed with status ${response.status}`);
  }

  const body = await response.json();
  return {
    published: true,
    messageId: body.messageId || ""
  };
};
