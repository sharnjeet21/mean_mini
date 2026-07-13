# Travel Intelligence Platform — Contributing Guidelines

This document details branch management, style standards, and developer commands to help contributors collaborate effectively on the Travel Intelligence codebase.

---

## 1. Branch Strategy

We follow a strict development branch workflow:
* `main`: Reserved for fully stable, tested, and validated production-ready releases.
* `yuvraj-dev`: Main active integration branch.
* Custom features: Created off `yuvraj-dev` and merged back via pull requests.

---

## 2. Environment Setup

* **Node.js**: Pinned to version `>=24.0.0 <25.0.0` (as defined in `.nvmrc` and `.node-version`).
* **Environment Variables**: Copy `.env.example` to `.env` and fill in necessary keys.
* **Installation**: Restores dependencies cleanly:
  ```bash
  # Root dependencies
  npm ci
  
  # Frontend dependencies
  cd frontend
  npm ci
  ```

---

## 3. Developer Commands

### 3.1 Running Local Servers
To run the full stack (Express backend and Angular frontend) concurrently:
```bash
npm run dev:full
```
To run the backend only:
```bash
npm start
```
To run the frontend only:
```bash
npm run frontend
```

### 3.2 Running the Test Suites
Before submitting changes, ensure all test suites pass successfully.
```bash
# Run backend tests
npm run test:backend

# Run frontend Vitest specs
npm run test:frontend

# Run all test suites
npm run test:all
```

### 3.3 Verifying Builds
Ensure the Angular bundle compiles cleanly without diagnostics:
```bash
npm run build:all
```
