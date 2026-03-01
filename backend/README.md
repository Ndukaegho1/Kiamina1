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
8. Enforce RBAC at service level (owner vs admin operations).
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
  - `POST /api/v1/auth/send-otp`
  - `POST /api/v1/auth/verify-otp`
  - `POST /api/v1/auth/verify-token`
- Protected:
  - All `/api/v1/users/*`
  - All `/api/v1/documents/*`
  - All `/api/v1/notifications/*`

For protected routes send:

```http
Authorization: Bearer <firebase_id_token>
```

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

- `POST /auth/send-otp`
- `POST /auth/verify-otp`
- `POST /auth/verify-token`
- `GET /users/me`
- `POST /documents`
- `POST /documents/upload` (multipart field: `file`)
- `GET /documents/owner/:ownerUserId`
- `GET /documents/:id/download-url`
- `POST /notifications/send-email`

## New environment variables

Documents service:

- `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON`
- `FIREBASE_STORAGE_BUCKET`
- `DOCUMENT_UPLOAD_MAX_MB` (default `15`)
- `SIGNED_URL_EXPIRES_MINUTES` (default `30`)
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
