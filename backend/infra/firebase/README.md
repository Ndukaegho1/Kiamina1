# Firebase Integration (auth-service)

Auth service supports Firebase ID token verification using `firebase-admin`.

## Setup options

1. Set `FIREBASE_SERVICE_ACCOUNT_JSON` (preferred in Render env vars).
2. Or use `GOOGLE_APPLICATION_CREDENTIALS` on self-managed hosts.

## Required permissions

- Firebase Admin SDK service account with auth token verification access.

## Runtime flow

1. Frontend signs in with Firebase Auth.
2. Frontend sends ID token to `POST /api/v1/auth/verify-token`.
3. `auth-service` verifies token and returns normalized identity payload.
