# Travel Intelligence Platform — Security Roadmap

This document outlines security practices, vulnerability mitigations, and the roadmap for securing the SaaS platform.

---

## 1. Current Security Controls

* **Password Hashing**: Cryptographic salting and hashing utilizing `bcrypt`.
* **Access Tokens**: JSON Web Tokens (JWT) signed with `JWT_SECRET`, expiring in 7 days.
* **Role-Based Guards**: Middleware checking role permissions (user, trip-manager, admin, superadmin) before handling restricted requests.
* **Input Validation**: Length limits and regex validations for user/admin routes.
* **Rate Limiting**: Custom per-IP rate limiter protecting heavy endpoints like AI planning.
* **Object ID Safety**: Middleware validating MongoDB `ObjectId` patterns to reject malformed parameters early.

---

## 2. Near-Term Security Roadmap

### 2.1 JWT Refresh Tokens
* Migrate from a single, long-lived access token stored in localStorage to a short-lived access token + secure, HTTP-only, SameSite=Strict cookie refresh token.
* Expose a `/refresh` endpoint to exchange refresh tokens for new access tokens.

### 2.2 LLM Prompt Injection & Firewalls
* Implement pre-processing input checks (heuristic word lists and character limits) to detect and reject system prompt override instructions.
* Add an LLM firewall proxy (like LLM Guard or NeMo Guardrails) to scan outgoing LLM responses and sanitize private data.

### 2.3 URL & CORS Hardening
* Enforce strict Content Security Policy (CSP) headers restricting scripts and stylesheets to trusted sources.
* Enforce HTTPS-only routing via HTTP Strict Transport Security (HSTS).

### 2.4 Rate Limiting & API Security
* Replace process-local memory rate limiters with a Redis-backed distributed token bucket limiter.
* Integrate Cloudflare WAF rules to drop malicious request payloads before reaching the Node.js runtime.

### 2.5 Security Headers (OWASP Audit)
* Integrate `helmet` middleware to configure secure HTTP headers (`X-Frame-Options`, `X-Content-Type-Options`).
* Perform routine OWASP dependency checking (`npm audit`) to clean outdated third-party modules.
