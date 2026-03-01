# Upstash Integration Notes

## Gateway rate limit

Gateway middleware can enforce request-per-minute limits via Upstash Redis REST.

Required env vars on gateway:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_REQUESTS_PER_MINUTE`

If these are absent, gateway rate limit middleware acts as a no-op.

## Notifications async queue

Notifications service includes optional QStash publishing hooks.

Optional env vars on notifications service:

- `QSTASH_BASE_URL`
- `QSTASH_TOKEN`
- `QSTASH_FORWARD_URL`

Without these, notifications are stored and marked queued for later processing.
