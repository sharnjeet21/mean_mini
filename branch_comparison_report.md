# Git Branch & Production Comparison Report

This report presents a direct comparison between the active development branch (`yuvraj-dev`), the target production branch (`main`), and the live production service deployed at [mean-mini.onrender.com](https://mean-mini.onrender.com/).

---

## 1. Environment & Live Server Health

The live production application hosted at `https://mean-mini.onrender.com/` was audited and is verified as healthy:

* **Endpoint Audited:** `/api/health`
* **Status Response:** `ready`
* **Service Identifier:** `travel-intelligence-api`
* **Database Connection:** `connected` (MongoDB Atlas cluster verified)
* **Response Live Telemetry:**
  ```json
  {
    "status": "ready",
    "service": "travel-intelligence-api",
    "database": "connected",
    "uptimeSeconds": 47,
    "timestamp": "2026-08-27T10:12:59.939Z"
  }
  ```

---

## 2. Actual Code Comparison (`yuvraj-dev` vs `main`)

Analyzing the files, tracked check-ins, and configuration metadata between `yuvraj-dev` and the `main` branch highlights distinct architectural directions:

### Feature Differences

| Feature Area | Dev Branch (`yuvraj-dev`) | Production Branch (`main`) | Live Server Deployment Status |
| :--- | :--- | :--- | :--- |
| **Workspace Experience** | **Consolidated Agency Hub**: Unified dashboard shell at `/agency` routing dynamically to subcomponents (Overview, Trips, Proposals, Clients, Analytics, Operations, Platform). | **Split Modules**: Separate independent top-level dashboards (`/workspace`, `/operations`, `/platform`) without a unified sidebar navigation shell. | Running split dashboards (standard `main` configuration). |
| **AI Curation Model** | **Multi-Provider Proxy**: Failover resolver supporting NVIDIA NIM, Ollama local, and Gemini API fallback cascading. | **Single Gemini Model**: Simplified `aiProvider.js` invoking Google Gemini API endpoints exclusively. | Gemini API provider active. Ollama and NVIDIA resolver excluded. |
| **Maps Adapter** | **Leaflet Map Canvas**: Simple component utilizing Leaflet library coordinates wrapper. | **Mapbox Map Canvas**: Custom `mapboxAdapter.js` and custom style layers with full integration test coverage. | Mapbox API configured for production. |
| **Cost Control** | **Affiliate stub**: Standard click redirects tracking model. | **Billing & Cost Estimation**: Fully active `costEstimationService.js` and `billingService.js` tracking organization limits. | Quota management services active. |
| **Multi-Tenancy** | **No Active Organizations**: Database schemas do not yet filter by organizations. | **Multi-Tenant Structure**: Implements `Organization.js` and `AffiliateClick.js` to manage enterprise tenants. | Active organization schemas ready. |

---

## 3. Structural Diff Analysis

Git diff highlights the file system differences:

### Files only in `yuvraj-dev` (Dev Refactor)
* `server/services/providers/nvidiaProvider.js` & `ollamaProvider.js` (Offline LLM support).
* `server/services/aiProviderResolver.js` (Multi-provider fallback logic).
* `server/tests/aiProviderResolver.test.js` (Resolver unit tests).
* The new modular Angular components under `frontend/src/app/components/agency-workspace/` (Overview, Trips, Proposals, Clients, Analytics, Operations, Platform).

### Files only in `main` (Production Version)
* `plan.md` ( Consolidated roadmap plan).
* `server/adapters/mapboxAdapter.js` (Advanced Mapbox API adapter).
* `server/tests/mapboxAdapter.test.js` (Mapbox validation test suite).
* Legacy separated dashboard controllers: `admin-dashboard.component.ts` (Operations) and `dashboard.component.ts` (Workspace mode).

---

## 4. Recommendations for Integration

To prepare the development refactor (`yuvraj-dev`) for a clean merge into the production branch (`main`), implement the following:

1. **Retain Mapbox and Billing Services**: Keep the `costEstimationService.js`, `billingService.js`, and `mapboxAdapter.js` from `main` to support live billing and advanced mapping.
2. **Merge the `/agency` Shell**: Adopt the unified `/agency` sidebar workspace shell from `yuvraj-dev` to replace the split layouts in `main`, keeping the navigation clean.
3. **Consolidate AI Resolvers**: Use the Gemini AI provider as primary, but keep the multi-provider resolver as a fallback option for offline development.
