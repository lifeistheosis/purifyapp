# Security Policy

## Reporting a Vulnerability

Email the Purify team at the address in `package.json`'s `author` field
(or via the contact link in the footer). Please include:

- A short description of the issue and its impact.
- Reproduction steps or a proof of concept.
- The version / commit you tested against.

We aim to acknowledge reports within 72 hours and to ship a fix within
14 days for high-severity issues. Please do not file public GitHub
issues for security problems.

## Supported Versions

We patch only the latest deployed `main`. Older tags are unsupported.

## Threat Model

- **Trusted:** Supabase (auth, Postgres, JWT signing), Render
  (TLS termination, IP forwarding), the operator's own machine.
- **Untrusted:** every browser, every API caller, every header value,
  every cookie that isn't HttpOnly+Secure+SameSite=Lax.
- **Secrets that must never leave the server:** `SUPABASE_SERVICE_ROLE_KEY`.
  Imported only from `lib/supabase/admin.ts`, which carries
  `import "server-only"` so a stray client import fails the build.

## Hardening Posture

| Area | Posture |
|---|---|
| **Auth** | Supabase Auth handles all credential storage and JWT crypto. Session cookies are HttpOnly + Secure + SameSite=Lax (set by `@supabase/ssr`). |
| **Passwords** | Never touched by application code. Hashing is delegated to Supabase. `profiles.has_password` mirrors state for the set-password gate; never carries a hash. |
| **RLS** | Every user-data table (`profiles`, `bookmarks`, `annotations`, `saint_bumps`) has RLS enabled with `auth.uid() = user_id` policies. Analytics tables (`analytics_sessions`, `analytics_pageviews`, `rate_limits`, `csp_reports`) have RLS enabled with no policies — service-role writes only. |
| **Rate limiting** | Postgres-backed (`rate_limit_hit` RPC). Applied to `/api/track` (120/min/IP + 600/day/IP for new sessions), `/api/saints/[slug]/bump` (30/min/user), `/api/auth/callback` (20/min/IP), `/api/auth/delete` (5/min/user), `/api/csp-report` (1000/min/IP). |
| **Input validation** | Zod schemas in `lib/security/schemas.ts`. Routes reject malformed JSON and unknown shapes with 400 before any DB work. |
| **Headers** | HSTS (preload), `X-Content-Type-Options nosniff`, `X-Frame-Options DENY`, `Referrer-Policy strict-origin-when-cross-origin`, restrictive `Permissions-Policy`, COOP/CORP `same-origin`. See `next.config.ts`. |
| **CSP** | Per-request nonce, `strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`, `report-uri /api/csp-report`. Built in `lib/security/headers.ts`; attached in `middleware.ts`. Ships as **Report-Only** initially; flip to enforcing once `/api/csp-report` has been quiet for ≥ 7 days. |
| **Open redirects** | All `next=` query handling goes through `isSafeNext()` (`lib/security/schemas.ts`), which rejects `//`, `/\`, control chars, and non-relative paths. |
| **Admin** | Email allowlist via `ADMIN_EMAILS` env var (`lib/admin/access.ts`). Checked server-side per request — never cached. Diagnostic admin routes (`*-debug`) require an additional `ADMIN_DEBUG_ENABLED=1` env flag and 404 otherwise. |
| **CSRF** | All mutating endpoints are POST + same-origin cookie auth + `SameSite=Lax`. CSP `form-action 'self'` and the `Sec-Fetch-Site` check on `/api/track` add belt-and-suspenders. |
| **PII in logs** | CSP report sink stores `sha256(ip || daily_salt)`, never a raw IP. Analytics retains coarse geo (country/region/city) only. |

## Known Residuals

After `npm audit fix` + `overrides` block in `package.json` pinning the
d3 chain to patched versions, `npm audit --omit=dev --audit-level=high`
returns **0 high/critical**. Two **moderate** advisories remain in
`next` → `postcss` (transitive); fixing them requires a major-version
downgrade of Next.js, which is a worse trade. Reviewed on every
dependency bump.

Dev-only vulnerabilities (`@lhci/cli` → `tmp`, etc.) do not ship to
the production runtime and are tracked but not patched.

## Verification Hooks

- `npm run typecheck` — must pass.
- `npm test:unit` — must pass.
- `curl -I https://<host>/` — confirm full header set ships.
- securityheaders.com — A+.
- Mozilla Observatory — A+.
- `npm audit --omit=dev --audit-level=high` — zero high/critical.
