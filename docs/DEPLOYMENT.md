# Travel Intelligence Platform — Deployment Guide & CI/CD Pipelines

This document guides developers on running the Travel Intelligence Platform in containers, configuring production orchestrators, and setting up CI/CD pipelines.

---

## 1. Running Locally with Docker

The repository includes a multi-container Docker structure to easily spin up the client, server, and database components.

### 1.1 Docker Compose Configuration
The `docker-compose.yml` file defines three services:
1. **Database (`mongo`)**: Uses official Mongo image, storing data in volume maps.
2. **Backend API (`server`)**: Builds from root, exposes port `5000`, maps environment configurations (`MONGO_URI`, `JWT_SECRET`, `AI_PROVIDER`).
3. **Frontend SPA (`frontend`)**: Builds from `frontend/` directory, exposing port `80` (production Nginx build) or matching node dev setups.

### 1.2 Commands to Spin Up
To build and start the entire stack:
```bash
docker-compose up --build
```
To run the database in the background:
```bash
docker-compose up -d mongo
```

---

## 2. CI/CD Jenkins Pipeline

The project includes a declarative `Jenkinsfile` that orchestrates validations and tests on every commit:

### 2.1 Pipeline Stages
1. **Workspace Audit**: Validates active branches, verifies presence of crucial configurations (`.env`), and matches Node.js environment specifications.
2. **Install Dependencies**: Restores packages at root and `frontend/` using clean installation commands (`npm ci`).
3. **Validate & Lint**: Runs static scanners and checks for TypeScript compilation.
4. **Backend Tests**: Executes the API routes and cache tests (`npm run test:backend`).
5. **Frontend Tests**: Runs Angular client Vitest specs (`npm run test:frontend`).
6. **Docker Build Validation**: Builds the Docker images (`mean-mini-server` and `mean-mini-client`) to ensure deployment bundles generate successfully.

---

## 3. Render Cloud Deployment Spec (`render.yaml`)

The platform contains a `render.yaml` specification for zero-config deployments to the Render cloud platform:

* **Backend Service**:
  * Type: Web Service
  * Command: `npm start`
  * Plan: Starter
* **Frontend Static Site**:
  * Type: Static Site
  * Build Command: `npm run build:all`
  * Publish Directory: `frontend/dist/frontend`
  * Route Rules: Rewrites all fallback URLs (`/*`) to `/index.html` to support client-side Angular routing.
