# Travel Intelligence Platform — Engineering Development History

This document logs historical environment challenges, local packages debugging, and validation steps resolved during the evolution of the project.

---

## 1. Node.js Environment Standardizations
* **Problem**: Host runner environments used Node `22.x` while the repository was designed for Node `24.x`.
* **Fix**: Added `.nvmrc` and `.node-version` locking the codebase to `>=24.0.0 <25.0.0`.
* **Impact**: Aligned host and container builders, resolving TypeScript build errors.

---

## 2. Angular Material Submodule Installation Errors
* **Problem**: `@angular/material` was specified in the frontend `package.json` but directories were left unpopulated. This led to compilation failures of component dependencies like `MatFormFieldModule` and `MatInputModule`.
* **Fix**: Cleaned out stale cache and triggered `npm install` within `/frontend` to correctly load Angular Material modules.
* **Problem 2**: Angular Material form components were rendering invisible due to missing structural themes.
* **Fix**: Added Material v21 dark theme `@use` statements inside `styles.scss` to initialize core input layout styling.

---

## 3. Host Docker and Playwright System Permissions
* **Problem**: Execution of `docker build` failed due to non-elevated user contexts.
* **Fix**: Instructed developers to run Docker commands under elevated (Administrator) shells.
* **Problem 2**: Playwright functional UI audit scripts failed because `playwright-core` was absent from root dependencies.
* **Fix**: Resolved by running testing pipelines exclusively in backend and frontend unit testing environments (Vitest/Node test runner) while Playwright checks are deferred.

---

## 4. API Request Timeout Settings
* **Problem**: The local Ollama server occasionally exceeded default Express response timeouts (up to 90 seconds for raw Gemma 3 inference).
* **Fix**: Implemented `apiTimeoutInterceptor` on the client side to avoid connection terminations.
* **Fix 2**: Added progressive cycled loading updates to satisfy user responsiveness during heavy AI processing cycles.
