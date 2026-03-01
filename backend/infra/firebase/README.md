# Firebase Integration (auth-service)

Auth service supports Firebase ID token verification using `firebase-admin`.

## Setup options

1. Set `GOOGLE_APPLICATION_CREDENTIALS` (recommended for local/self-managed).
2. Or set `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line JSON string in env var).

## Local recommended setup

1. Place your Firebase key file at:
   - `backend/secrets/firebase-service-account.json`
2. Ensure this exists in auth-service env:
   - `GOOGLE_APPLICATION_CREDENTIALS=../../secrets/firebase-service-account.json`
3. Start backend and test:
   - `POST /api/v1/auth/verify-token`

## Required permissions

- Firebase Admin SDK service account with auth token verification access.

## Runtime flow

1. Frontend signs in with Firebase Auth.
2. Frontend sends ID token to `POST /api/v1/auth/verify-token`.
3. `auth-service` verifies token and returns normalized identity payload.
