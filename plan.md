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

## 6.5 Phase 0.5 — Search Intelligence Cleanup

Status: `Completed`

Goal: fix destination search behavior so suggestions respond to user input and images are only fetched for confirmed destinations.

### Issue discovered

User reported that typing into the destination search box (e.g. "tokyo") showed the same suggestions regardless of input. The observed static list was:

- Kyoto, Japan
- Santorini, Greece
- Leh, Ladakh, India
- Lucerne, Switzerland
- Munnar, Kerala, India
- Jaipur, Rajasthan, India
- Ubud, Bali, Indonesia
- Paros, Greece

### Root causes found (3)

**1. Angular Material package not installed**
`@angular/material` was listed in `frontend/package.json` but the package folder was empty. This caused the `mat-form-field`, `mat-input`, and `mat-spinner` imports in `destination-search.component.ts` to fail at compile time, which prevented the component from rendering at all. Because the component never rendered, no API call was ever made and no suggestions appeared.
- Fix: ran `npm install` inside `frontend/` to fully populate `node_modules/@angular/material`.

**2. No Angular Material theme in `styles.scss`**
Angular Material v21 requires a `@use '@angular/material'` theme include in the global stylesheet. Without it, Material form fields render broken or invisible even after the package is installed.
- Fix: added `@use '@angular/material' as mat` with a dark theme matching the existing app palette at the top of `frontend/src/styles.scss`.

**3. Image fetched from raw user keystrokes**
`destination-search.component.ts` subscribed to `inputSubject` to call `getDestinationImage(value)` on every debounced keystroke — including partial text like "car", "tok", "par". This caused images to be fetched for arbitrary keywords, not validated destinations.
- Fix: removed the image subscription from `ngOnInit`. Image fetch now happens only inside `selectSuggestion()`, after the user has selected a confirmed destination from the dropdown.

### Files changed

| File | Change |
|---|---|
| `frontend/src/styles.scss` | Added Angular Material `@use` import and dark theme include |
| `frontend/src/app/components/destination-search/destination-search.component.ts` | Removed raw-input image pipeline from `ngOnInit`; moved image fetch into `selectSuggestion` |

### Validation performed

- Angular Material submodule paths (`form-field`, `input`, `progress-spinner`) confirmed present after install
- TypeScript diagnostics: no errors in component or styles files
- Confirmed suggestion pipeline still uses `debounceTime(400)` and `switchMap` — reactive to every input change ≥2 chars
- Confirmed image is now fetched only when `selectSuggestion` is called
- Backend `fallbackSuggestions` correctly filters `FALLBACK_PLACE_NAMES` by query substring — verified behavior is query-responsive even without Gemini

### Scope respected

- No UI changes
- No styling changes (theme addition is structural, not visual redesign)
- No auth, schema, or business logic touched
- No layout changes

---

## 6.6 Phase 0.6 — AI Provider Abstraction + Ollama Itinerary Draft Foundation

Status: `Completed`

Goal: Replace the deterministic, hard-coded mock smart plan logic with a real AI-driven itinerary draft engine using a provider-independent architecture, starting with Ollama.

### Problem statement
The legacy "Smart Plan" endpoint (`/smart-plan`) was a deterministic mock returning simulated, generic activities ("Sightseeing", "Museum") wrapped in a hardcoded JSON format. The user expectation was a real AI-generated itinerary. This needed to be migrated to a true AI solution without impacting the existing UI workflows or the Gemini-based `/travel-search` endpoint.

### Provider abstraction
- Created `server/services/aiProviderResolver.js` to decouple the application from any single AI vendor.
- Resolves the provider dynamically based on `process.env.AI_PROVIDER` (defaulting to `ollama`).

### Ollama development provider
- Implemented `server/services/providers/ollamaProvider.js` as the primary development provider.
- Configurable via `OLLAMA_BASE_URL` and `OLLAMA_MODEL`.
- Sends highly structured prompts enforcing exact JSON output, strict day counts, and detailed activity formatting without markdown wrapping.

### Itinerary draft schema
The endpoint `POST /api/v1/ai/itinerary-draft` accepts parameters (destination, duration, travelers, style, interests, budget) and enforces the following AI output schema:
```json
{
  "destination": "string",
  "duration": "number",
  "summary": "string",
  "days": [
    {
      "day": "number",
      "theme": "string",
      "stops": [
        { "name": "string", "description": "string", "suggestedTime": "string", "suggestedDuration": "string", "category": "string" }
      ]
    }
  ],
  "recommendations": ["string"],
  "packingTips": ["string"]
}
```

### Failure policy
- If the AI provider is unreachable (e.g. `ECONNREFUSED`), times out, or produces malformed JSON, the service **does not fallback to fake data**.
- Instead, it throws a controlled error resulting in a `503 Service Unavailable` response, explicitly stating: "We couldn't generate your trip draft right now."

### Tests performed
- Re-ran existing backend test suites (`npm test`); all 37 tests passing.
- Created `server/tests/itineraryDraft.test.js` covering validation (missing destination/duration), proper structure generation, provider failure handling (503 status), and correct parameter passthrough.

### Manual model evaluation results (Gemma 3 Verification)
We updated the Ollama provider to pass the itinerary draft JSON Schema through Ollama's structured-output `format` field, and tested the `gemma3:latest` model locally across three scenarios:
- **Solan, 4 days** (Interests: nature, adventure; Style: balanced; Budget: 30000):
  - **Endpoint Status:** 200 OK
  - **Generation Time:** 100.10 seconds
  - **Schema Validity:** Valid (perfectly matched the schema definition)
  - **returned summary:** "A four-day adventure through the scenic landscapes and cultural richness of Solan, Himachal Pradesh, combining nature exploration with thrilling activities."
  - **Day themes:** "Arrival & Himalayan Foothills", "Adventure & Waterfalls", "Cultural Immersion & Local Crafts", "Scenic Drive & Departure"
  - **Stops:** Solan Pine Grove, Mashobra Picnic Spot, Naddi Village, Jalkhand Waterfall, Sural Village, Solan Brewery, Bakrota Hills, Local Market (Solan).
  - **Repeated stops:** None
  - **Interest alignment:** Excellent nature & adventure alignment (hikes, pine groves, waterfalls).
- **Goa, 3 days** (Interests: beaches, food; Style: budget; Budget: 20000):
  - **Endpoint Status:** 200 OK
  - **Generation Time:** 57.95 seconds
  - **Schema Validity:** Valid
  - **Beach/Food alignment:** Calangute Beach, Baga Beach, Brittos Restaurant, Palolem Beach, Shri Mangueshi Temple, War Room Cafe, Se Cathedral, Basilica of Bom Jesus, Vinayak Temple, De Bomb Cafe.
  - **Budget awareness:** Mentioned renting a scooter, visiting free beaches/temples, and cheap local Goan food.
- **Jaipur, 2 days** (Interests: history, food; Style: balanced):
  - **Endpoint Status:** 200 OK
  - **Generation Time:** 44.13 seconds
  - **Schema Validity:** Valid
  - **Relevance:** Amber Fort, Sheesh Mahal, Jaigarh Fort, City Palace, Hawa Mahal, Johari Bazaar & Bapu Bazaar. Excellent historical and culinary accuracy.

### Qwen vs Gemma 3 Comparison
- No verified Qwen test results exist because the `qwen2.5-coder:7b` model hit a strict 120-second timeout on all test runs during development.
- Gemma 3 completed successfully for all runs, staying well within the 120-second timeout window (44-100 seconds).

### Known limitations
- The model (`gemma3:latest`) can occasionally suffer from minor geographic hallucinations (e.g. putting Naddi Village, which is near Dharamshala, and Bakrota Hills, near Dalhousie, under a Solan itinerary).
- The generation time can be long (~45-100 seconds) on local machines, so the UI must handle long-running states gracefully.

### Future Work
- [ ] Provider failover logic (e.g. fallback to Gemini if Ollama fails, or vice versa).

---

## 6.7 Phase 0.7 — AI-First Itinerary Creation Foundation

Status: `Completed`

Goal: Make the itinerary creation process AI-first by allowing natural-language trip inputs, while preserving manual creation as a secondary option. Both flows converge into a private draft itinerary lifecycle.

### Problem Statement
Previously, itinerary creation was a complex, multi-step manual form restricted only to admin users. Normal users could only search for destinations but could not create itineraries. More importantly, there was no integration with the newly built structured itinerary draft engine.

### Goal
Provide a simple, understandable AI trip planning interface as the primary entry point for itinerary creation for all logged-in users, alongside a simplified manual creation option. Newly generated itineraries are persisted as private drafts in MongoDB.

### Implementation
- **Intent Extraction Endpoint:** Implemented `POST /api/v1/ai/extract-intent` using Gemma 3. It parses natural-language trip descriptions (e.g., "4 days in Solan for 3 people under 30000") and extracts structured params (`destination`, `duration`, `travelers`, `travelStyle`, `interests`, `budget`).
- **Mongoose Schema Update:** Updated `Itinerary.js` schema to include `status` (`'draft'`, `'published'`, `'archived'`, defaulting to `'published'` for backwards compatibility with legacy records). Made `startDate`, `endDate`, `duration`, and `budget` optional in the database schema to support simplified drafts.
- **Route Authorization & Privacy:** Modified `POST /`, `PUT /:id`, `GET /`, and `GET /:id` in `itineraryRoutes.js`.
  - Normal users (`role: 'user'`) can now create itineraries, but they are strictly created with `status: 'draft'`.
  - Normal users can view and edit only their own drafts. Admins can view and manage all itineraries.
  - Publishing itineraries (setting `status: 'published'`) remains restricted to admins and superadmins.
- **UI Integration (Dashboard Component):**
  - Updated the "New Itinerary" button to be visible to all logged-in users.
  - Implemented a multi-mode modal:
    - **AI-first Entry:** Textarea for natural-language descriptions. Clicking "Generate my itinerary" triggers intent extraction and cycles through friendly loading messages ("Building your trip...", "Structuring your itinerary...").
    - **Clarification Form:** If destination or duration are missing from the extracted intent, a simple page prompts the user to input them.
    - **Draft Preview:** Displays the generated day-by-day plan, theme, stops, and packing tips returned from Gemma 3. Warns the user that locations are AI-suggested and not geographically verified yet.
    - **Manual Form:** Renders the simplified standard multi-step form when the user clicks "Create manually".
  - **Auto-Suggestions:** Integrated autocomplete suggestions in the destination input fields in the modal (both clarification and manual form) by calling the `AiService.getSuggestions()` API with proper debouncing.
  - **Dashboard Cards:** Added a "Draft" badge on dashboard cards to distinguish private drafts from open routes.

### Verified Behavior
- **AI Flow:** Describe trip -> intent extracted -> Gemma 3 reached locally (status 200, ~44-100s) -> loading states cycle successfully -> draft preview renders day themes/stops -> persisted privately as draft in MongoDB -> survives browser close and page refresh.
- **Manual Flow:** Clicking "Create manually" allows entering minimal fields (Title and Destination) -> skips stops -> successfully creates a private draft.
- **Autocomplete:** Destination autocomplete suggestions load query-responsive matching results.
- **Handoff:** Clicking "Create Itinerary" from AI Travel Search successfully prepopulates the AI prompt and starts the creation flow.
- **Role Permissions:** Admins can manage/publish, while normal users are limited to creating/viewing their own drafts.
- **Tests & Compilation:** 39 backend tests and 37 frontend tests passing; production Angular build succeeds.

### Geographic Validation Limitation
The stops generated by Gemma 3 are not geographically validated. Future work includes adding a Place Intelligence layer (such as Google Places API) to geocode and verify distances.

---

## 6.8 Phase 0.8 — Temporary Ollama-Only Development AI Routing

Status: `Completed`

Goal: Route all generative AI runtime features through the provider abstraction layer to support local development with Ollama/Gemma 3 while keeping Gemini dormant unless configured.

### Direct Gemini Route Audit & Migration
- **Audit Findings:** The endpoints `POST /travel-search`, `GET /suggestions`, `GET /trending`, and `GET /itinerary-suggestions` in `server/routes/aiRoutes.js` bypassed the provider resolver and directly invoked `callGemini(prompt)`.
- **Refactoring:**
  - Created `geminiProvider.js` in `server/services/providers/` implementing the provider interface (`generateItineraryDraft`, `extractTripIntent`, `generateStructuredTravelSearch`, `generateTrendingDestinations`, `generateItinerarySuggestions`, `generateAutocompleteSuggestions`).
  - Added support for `gemini` in `aiProviderResolver.js`.
  - Refactored all inline generative endpoints in `aiRoutes.js` to call their respective methods on the resolved provider via `getAiProvider()`.
  - Added a safety check in `imageService.js` to prevent keyword generation requests to Gemini when `AI_PROVIDER=ollama`.

### Autocomplete keystroke behavior
- Autocomplete is latency-sensitive. In Ollama mode, `OllamaProvider.generateAutocompleteSuggestions` immediately returns local suggestions filtered from `FALLBACK_PLACE_NAMES` (non-generative) instead of invoking Gemma 3. In Gemini mode, it calls Gemini.
- Added debounce (300ms) and request cancellation/stale response protection (using RxJS `Subject` and `switchMap`) inside `DashboardComponent` to throttle user keystrokes.

### Timeout Root Cause & Fix
- **Root Cause:** A global timeout interceptor `api-timeout.interceptor.ts` was hardcoded to abort all HTTP requests after 15 seconds. Since Gemma 3 local itinerary generation takes between 44 and 100 seconds, the frontend draft request consistently timed out.
- **Fix:** Refactored the interceptor to dynamically apply a 120-second timeout (`timeoutMs = 120000`) for AI generation endpoints (`/api/v1/ai/itinerary-draft`, `/travel-search`, `/extract-intent`, `/trending`, `/itinerary-suggestions`) while maintaining the 15-second timeout for other standard API calls. Resolved provider fetch timeouts to use the configurable `process.env.AI_GENERATION_TIMEOUT_MS` environment variable with a 2-minute local development default.

### Meghalaya Inconsistent Duration Check
- Detected inconsistent inputs (e.g. "6 days and 7 nights") in user prompts. A regex validator checks if the user specifies both days and nights and if nights exceed days.
- When a conflict is detected, the AI-first flow forces the clarification form, presenting a warning message: `"You mentioned 6 days and 7 nights. Could you confirm the trip duration?"`, allowing the user to explicitly confirm.

### Verification Results
1. **AI-first Create Itinerary with "I want a 3-day history and food trip to Jaipur"**
   - Route: `POST /api/v1/ai/itinerary-draft`
   - Provider: `ollama` (model `gemma3:latest`)
   - Intent Extraction Duration: ~8s
   - Draft Generation Duration: ~42s
   - Status: 200 OK (no Gemini calls)
2. **AI-first Create Itinerary with inconsistent duration ("adventure trip to Meghalaya for 6 days and 7 nights in budget of around 25000")**
   - Flow: Triggers clarification warning in UI asking for confirmation: `"You mentioned 6 days and 7 nights. Could you confirm the trip duration?"`
   - Confirmed Duration: 6 Days
   - Provider: `ollama` (model `gemma3:latest`)
   - Intent Extraction Duration: ~7s
   - Draft Generation Duration: ~55s
   - Status: 200 OK (no Gemini calls)
3. **AI Travel Search for "Kyoto temples and quiet neighborhoods"**
   - Route: `POST /api/v1/ai/travel-search`
   - Provider: `ollama` (model `gemma3:latest`)
   - Search Duration: ~18s
   - Status: 200 OK (no Gemini calls, Unsplash image fetched successfully)

### Remaining Gemini Dependencies & MongoDB Atlas
- **Gemini:** Helper functions inside `aiRoutes.js` and `imageService.js` remain intact but dormant.
- **MongoDB Atlas:** Connectivity issues remain separate (local ephemeral database is used when Atlas connection fails).

---

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

## 16. Immediate UI Improvements (Planned)

Small, high-value improvements to existing screens that do not require new phases or backend changes.

Status: `Planned`

### 16.1 Back Button

Add a browser-aware back button to all secondary pages (itinerary detail, profile, admin).

Requirements:
- Use Angular `Location.back()` so it respects browser history
- Show only when there is history to go back to
- Do not show on top-level pages (home, dashboard, login, register)

Files to change:
- `frontend/src/app/components/itinerary-detail/itinerary-detail.component.ts`
- `frontend/src/app/components/itinerary-detail/itinerary-detail.component.html`

Checklist:
- [ ] Add back button to itinerary detail page
- [ ] Add back button to profile page
- [ ] Add back button to admin dashboard
- [ ] Back button hidden on root-level routes

### 16.2 Profile Page

Create a dedicated profile page at `/profile` showing the logged-in user's account details and a summary of their activity.

Requirements:
- Route: `/profile` — protected by `authGuard`
- Display: name, email, role, account created date
- Display: count of itineraries created, bookings made
- Allow user to update their display name
- No password change in this iteration

Backend:
- `GET /api/users/me` — return full profile with stats
- `PATCH /api/users/me` — update name only

Frontend files to create:
- `frontend/src/app/components/profile/profile.component.ts`
- `frontend/src/app/components/profile/profile.component.html`

Files to change:
- `frontend/src/app/app.routes.ts` — add `/profile` route
- `frontend/src/app/components/navbar/navbar.component.html` — link avatar to `/profile`

Checklist:
- [ ] Create profile component
- [ ] Add `/profile` route with `authGuard`
- [ ] Wire navbar avatar to `/profile`
- [ ] Show user stats (itinerary count, booking count)
- [ ] Allow name update via PATCH

### 16.3 Destination Search Suggestions in Create Itinerary

The destination field inside the itinerary creation wizard currently accepts free text only. Add the same AI-powered autocomplete suggestions used in the dashboard search box.

Requirements:
- Reuse `DestinationSearchComponent` or extract a lightweight suggestion-only variant
- Trigger on ≥2 characters with 400 ms debounce — same as the existing search pipeline
- Selecting a suggestion fills the destination field and does not navigate away
- No image preview or attraction cards inside the wizard — suggestions only
- Keyboard navigation (ArrowUp/Down, Enter, Escape) must work

Files to change:
- `frontend/src/app/components/dashboard/dashboard.component.html` — destination field in wizard step 1
- `frontend/src/app/components/dashboard/dashboard.component.ts` — wire suggestion selection to form field

Checklist:
- [ ] Add suggestion dropdown to wizard destination field
- [ ] Debounced input calls `AiService.getSuggestions()`
- [ ] Selecting suggestion fills `form.destination` without closing wizard
- [ ] Keyboard navigation works in dropdown
- [ ] No image or attractions panel shown inside wizard

### 16.4 My Bookings Routed View Issues (Planned)

Drive view switching reactive to routing parameters rather than local component state, and show the custom user booking status.

Requirements:
- Subscribe to `ActivatedRoute.queryParamMap` in `DashboardComponent` to read `view` query parameter and update `activeView` dynamically.
- Modify `setView()` in `DashboardComponent` to use router navigation with query parameters instead of modifying local state.
- Render booking status (`item.userBooking?.status`) instead of the itinerary status (`item.isActive`) on the dashboard card badge when in Bookings view.

Checklist:
- [ ] Implement queryParamMap subscription in DashboardComponent
- [ ] Modify setView() to update query parameters in URL
- [ ] Conditionalize card status badge for activeView === 'bookings'

## 16.5 Phase 0.6 - AI Travel Search and Itinerary Assistant

Status: `Completed`

Problem statement:

The current destination search experience stopped at autocomplete, static image preview, and attraction cards. It did not understand natural-language travel requests, did not validate travel scope, and could not hand a structured AI itinerary into the existing itinerary creation workflow.

Goal:

Turn the existing search surface into an AI-assisted travel search experience that stays inside the current UI, returns structured travel data, rejects unrelated prompts gracefully, and lets users explicitly continue into the current itinerary workflow without auto-saving AI output.

Checklist:

- [x] Investigate existing Gemini routes, image enrichment, destination search, and itinerary flow before coding
- [x] Add a structured backend AI travel search endpoint inside the existing AI route architecture
- [x] Validate and normalize AI output before sending it to Angular
- [x] Add lightweight travel-scope validation for unrelated prompts
- [x] Only request destination images after a valid destination is identified
- [x] Surface AI travel results in the existing destination search UI without redesigning the page
- [x] Add explicit `Create Itinerary` handoff from AI itinerary output into the existing itinerary creation modal
- [x] Keep MongoDB persistence explicit and unchanged
- [x] Add backend and frontend automated test coverage for the new flow
- [x] Verify frontend production build succeeds
- [x] Record future security and platform hardening work without implementing it now

Implementation completed:

- Added `POST /api/v1/ai/travel-search` in `server/routes/aiRoutes.js`
- Reused the existing Gemini route file and existing Unsplash enrichment service instead of creating duplicate AI services
- Added travel-focused query validation, structured response normalization, graceful fallback responses, and out-of-scope handling
- Normalized destination image lookup to run only after a travel destination is identified
- Extended `frontend/src/app/services/ai.service.ts` with a typed AI travel search client
- Updated `DestinationSearchComponent` to render structured AI answers, day plans, recommendations, travel tips, retry state, and explicit actions
- Added a `createItineraryRequested` event so itinerary creation remains user-confirmed
- Updated `DashboardComponent` to prefill the existing itinerary modal from the AI result without auto-saving

Testing performed:

- [x] `node --test server/tests/aiRoutes.test.js`
- [x] `npm.cmd --prefix frontend exec vitest run src/app/services/ai.service.spec.ts src/app/components/destination-search/destination-search.component.spec.ts`
- [x] `npm.cmd --prefix frontend run build`

Remaining limitations:

- The AI handoff prefills destination, description, duration, and stops, but does not yet map day-wise AI output into persisted itinerary `dailyPlan` records
- The search UI still begins from destination autocomplete selection rather than fully freeform submit-first behavior
- Existing Angular build warnings in `itinerary-detail.component.html` remain outside this phase

Future security and platform items:

- [ ] Add an LLM firewall layer
- [ ] Add prompt-injection protection
- [ ] Add provider abstraction for multiple LLMs
- [ ] Add travel-specific retrieval/RAG
- [ ] Add model evaluation and prompt regression checks
- [ ] Add conversational travel assistant/chatbot mode
- [ ] Add maps integration

## 16.6 Phase 0.7 - Trip Manager Manual Itinerary Editing

Status: `Completed`

Problem statement:
Trip managers need precise control over itineraries, but manual editing was not supported, and there were no access level controls to distinguish between normal travelers and trip managers.

Goal:
Implement a secure, clean, optimistic-concurrency-protected manual itinerary editor for authorized trip managers and admins, fully integrated with the AI Copilot.

Checklist:
- [x] Audit role model and authorization.
- [x] Extend Mongoose User schema to support `trip-manager` role.
- [x] Enforce backend access controls for `user`, `trip-manager`, and `admin` roles.
- [x] Implement optimistic concurrency checks on the backend (updatedAt and version key).
- [x] Create a localized, non-autosaved edit state on the frontend.
- [x] Extend daily itinerary accordion to support day addition/removal and activity addition/removal/reordering.
- [x] Verify legacy itineraries can render and be edited safely.
- [x] Confirm AI Copilot uses the latest saved manual edits.
- [x] Run backend, frontend, and production builds successfully.

## 16.7 Phase 0.8 - AI Itinerary Revision Precision and Scope Preservation

Status: `Completed`

Problem statement:
General LLM prompts can lead to arbitrary rewriting of unaffected days or protected fields during itinerary revisions, causing loss of user changes.

Goal:
Implement server-side scope extraction, protected constraints, and deterministic merging to guarantee that unchanged days and protected fields remain untouched.

Checklist:
- [x] Add semantic scope extraction `extractRevisionScope` in providers.
- [x] Implement deterministic parser for day numbers and extensions.
- [x] Pass explicit `EDITABLE CONTENT` and `PROTECTED CONTENT` prompts.
- [x] Merge original content for preserved days server-side.
- [x] Protect specific fields (locations, budget) from AI modifications.
- [x] sequentially re-number days post-merge.
- [x] Support extension and contraction structural edits.
- [x] Improve frontend change detection layout.
- [x] Enforce backend constraints validation.
- [x] Incorporate user context and version/updatedAt in revision fingerprints.

## 17. Recommended Near-Term Delivery Order

Recommended practical order for implementation:

- [ ] Phase 0: Platform Foundation
- [ ] Phase 0.5: Search Intelligence Cleanup ✅
- [ ] Phase 16.1: Back Button
- [ ] Phase 16.2: Profile Page
- [ ] Phase 16.3: Destination Suggestions in Wizard
- [ ] Phase 16.4: My Bookings Routed View Issues
- [x] Phase 16.5: AI Travel Search and Itinerary Assistant
- [x] Phase 16.6: Trip Manager Manual Itinerary Editing ✅
- [x] Phase 16.7: AI Itinerary Revision Precision and Scope Preservation ✅
- [ ] Phase 1: Visual Discovery MVP
- [ ] Phase 2: Smart Itinerary Builder MVP
- [ ] Phase 3: Route Intelligence
- [ ] Phase 4: Cost Intelligence
- [ ] Phase 5: Affiliate Layer
- [ ] Phase 6: Travel Agency SaaS

## 18. Final Direction

Travel Intelligence should not become "just another itinerary generator." The strongest version of the product is a visual, explainable travel planning platform where AI helps users discover possibilities and deterministic logic helps them trust the outcome.

## 19. Long-Term Travel Intelligence Direction

- RAG-backed travel knowledge system
- curated destination knowledge
- traveler review ingestion pipeline
- review moderation and trust scoring before RAG ingestion
- local and hidden-place knowledge
- seasonal destination intelligence
- itinerary generation grounded with retrieved travel context
- social travel inspiration ingestion
- future reel/video transcription
- extraction of destinations and activities from travel content
- conversion of travel inspiration into itinerary drafts

### Reviews Integration Architecture

Reviews must NOT directly train the model or immediately enter the RAG knowledge base. The design requires a multi-stage validation pipeline:

Traveler review
→ moderation
→ spam/quality checks
→ location/entity validation
→ trusted knowledge store
→ embeddings/vector index
→ RAG retrieval
→ LLM itinerary generation/refinement

### Future Production Evolution

For scaling the deduplication and caching mechanisms:

in-memory generation registry
→ shared Redis cache
→ asynchronous AI generation jobs
→ persistent job status
→ horizontally scalable workers
