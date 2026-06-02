## 2024-05-24 - Missing Security Headers in Next.js
**Vulnerability:** Missing foundational HTTP security headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Permissions-Policy).
**Learning:** Next.js does not include strict security headers by default. This app is completely client-side and deals with sensitive user financial data (even if not transmitted), making defense-in-depth mechanisms like preventing clickjacking (X-Frame-Options), MIME-sniffing (X-Content-Type-Options), and unnecessary API access (Permissions-Policy) critical to protect users from browser-based attacks.
**Prevention:** Always configure `async headers()` in `next.config.mjs` early in project development to enforce strict security policies across all routes (`/(.*)`).
