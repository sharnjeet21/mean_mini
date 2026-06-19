# Travel Intelligence Platform - Execution Plan

This document turns the product vision into an execution-ready roadmap for the current Travel Intelligence codebase.

Status legend:

- [x] Implemented
- [ ] Planned

## 1. Product Vision

Travel Intelligence is an AI-assisted travel planning platform that helps travelers and travel agencies discover destinations, evaluate trip quality, generate itineraries, estimate costs, and plan travel visually through an interactive map-based interface.

The product should feel like a planning workspace, not a long form. AI should help users explore options, while deterministic logic remains responsible for scores, feasibility, budgets, sustainability, and analytics.

## 2. Product Principles

- Keep the experience simple, visual, and mobile-friendly.
- Favor exploration and selection over manual form entry.
- Use AI to suggest, summarize, and recommend.
- Keep deterministic scoring authoritative and explainable.
- Reveal complexity progressively as the user moves deeper into planning.
- Build with production-readiness in mind: testing, deployability, observability, and clear ownership between frontend, backend, and integrations.

## 3. Product Thesis

The platform should guide users through this journey:

`Search -> Explore -> Select -> Build -> Evaluate -> Share`

That means the roadmap should shift the current product from itinerary CRUD into a visual planning system with map exploration, route awareness, cost intelligence, and eventually agency workflows.

## 4. Current Baseline

Already implemented in the repository:

- [x] Angular frontend
- [x] Express backend
- [x] MongoDB and Mongoose data layer
- [x] Authentication
- [x] Role-based access control
- [x] Itinerary CRUD
- [x] Reviews
- [x] Wishlists
- [x] Bookings
- [x] Trip Intelligence scoring
- [x] Docker support
- [x] Jenkins pipeline
- [x] AI integration groundwork
- [x] Demo seed data and analytics foundations

Still missing before the long-term vision is complete:

- [ ] Interactive map planning
- [ ] Attraction pin workflow
- [ ] Route intelligence
- [ ] Cost intelligence
- [ ] Export and sharing workflows
- [ ] Affiliate monetization layer
- [ ] Multi-client agency SaaS workflows

## 5. Recommended Execution Strategy

The best next step is not to jump directly into all future features. The roadmap should be executed in this order:

1. Stabilize the current platform and prepare shared planning primitives.
2. Ship map-driven destination discovery.
3. Convert selected attractions into a structured itinerary builder.
4. Add routing and time-awareness.
5. Add cost estimation and budget intelligence.
6. Add monetization integrations.
7. Expand into agency SaaS capabilities.

## 6. Phase 0 - Platform Foundation

Status: `In Progress`

Goal: make the current application stable enough to support roadmap growth without changing user-visible behavior.

Scope rules for this phase:

- No UI redesign
- No authentication changes
- No schema changes
- No API redesign
- No Trip Intelligence logic changes
- No new product features

Phase 0 checklist:

- [x] Validate branch strategy and move active work off `main`
- [x] Standardize Node version files on `24.17.0`
- [x] Review root and frontend dependency manifests
- [x] Review build, startup, Render, Docker, and Jenkins entry points
- [x] Expand `.env.example` with stable placeholders
- [x] Update README with setup, build, Docker, and workflow guidance
- [x] Run backend tests
- [x] Run backend startup validation
- [x] Attempt frontend clean install validation
- [x] Attempt frontend test validation
- [x] Attempt frontend build validation
- [x] Attempt Docker build validation
- [ ] Complete clean install and frontend validation under Node 24 on the host machine
- [ ] Re-run Docker build with confirmed local Docker access

Completed work:

- Files added:
  - `.nvmrc`
- Files modified:
  - `.env.example`
  - `README.md`
  - `frontend/Dockerfile`
  - `plan.md`
- Infrastructure improvements:
  - Added an explicit `.nvmrc` to match the existing `.node-version`
  - Aligned the frontend Docker builder image to Node 24
  - Documented clean-install workflow with `npm ci`
  - Documented branch workflow using `yuvraj-dev`
  - Added `MAPBOX_TOKEN` as a placeholder for upcoming map work without changing runtime code

Build results:

- Frontend build:
  - Blocked on this host environment
  - `npm run frontend:build` failed because the checked-in frontend install is incomplete and the missing `@angular/build` package cannot be repaired while the host is on Node `22.17.0`
- Backend startup:
  - Partially validated
  - Express started and `/api/health` responded successfully
  - Development fallback was degraded because the current root install is missing `mongodb-memory-server`
- Docker build:
  - Not fully validated
  - The non-elevated attempt failed because local Docker config and buildx paths were not accessible from the current environment
  - Elevated retry was not approved, so this still needs confirmation

Test results:

- Backend:
  - Total: 31
  - Passed: 31
  - Failed: 0
  - Skipped: 0
- Frontend:
  - Could not run successfully on this host
  - `ng test` failed because the frontend builder packages are not fully installed
- UI audit:
  - Could not run successfully on this host
  - `scripts/uiFunctionalAudit.js` failed because `playwright-core` is missing from the current root install

Lessons learned:

- The repository is already standardized around Node 24, but the current machine is still on Node `22.17.0`.
- The lockfiles appear to include the expected dependencies, but the current local `node_modules` state is incomplete/stale.
- Phase 0 should treat clean dependency installation as a required validation step, not an assumption.
- Docker validation depends on both daemon availability and local config access, so it should be verified explicitly on each developer machine.

Risks:

- Future feature work will be noisy and harder to debug until the host toolchain matches the repo's Node requirement.
- Frontend roadmap work should not begin until clean install and build validation succeed under Node 24.
- The in-memory development DB fallback is not reliable unless root dev dependencies are actually installed.

Recommendations:

- Install or switch the host runtime to Node `24.17.0` before re-running install/build/test checks.
- Run `npm ci` in the root and `frontend/` directories from a clean environment.
- Re-run `npm run test:frontend`, `npm run frontend:build`, `npm run build`, and `npm run test:ui` after the Node 24 switch.
- Re-run `docker build -t mean-mini-frontend ./frontend` after Docker access is confirmed.

Exit criteria:

- [ ] Host machine is using Node `24.17.0`
- [ ] Root clean install succeeds
- [ ] Frontend clean install succeeds
- [ ] Frontend unit tests run successfully
- [ ] Frontend build succeeds
- [ ] Root production-style build succeeds
- [ ] Backend startup is validated with expected dependency availability
- [ ] Docker build succeeds

## 7. Phase 1 - Visual Discovery

Goal: transform itinerary creation into map-driven planning.

Primary user outcome:

Users can search a destination, view an interactive map, explore recommended attractions, and add places to a draft itinerary directly from the map.

Scope checklist:

- [ ] Destination search with geocoding
- [ ] Interactive map canvas
- [ ] Destination-centered viewport behavior
- [ ] Attraction recommendation pins
- [ ] Attraction detail cards or drawers
- [ ] Image enrichment for places
- [ ] AI-generated attraction recommendations
- [ ] Save selected attractions into a draft itinerary

Backend checklist:

- [ ] Add destination search endpoint
- [ ] Add attraction recommendation endpoint with location metadata
- [ ] Add caching and rate limiting for map and attraction queries
- [ ] Add fallback data behavior when AI or map providers fail

Frontend checklist:

- [ ] Create a map-based planning workspace
- [ ] Add search bar with destination-to-map navigation
- [ ] Render recommended attraction pins
- [ ] Show attraction detail cards with add-to-plan action
- [ ] Support responsive map and bottom-sheet behavior for mobile

User flow:

1. User enters a destination.
2. Map centers on the destination.
3. AI recommends attractions.
4. Attraction pins appear on the map.
5. User selects attractions.
6. Selected places are added to a draft itinerary.

Exit criteria:

- [ ] A user can search a destination and see recommendation pins on a map.
- [ ] A user can add recommended attractions to a saved draft.
- [ ] The experience still works with fallbacks if AI responses or provider calls fail.

## 8. Phase 2 - Smart Itinerary Builder

Goal: generate structured itineraries from the attractions a user has selected.

Primary user outcome:

Users can turn selected places into a day-by-day itinerary with explainable feasibility and budget warnings.

AI responsibilities:

- [ ] Recommend attractions
- [ ] Suggest visit sequence
- [ ] Suggest stay duration
- [ ] Suggest high-level trip structure

Deterministic responsibilities:

- [ ] Validate schedule realism
- [ ] Calculate feasibility
- [ ] Calculate budget estimates
- [ ] Detect overloaded days
- [ ] Detect unplanned gaps

Scope checklist:

- [ ] Day allocation
- [ ] Attraction grouping
- [ ] Route-aware sequencing suggestions
- [ ] Stay recommendations
- [ ] Drag-and-drop or editable day plans
- [ ] Draft-to-itinerary conversion flow

Backend checklist:

- [ ] Add itinerary generation endpoint from selected attractions
- [ ] Reuse Trip Intelligence scoring against generated drafts
- [ ] Store attraction-level metadata in itinerary records

Frontend checklist:

- [ ] Build a visual itinerary editor
- [ ] Show AI-suggested draft and user-editable structure
- [ ] Show deterministic warnings and score breakdowns inline

Exit criteria:

- [ ] A user can generate a multi-day itinerary from selected attractions.
- [ ] The system explains why a generated plan is strong or weak.
- [ ] Users can edit the generated output without losing deterministic analysis.

## 9. Phase 3 - Route Intelligence

Goal: make itineraries aware of real-world travel time and route quality.

Primary user outcome:

Users can understand how far places are from one another, how long movement will take, and whether the daily route is realistic.

Possible providers:

- [ ] Mapbox
- [ ] Google Maps

Scope checklist:

- [ ] Distance calculations
- [ ] Travel duration calculations
- [ ] Map routing overlays
- [ ] Route optimization
- [ ] Route conflict detection

Backend checklist:

- [ ] Add routing provider adapter
- [ ] Cache route responses
- [ ] Add route summary fields to itinerary analysis

Frontend checklist:

- [ ] Display route lines on the map
- [ ] Show travel time between stops
- [ ] Surface route warnings in the itinerary builder

Exit criteria:

- [ ] Reordering itinerary stops updates route and time estimates.
- [ ] Daily plans reflect travel overhead, not just attraction count.
- [ ] Route data contributes to feasibility scoring.

## 10. Phase 4 - Cost Intelligence

Goal: help users understand the likely cost of a trip before booking.

Primary user outcome:

Users can view estimated cost ranges, daily budget expectations, and cost-per-traveler insights alongside itinerary quality.

Scope checklist:

- [ ] Hotel recommendations
- [ ] Transport recommendations
- [ ] Budget estimation
- [ ] Daily cost analysis
- [ ] Cost per traveler
- [ ] Cost per day
- [ ] Budget score integration

Deterministic outputs:

- [ ] Budget score
- [ ] Estimated trip cost
- [ ] Cost per traveler
- [ ] Cost per day

Backend checklist:

- [ ] Create cost estimation engine with explainable assumptions
- [ ] Add provider adapters for hotel and transport recommendation sources
- [ ] Extend itinerary analysis to include confidence ranges and assumptions

Frontend checklist:

- [ ] Show cost panels in itinerary detail and builder flows
- [ ] Break down transport, stay, food, and activity estimates visually
- [ ] Surface warnings for unrealistic budgets

Exit criteria:

- [ ] A user can see a complete trip cost estimate and breakdown.
- [ ] Budget analysis is explainable and not fully dependent on AI.
- [ ] Cost intelligence feeds the existing Trip Intelligence model cleanly.

## 11. Phase 5 - Affiliate Layer

Goal: monetize planning intent without weakening trust in the planning experience.

Potential integrations:

- [ ] Booking.com
- [ ] Agoda
- [ ] Hotels.com
- [ ] RedBus
- [ ] Goibibo
- [ ] MakeMyTrip
- [ ] Uber
- [ ] Ola

Scope checklist:

- [ ] Affiliate integration abstraction layer
- [ ] Outbound link tracking
- [ ] Offer cards within itinerary context
- [ ] Conversion attribution
- [ ] Compliance and disclosure messaging

Business rule:

Affiliate recommendations must remain secondary to planning quality. Ranking should not override the deterministic usefulness of the itinerary.

Exit criteria:

- [ ] Users can move from planning to partner bookings from relevant screens.
- [ ] Affiliate clicks and conversions are measurable.
- [ ] Disclosure and trust safeguards are visible in the UX.

## 12. Phase 6 - Travel Agency SaaS

Goal: evolve the platform into a professional planning tool for agencies and independent travel planners.

Target customers:

- [ ] Independent trip planners
- [ ] Small travel agencies
- [ ] Boutique itinerary consultants

Scope checklist:

- [ ] Multi-client management
- [ ] Client-specific itineraries
- [ ] Shareable itinerary links
- [ ] Budget reports
- [ ] Destination analytics
- [ ] Workspace or agency accounts
- [ ] Role separation within agencies

Potential pricing tiers:

- [ ] Free
- [ ] Professional
- [ ] Agency

Backend checklist:

- [ ] Add organization and client data models
- [ ] Add shared workspace permissions
- [ ] Add usage and billing hooks

Frontend checklist:

- [ ] Client dashboard
- [ ] Proposal and share flows
- [ ] Agency analytics views

Exit criteria:

- [ ] One planner can manage multiple client itineraries.
- [ ] Agency users can share polished outputs externally.
- [ ] Pricing and access controls map cleanly to usage tiers.

## 13. Architecture Guardrails

These rules should remain true across all phases:

- AI generates suggestions, summaries, and candidate structures.
- Deterministic services calculate scores, budgets, feasibility, sustainability, and analytics.
- External providers must sit behind adapters, not leak provider-specific assumptions through the whole codebase.
- Every AI-dependent flow should have graceful fallback behavior.
- Map, route, and pricing layers should enrich the itinerary domain rather than replace it.

## 14. UX Guardrails

The product should continue to prefer:

`Search -> Explore -> Select -> Build`

Instead of:

`Fill Form -> Submit -> Receive Result`

Practical UX rules:

- [ ] Avoid long forms as the primary planning interface.
- [ ] Keep maps, cards, drawers, and stepwise workflows central.
- [ ] Support mobile planning, not only desktop dashboards.
- [ ] Show analysis inline, not buried in separate admin-style screens.
- [ ] Keep advanced controls optional until users need them.

## 15. Success Criteria

The roadmap is successful when a user can:

- [ ] Select a destination
- [ ] Explore recommendations on a map
- [ ] Build an itinerary visually
- [ ] Understand trip quality
- [ ] Estimate trip cost
- [ ] Export or share the trip

The business roadmap is successful when the platform can also:

- [ ] Convert planning intent into partner referrals
- [ ] Support agency workflows without rebuilding the core product
- [ ] Keep the experience simple even as features expand

## 16. Recommended Near-Term Delivery Order

Recommended practical order for implementation:

- [ ] Phase 0: Platform Foundation
- [ ] Phase 1: Visual Discovery MVP
- [ ] Phase 2: Smart Itinerary Builder MVP
- [ ] Phase 3: Route Intelligence
- [ ] Phase 4: Cost Intelligence
- [ ] Phase 5: Affiliate Layer
- [ ] Phase 6: Travel Agency SaaS

## 17. Final Direction

Travel Intelligence should not become "just another itinerary generator." The strongest version of the product is a visual, explainable travel planning platform where AI helps users discover possibilities and deterministic logic helps them trust the outcome.
