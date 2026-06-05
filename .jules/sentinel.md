## 2024-05-24 - Missing Security Headers in Next.js
**Vulnerability:** Missing foundational HTTP security headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Permissions-Policy).
**Learning:** Next.js does not include strict security headers by default. This app is completely client-side and deals with sensitive user financial data (even if not transmitted), making defense-in-depth mechanisms like preventing clickjacking (X-Frame-Options), MIME-sniffing (X-Content-Type-Options), and unnecessary API access (Permissions-Policy) critical to protect users from browser-based attacks.
**Prevention:** Always configure `async headers()` in `next.config.mjs` early in project development to enforce strict security policies across all routes (`/(.*)`).
## 2024-06-05 - Prototype Pollution in Data Aggregation
**Vulnerability:** Prototype pollution was possible when aggregating expenses by category using a raw object (`{}`). If a user uploaded a CSV with a category named `__proto__`, it would pollute the global object prototype, causing unexpected behavior in loops and object iteration.
**Learning:** This existed because `Object.entries()` and `for...in` loops will iterate over `__proto__` properties if they are explicitly set on an object literal, and accessing `obj[key]` where `key` is `__proto__` on an object literal actually modifies the object prototype.
**Prevention:** Always use `Object.create(null)` when creating dictionaries/maps for arbitrary user-provided string keys, or use ES6 `Map` objects.
