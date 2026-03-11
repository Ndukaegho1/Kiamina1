# Kiamina Backend (Microservice-Ready)

This folder contains a microservice-ready backend structure using:

- Node.js + Express
- MongoDB + Mongoose
- API Gateway pattern
- Firebase token verification (auth-service)
- Upstash-ready rate limiting hooks (gateway)
- Render deployment blueprint
- Postman starter collection

## Services

- `api-gateway` (`:4100`)
- `auth-service` (`:4101`)
- `users-service` (`:4102`)
- `documents-service` (`:4103`)
- `notifications-service` (`:4104`)

## Step-by-step workflow

1. Start as this modular microservice structure with isolated domain services.
2. Keep all frontend calls pointing only to `api-gateway`.
3. Use Firebase Auth on frontend, then send Firebase ID token to backend.
4. Gateway forwards requests to domain services.
5. Each service owns its own Mongo database (`kiamina_auth`, `kiamina_users`, etc.).
6. Add Upstash rate limiting and queue integrations where needed.
7. Add Arcjet checks on internet-facing routes in the gateway and auth flows.
8. Service-level RBAC is enforced (owner vs admin operations); continue layering finer permission scopes by admin level.
9. Deploy each service independently on Render.

## Local run

### 1) Install dependencies

```bash
cd backend
npm install
```

### 2) Run services locally

```bash
npm run dev
```

### 3) Optional Docker Compose

```bash
docker compose up --build
```

## Environment files

Every service has:

- `.env.example`
- `.env.development`
- `.env.production`

Copy and edit as needed before deployment.

Firebase local setup (recommended):

1. Save service account key file to `backend/secrets/firebase-service-account.json`.
2. In `services/auth-service/.env.development`, keep:
   - `GOOGLE_APPLICATION_CREDENTIALS=../../secrets/firebase-service-account.json`

## Gateway routing

Gateway exposes:

- `/api/v1/auth/*` -> auth-service
- `/api/v1/users/*` -> users-service
- `/api/v1/documents/*` -> documents-service
- `/api/v1/notifications/*` -> notifications-service

Gateway auth policy:

- Public:
  - `GET /api/v1/gateway/info`
  - `POST /api/v1/auth/register-account`
  - `POST /api/v1/auth/login-session`
  - `POST /api/v1/auth/refresh-token`
  - `POST /api/v1/auth/send-otp`
  - `POST /api/v1/auth/send-password-reset-link`
  - `POST /api/v1/auth/verify-otp`
  - `POST /api/v1/auth/verify-token`
  - `POST /api/v1/notifications/support/public/tickets`
  - `GET /api/v1/notifications/support/public/tickets`
  - `GET /api/v1/notifications/support/public/tickets/:ticketId/messages`
  - `POST /api/v1/notifications/support/public/tickets/:ticketId/messages`
- Protected:
  - Any other `/api/v1/auth/*` route not listed above
  - All `/api/v1/users/*`
  - All `/api/v1/documents/*`
  - All `/api/v1/notifications/*`

For protected routes, bearer-token flow must send both:

```http
Authorization: Bearer <firebase_id_token>
```

and:

```http
x-session-id: <session_id>
```

Cookie-based auth is also supported if your frontend sends `credentials: "include"` and reuses cookies set by `POST /auth/login-session`:

- `kiamina_access_token` (httpOnly)
- `kiamina_refresh_token` (httpOnly)
- `kiamina_session_id` (httpOnly)

Gateway forwards verified identity to downstream services with:

- `x-user-id`
- `x-user-email`
- `x-user-email-verified`
- `x-user-roles`

Health checks:

- `GET /health` on each service
- `GET /api/v1/gateway/info` on gateway

## Frontend integration

Use one base URL from frontend:

```txt
VITE_API_BASE_URL=http://localhost:4100/api/v1
```

Then call:

- `POST /auth/register-account`
- `POST /auth/login-session`
- `POST /auth/logout-session`
- `DELETE /auth/account`
- `DELETE /auth/account/:uid` (owner/superadmin only)
- `POST /auth/refresh-token`
- `POST /auth/send-otp`
- `POST /auth/send-password-reset-link`
- `POST /auth/verify-otp`
- `POST /auth/send-sms-otp`
- `POST /auth/verify-sms-otp`
- `POST /auth/verify-token`
- `GET /users/me`
- `DELETE /users/me` (cascades user profile + owned documents/records + auth account)
- `PATCH /users/me/profile`
- `GET /users/me/client-dashboard`
- `GET /users/me/client-dashboard/overview`
- `PATCH /users/me/client-dashboard`
- `GET /users/me/client-workspace`
- `PATCH /users/me/client-workspace`
- `GET /users/admin/client-management` (admin only)
- `GET /users/admin/client-management/clients/:uid` (admin only)
- `PATCH /users/admin/client-management/clients/:uid` (admin only)
- `POST /documents`
- `POST /documents/upload` (multipart field: `file`)
- `GET /documents/owner/:ownerUserId`
- `GET /documents/owner/:ownerUserId/summary`
- `DELETE /documents/owner/:ownerUserId` (self or privileged admin)
- `GET /documents/:id/download-url`
- `GET /documents/:id/download`
- `POST /documents/records`
- `POST /documents/records/import` (multipart field: `file`)
- `GET /documents/records`
- `GET /documents/records/summary`
- `GET /documents/records/reports/profit-loss`
- `GET /documents/records/reports/cashflow`
- `POST /notifications/send-email`
- `GET /notifications/logs`
- `POST /notifications/support/tickets`
- `GET /notifications/support/tickets`
- `GET /notifications/support/tickets/:ticketId`
- `PATCH /notifications/support/tickets/:ticketId`
- `GET /notifications/support/tickets/:ticketId/messages`
- `POST /notifications/support/tickets/:ticketId/messages`
- `POST /notifications/support/public/tickets` (anonymous session-based)
- `GET /notifications/support/public/tickets?sessionId=...` (anonymous session-based)
- `GET /notifications/support/public/tickets/:ticketId/messages?sessionId=...` (anonymous session-based)
- `POST /notifications/support/public/tickets/:ticketId/messages` (anonymous session-based)
- `POST /notifications/chatbot/sessions`
- `GET /notifications/chatbot/sessions`
- `GET /notifications/chatbot/sessions/:sessionId`
- `GET /notifications/chatbot/sessions/:sessionId/messages`
- `POST /notifications/chatbot/sessions/:sessionId/messages`
- `POST /notifications/chatbot/sessions/:sessionId/escalate`
- `GET /notifications/knowledge-base/articles`
- `GET /notifications/knowledge-base/articles/:articleId`
- `GET /notifications/knowledge-base/articles/search`
- `POST /notifications/knowledge-base/articles` (admin only)
- `PATCH /notifications/knowledge-base/articles/:articleId` (admin only)
- `DELETE /notifications/knowledge-base/articles/:articleId` (admin only)
- `GET /notifications/events/stream` (SSE stream)
- `POST /notifications/events/publish` (internal service token or admin only)

Postman contract notes:

- Import `backend/postman/kiamina-microservices.collection.json`
- Import `backend/postman/local.environment.json`
- Set `idToken` and `sessionId` environment variables for protected requests

## New environment variables

Documents service:

- `DOCUMENT_UPLOAD_MAX_MB` (default `15`)
- `DELETE_STORAGE_OBJECT_ON_RECORD_DELETE` (default `true`)

Notifications service:

- `SMTP_HOST`
- `SMTP_PORT` (default `587`)
- `SMTP_SECURE` (`true` for SMTPS 465)
- `SMTP_REQUIRE_TLS` (default `true`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `REALTIME_EVENTS_SERVICE_TOKEN` (shared token for trusted service event publishing)

Users service:

- `AUTH_SERVICE_URL`
- `AUTH_SERVICE_TIMEOUT_MS`
- `NOTIFICATIONS_SERVICE_URL`
- `NOTIFICATIONS_SERVICE_TIMEOUT_MS`
- `NOTIFICATIONS_SERVICE_EVENT_TOKEN` (must match notifications `REALTIME_EVENTS_SERVICE_TOKEN`)

Auth service:

- `SMS_OTP_EXPIRY_MINUTES`
- `SMS_OTP_MAX_ATTEMPTS`
- `AUTH_TOKEN_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `AUTH_COOKIE_DOMAIN`
- `NOTIFICATIONS_SERVICE_URL`
- `NOTIFICATIONS_SERVICE_TIMEOUT_MS`

API gateway:

- `RESPONSE_CACHE_TTL_SECONDS`
- `RESPONSE_CACHE_MAX_BODY_BYTES`
