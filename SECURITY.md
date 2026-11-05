# Security notes — TaskFlow project board

## Implemented controls

| Control | Status |
|---|---|
| Hardened response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP) | on every response |
| Request body size limits | enabled |
| Input length caps + normalisation on auth routes | enabled |
| In-memory rate limiting on login / register | enabled |
| Session cookies: `httpOnly`, `sameSite=lax`, `secure` in production | enabled |
| Session secret: never hardcoded — generated per boot if unset | enabled |
| Health endpoint (`/api/health`) for monitors and containers | enabled |
| Parameterised SQL queries | all database access |

## Configuration

| Variable | Purpose | Required |
|---|---|---|
| `SESSION_SECRET` | Signs session cookies. Set this in production so sessions survive restarts. | recommended |
| `PORT` | HTTP port. | no |
| `DB_PATH` | Database file location (lets tests run on throwaway databases). | no |

## Verify

```bash
npm run test     # 16/16
```

## Reporting

Found something? Open an issue rather than a public exploit write-up.
