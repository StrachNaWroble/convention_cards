# Security

Security middleware lives here.

The first protection layer is in-memory rate limiting for public endpoints that can be abused:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/password-reset`
- `POST /wbf-verification/verify`

The limiter keys requests by endpoint group and client IP. This is suitable for small single-instance deployments. If the backend runs across multiple instances later, replace the store with shared storage such as Redis or a hosted rate-limit service.

Rate-limit responses use `429` with `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.
