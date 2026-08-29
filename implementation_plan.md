# TraVenture — Final Integration & Stabilization Plan

## Goal
Integrate the `yuvraj-dev` refactor cleanly with `main` capabilities, stabilize the architecture, remove all dummy data, and produce a PR-ready branch.

> [!IMPORTANT]
> This is **integration + verification**, not redesign. Architecture is frozen after M1.

---

## M1 — Working Tree Cleanup

### Delete obsolete admin dashboard
```
frontend/src/app/components/admin-dashboard/
```
Functionality already migrated to `agency-workspace/operations` and `agency-workspace/platform`. **Delete both files.**

### Inspect & commit package/config diffs
These are **legitimate** and should be committed:
- `frontend/angular.json` — Leaflet CSS + allowedCommonJs + budget bump (needed for map canvas)
- `frontend/package.json` — adds `leaflet` + `@types/leaflet`
- `package.json` — adds `@rollup/rollup-linux-x64-gnu` (needed for Linux build on Render); **remove the accidental `"24": "^0.0.0"` dependency**

### Stage main-derived untracked files
These are ready to commit (no changes needed, already correct from main):
- `server/services/billingService.js`
- `server/services/costEstimationService.js`
- `server/models/Organization.js`
- `server/models/AffiliateClick.js`
- `server/routes/affiliateRoutes.js`
- `frontend/src/app/components/client-dashboard/`
- `frontend/src/app/components/public-itinerary/`
- `frontend/src/app/components/map-canvas/`
- `frontend/src/app/services/currency.service.ts`

### Commit format
```
cleanup_working_tree : remove obsolete admin dashboard, commit legitimate config and main-derived files
```

---

## M2 — AI Architecture Reconciliation

The `itineraryDraftService.js` already uses `aiProviderResolver` — this is correct.

### Current AI stack (already wired, needs verification)
```
aiController.js
     ↓
itineraryDraftService.js  (business logic, caching, fingerprinting)
     ↓
aiProviderResolver.js     (provider selection + fallback + quarantine)
     ↓
┌──────────┬──────────┬──────────┐
gemini    nvidia     ollama
```

### Actions
- Verify `aiController.js` diff does not break existing routes
- Verify `server/routes/index.js` wires affiliate routes correctly
- Verify `server/routes/dashboardRoutes.js` + `authRoutes.js` diffs are correct
- Run: `npm run test:backend`

### Commit format
```
feat_ai_provider_reconciliation : align multi-provider resolver with itinerary draft service and verify all AI routes pass tests
```

---

## M3 — Main Capability Integration

### Mapbox (backend only — keep adapter on server)
- Ensure `server/adapters/mapboxAdapter.js` exists on this branch (currently only in `main`)
- Wire into `itineraryRoutes.js` for geocoding itinerary destinations
- Frontend `MapCanvas` component calls API → `mapboxAdapter`, never imports Mapbox SDK directly

### Billing + Cost estimation
- Integrate `billingService.js` and `costEstimationService.js` into `agency-workspace/analytics` and `agency-workspace/operations` displays
- Surface cost totals and quota warnings in Agency Analytics (real API data, no dummy values)

### Organization + Affiliate models
- Ensure `Organization.js` and `AffiliateClick.js` models are registered in server startup
- Ensure `affiliateRoutes.js` is mounted in `routes/index.js`
- Surface affiliate click stats in Agency Operations (real DB data only)

### Client portal + Public itinerary
- Add routes to `app.routes.ts`:
  - `/client-portal` → `ClientDashboardComponent` (auth guard, traveler role)
  - `/proposal/:id` → `PublicItineraryComponent` (public, no auth required)
- Wire public proposal share link in Agency Proposals → generates `/proposal/:id` URL

### Image service
- Ensure `server/services/imageService.js` is used consistently for all image resolution
- Remove any hardcoded Unsplash URLs or destination switch/case fallback arrays from components
- All image requests should hit `/api/image?q=destination`

### Commit format
```
feat_main_capabilities_integrated : mapbox adapter, billing, org and affiliate models, client portal, public itinerary, image service wired
```

---

## M4 — Agency Finalization (Real Data Only)

> [!CAUTION]
> Remove **all** dummy/hardcoded arrays, fake stats, placeholder metrics. Every card, stat, and table must come from an API call.

### Overview (`/agency/overview`)
Real API data only:
- My trip count (draft / published)
- Upcoming trips (date-filtered from my itineraries)
- Recent proposals (last 5, from API)
- Quick actions: Create Trip, New Proposal, View Analytics

### Trips (`/agency/trips`)
- List from `GET /api/itinerary?owner=me` (real owned itineraries)
- Status tabs: Draft / Published / Archived
- Search: client-side filter on already-loaded itineraries
- Create → AI Planner modal or Manual form
- Edit → loads real itinerary data
- Delete with confirmation dialog

### Proposals (`/agency/proposals`)
- Distinct from Trips: a proposal = published itinerary shared with a client
- List from real API: `GET /api/itinerary?status=published&owner=me`
- Share button → generates `/proposal/:id` link
- Track: client viewed, accepted, pending

### Clients (`/agency/clients`)
- Simple CRM from `GET /api/users?role=user` (admin/superadmin only)
- Show: name, email, bookings count, last active

### Analytics (`/agency/analytics`)
- All from server-side aggregation (`GET /api/dashboard/stats` or equivalent)
- No Angular-side calculations of aggregates
- Currency conversion applied client-side only for display

### Operations (`/agency/operations`)
Admin+ only:
- Global itinerary moderation: `GET /api/itinerary` (all, with activate/deactivate)
- Role requests: `GET /api/role-requests`
- Affiliate activity: `GET /api/affiliates/stats` (real click data)
- Organization management (if org model active)

### Platform (`/agency/platform`)
Superadmin only:
- User directory with role management
- AI provider live status (call resolver health check)
- Database connection status from `/api/health`
- Global analytics summary

### Commit format
```
feat_agency_real_data : remove all dummy data; wire all agency sub-views to live API endpoints
```

---

## M5 — Public / Traveler Experience

### Explore (`/dashboard`)
- Search: destination + natural language → `POST /api/travel-search`
- Filters: budget range, duration, category, travel style → query params to `GET /api/itinerary`
- Sort: relevance, newest, budget asc/desc → query param
- Cards: real itinerary data with real destination images

> [!IMPORTANT]
> Filtering and sorting must be server-driven (query params), not Angular-array-filtered.

### Itinerary Detail (`/itinerary/:id`)
- Full real data: description, stops, daily plan, budget breakdown
- Map: renders actual destination pin via MapCanvas → API → mapboxAdapter
- Consistent traveler count throughout (single source: `itinerary.travelers`)
- Save / Book / Review actions (real API calls)

### Public Proposal (`/proposal/:id`)
- Publicly accessible (no auth)
- Shows: destination, dates, budget, highlights, map, share CTA
- No editing controls visible

### Commit format
```
feat_public_explore_real_filters : server-side search/filter/sort, real images, consistent traveler count
```

---

## M6 — Itinerary Lifecycle

Enforce hard states in both UI and API:

```
DRAFT → EDIT → AI_REFINE → PUBLISH → ARCHIVE
```

### Backend
- `itinerary.status` enum: `draft`, `published`, `archived`
- Guard routes: only owner can publish own draft; admin can archive any
- Only `published` itineraries appear in public Explore

### Frontend
- Status badge on every trip card (Draft / Published / Archived)
- Action buttons change based on status
- Traveler: cannot reach create/edit UI (route guard)

### Commit format
```
feat_itinerary_lifecycle : enforce draft→publish→archive states, role-gated UI and API, remove traveler create access
```

---

## M7 — UX Polish

- Map must render real pins/routes (not empty container)
- Images: all use `/api/image?q=destination` — no hardcoded Unsplash strings in components
- Loading states on every async operation
- Empty states: "No trips yet", "No proposals", "No clients"
- Error states: toast notifications for all API failures
- Traveler count consistency fix: single `itinerary.travelers` source
- Remove any remaining `console.log` debug statements

### Commit format
```
fix_ux_polish : real map pins, consistent images, loading/empty/error states, traveler count fix
```

---

## M8 — Authorization Audit

Test every route combination in browser:

| Route | Guest | Traveler | Trip Manager | Admin | Superadmin |
|---|---|---|---|---|---|
| `/` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/dashboard` | redirect→login | ✓ | ✓ | ✓ | ✓ |
| `/itinerary/:id` | ✓ (published only) | ✓ | ✓ | ✓ | ✓ |
| `/proposal/:id` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/agency` | redirect→login | redirect→dashboard | ✓ | ✓ | ✓ |
| `/agency/clients` | redirect | redirect | hidden | ✓ | ✓ |
| `/agency/operations` | redirect | redirect | redirect | ✓ | ✓ |
| `/agency/platform` | redirect | redirect | redirect | redirect | ✓ |

Direct URL access (not just navbar) must also be tested.

### Commit format
```
fix_rbac_auth_audit : guard all routes by role, fix direct URL access bypass, align navbar visibility with actual access
```

---

## M9 — Full Regression

```bash
# Backend
npm run test:backend

# Build
npm run build:all

# Manual browser QA checklist:
# - Login as each role
# - Navigate every route
# - Verify map renders
# - Verify images load
# - Verify no dummy data
# - Verify production health: https://mean-mini.onrender.com/api/health
```

### Commit format
```
test_full_regression_pass : all backend tests pass, build succeeds, browser QA complete
```

---

## M10 — Git Integration → PR

```bash
git checkout -b integration/yuvraj-dev-to-main
git merge origin/main --no-ff
# Resolve conflicts intentionally
git push origin integration/yuvraj-dev-to-main
# Open PR: integration/yuvraj-dev-to-main → main
```

> [!CAUTION]
> Do NOT `git merge main` directly into `yuvraj-dev`. Use an integration branch to preserve clean history.

---

## Deferred (explicitly out of scope)
- RAG
- WebSockets / real-time collaboration
- Redis distributed caching
- Payment processing
- PWA/offline
- Certified carbon data
- Large-scale SaaS billing
- Social media ingestion

---

## Open Questions

> [!IMPORTANT]
> 1. **Mapbox token**: Is `MAPBOX_TOKEN` set in `.env`? The adapter falls back to Nominatim if not set, but confirm.
> 2. **`"24": "^0.0.0"` in `package.json`** — This appears to be an accidental addition. Should we remove it?
> 3. **Admin dashboard files**: Confirm deletion — all admin functionality is confirmed in `agency-workspace/operations` and `agency-workspace/platform`?
> 4. **`devflow/` directory** — What is this? Should it be committed, gitignored, or deleted?
