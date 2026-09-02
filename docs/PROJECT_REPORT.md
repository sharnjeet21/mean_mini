# TraVenture — Project Architecture & Status Report

This report documents the architectural design, user navigation workflows, system component structure, and the detailed implementation status of the TraVenture platform.

---

## 1. System Architecture

Under the **Agency-Centric Refactor**, the frontend application separates ordinary traveler experiences from staff workspace features. All administration, curation, and platform controls are consolidated under a single, unified, role-aware **Agency Workspace Shell** at `/agency`.

### Component Topology (Agency-Centric Shell)

```mermaid
graph TD
  subgraph Client/Traveler View
    DashboardComponent["Explore Dashboard (/dashboard)"]
    ClientDashboardComponent["Client Portal (/client-portal)"]
    PublicItineraryComponent["Public Proposal (/proposal/:id)"]
  end

  subgraph Agency Shell Workspace
    AgencyWorkspaceComponent["Agency Shell (/agency)"]
    AgencyOverviewComponent["Overview Sub-Route (/agency/overview)"]
    AgencyTripsComponent["My Trips & AI Planner (/agency/trips)"]
    AgencyProposalsComponent["Proposals Directory (/agency/proposals)"]
    AgencyClientsComponent["CRM Directory (/agency/clients)"]
    AgencyAnalyticsComponent["Analytics Dashboard (/agency/analytics)"]
    AgencyOperationsComponent["Operations Console (/agency/operations)"]
    AgencyPlatformComponent["Platform Diagnostics (/agency/platform)"]
  end

  %% Navigation connections
  AgencyWorkspaceComponent --> AgencyOverviewComponent
  AgencyWorkspaceComponent --> AgencyTripsComponent
  AgencyWorkspaceComponent --> AgencyProposalsComponent
  AgencyWorkspaceComponent --> AgencyClientsComponent
  AgencyWorkspaceComponent --> AgencyAnalyticsComponent
  AgencyWorkspaceComponent --> AgencyOperationsComponent
  AgencyWorkspaceComponent --> AgencyPlatformComponent

  style Client/Traveler View fill:#05201f,stroke:#7ae0c3,stroke-width:2px,color:#fff
  style Agency Shell Workspace fill:#091d29,stroke:#86ebd2,stroke-width:2px,color:#fff
```

---

## 2. User Authentication & Authorization Flow

The application dynamically controls access to routes, navbar links, and button triggers depending on the user's authenticated credentials and role attributes (`user`, `trip-manager`, `admin`, `superadmin`).

```mermaid
flowchart TD
  Start([User Enters Application]) --> AuthCheck{Is Logged In?}
  
  %% Guest Flow
  AuthCheck -- No --> GuestView[Guest Experience]
  GuestView --> GuestLinks["Browse Home, Explore Public Routes, View Public Proposals (/proposal/:id)"]
  
  %% Logged In Flow
  AuthCheck -- Yes --> RoleResolve{Check User Role}
  
  %% Traveler Flow
  RoleResolve -- 'user' (Traveler) --> TravelerLinks["Access Explore Dashboard (/dashboard)<br/>- Browse live routes<br/>- Save wishlist favorites<br/>- View bookings<br/>- Review /client-portal"]
  
  %% Trip Manager Flow
  RoleResolve -- 'trip-manager' --> StaffBase["Access Explore Dashboard<br/>+ Agency Workspace (/agency)<br/>- Overview metrics<br/>- Trips board & AI Modal Planner<br/>- Proposals directory<br/>- Currency analytics"]
  
  %% Admin Flow
  RoleResolve -- 'admin' --> AdminBase["Access Staff Workspace + Admin Features<br/>- Clients directory (CRM)<br/>- Operations console (/agency/operations)<br/>  * Moderate global itineraries<br/>  * Review upgrade requests<br/>  * Track affiliate click payouts"]
  
  %% Superadmin Flow
  RoleResolve -- 'superadmin' --> SuperBase["Access All Workspace Features<br/>- Platform diagnostics console (/agency/platform)<br/>  * Global accounts role promotion/toggles<br/>  * AI provider fallback telemetry<br/>  * System database diagnostics"]
  
  %% Redirections
  TravelerLinks -.->|Block /agency access| GuestView
  StaffBase -.->|Block Operations/Platform| StaffBase
  AdminBase -.->|Block Platform| AdminBase
```

---

## 3. Codebase Integration & Feature Status

This section breaks down the entire codebase's components by status following our stabilization run.

### IMPLEMENTED
* **Unified Sidebar Workspace Shell (`/agency`)**: Lazy-loaded, role-aware parent container (`AgencyWorkspaceComponent`) containing sidebar controllers, layout transitions, and nested route components.
* **Backend Geocoding & Directions Proxies**: Backend routes in [`aiRoutes.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/routes/aiRoutes.js) (`/geocode` and `/directions`) that delegate geocoding and route geometry calculations to [`mapboxAdapter.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/adapters/mapboxAdapter.js).
* **Multi-Provider AI Fallback Resolver**: System class [`aiProviderResolver.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/services/aiProviderResolver.js) that selects, health-checks, and falls back across Gemini, NVIDIA NIM, and local Ollama instances.
* **Detailed Admin Analytics Aggregation**: Direct database calculations in [`adminRoutes.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/routes/adminRoutes.js) fetching actual metrics (active/inactive count, reviews, saves, average budgets) to feed the Operations dashboard.
* **Frontend Geolocation & Map Canvas**: The [`MapCanvasComponent`](file:///d:/1YUVRAJ/program/project/mean_mini/frontend/src/app/components/map-canvas/map-canvas.component.ts) renders Leaflet coordinate layers using backend proxy calls.
* **Unsplash Destination Image Enrichment**: Handled by [`imageService.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/services/imageService.js), routing requests through `/api/image` and caching them local-first to prevent API exhaustion.

### PARTIALLY IMPLEMENTED
* **Trip Lifecycle State Machine**: Schema level support for `status: ['draft', 'published', 'archived']` is fully active on the backend. The frontend properly shows state badges, but route validation guarding actions on archived items is still pending integration.
* **Affiliate Analytics & Tracker**: Redirect clicks model [`AffiliateClick.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/models/AffiliateClick.js) and tracking redirects are active, but the frontend views display static fallback structures when DB statistics are scarce.

### BROKEN
* *None. All backend tests pass, Angular client packages compile cleanly with leaflet typings, and standard route access restrictions are operational.*

### MISSING
* *None. All core capabilities defined in the integration target are present.*

### DUMMY / MOCK
* **Offline AI Response Model**: When third-party AI keys are unavailable, local failbacks supply predefined mock structures for autocomplete and trending widgets to ensure user experience does not fail.

### MAIN-ONLY
* **Mapbox CSS bundles**: The production branch features strict Mapbox GL styling sheets. This dev branch replaces this with a lightweight Leaflet mapping canvas to maintain fluid operations without heavy browser footprints.

### DEV-ONLY (Removed from Branch)
* **Legacy Admin Dashboard**: The old layout [`admin-dashboard`](file:///d:/1YUVRAJ/program/project/mean_mini/frontend/src/app/components/admin-dashboard) has been deleted to prevent route collisions and duplicate code paths.

---

## 4. Platform Data Model Specification

The database utilizes MongoDB to model entities, transactions, and curation state:

### User Account
* `name` (String): Display name.
* `email` (String, Unique): Authentication address.
* `password` (String, Hashed): Bcrypt security hash.
* `role` (Enum): `user` (Traveler), `trip-manager` (Staff Curator), `admin` (Operations Moderator), `superadmin` (System Administrator).
* `isActive` (Boolean): Operational status toggle.

### Itinerary Itinerary
* `title` (String): Trip heading.
* `destination` (String): Destination name.
* `startDate` & `endDate` (ISODate): Travel dates.
* `duration` (String): Calculated length.
* `budget` (Number) & `budgetBreakdown` (Object): Transport, Accommodation, Food, Activities, Contingency values.
* `stops` (Array): Array of named checkpoints and description notes.
* `status` (Enum): `draft` (Private workspace), `published` (Visible to travelers).
* `isActive` (Boolean): Admin visibility status toggle.
* `engagement` (Object): Saves count, review counters, average rating score.

### Role Request
* `userId` (ObjectID): Reference to requester.
* `requestedRole` (String): Target role.
* `reason` (String): Upgrade reasoning.
* `status` (Enum): `pending`, `approved`, `rejected`.
* `reviewerId` (ObjectID) & `reviewNotes` (String): Verification records.

---

## 5. Trip Intelligence Core Algorithm

The analysis engine in [`tripAnalyzer.js`](file:///d:/1YUVRAJ/program/project/mean_mini/server/utils/tripAnalyzer.js) computes scores and warns of planning problems:

### Metric Deductions
* **Daily Budget**: Total budget divided by days.
* **Activity Load**: Total planned activities divided by days.
* **Pace Level**: Classified as `relaxed`, `moderate`, or `intense` depending on activity frequency.

### Score Formulas (0-100 range)
* **Completeness**: Evaluated based on description length, day theme coverage, and highlights details.
* **Pace**: Measures schedule overloading. Rejects plans with too many activities per day.
* **Budget**: Compares daily budget against target category estimates and checks contingency reserves (ideally > 10%).
* **Sustainability**: Coeffecients based on transportation and hotel choices.
* **Overall Feasibility (F)**:
  $$F = 0.35 \times \text{Completeness} + 0.25 \times \text{Pace} + 0.25 \times \text{Budget} + 0.15 \times \text{Sustainability}$$

### Risk Flag Rules
* `UNPLANNED_DAYS`: Detected when calendar duration exceeds daily plan array length.
* `OVERLOADED_SCHEDULE`: Triggered when pace matches intensive activity frequencies.
* `LOW_DAILY_BUDGET`: Triggered when average daily budget drops below threshold.
* `BUDGET_MISMATCH`: Triggered when budget breakdown does not sum to total budget.
