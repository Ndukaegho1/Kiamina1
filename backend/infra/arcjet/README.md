# Arcjet Integration Plan

Apply Arcjet in `api-gateway` first, then sensitive auth endpoints.

Suggested phases:

1. Protect public endpoints (`/api/v1/auth/send-otp`, `/api/v1/auth/verify-otp`).
2. Add bot and abuse checks for support/contact/public search endpoints.
3. Keep business limits (per plan/user) in Upstash middleware.

Current scaffold includes a custom gateway rate limiter so you can go live quickly,
then layer Arcjet SDK policies on top.
