# Travel Intelligence Platform — Product Roadmap

This document outlines the product vision, current features, technical foundation, and future milestones of the Travel Intelligence Platform.

---

## 1. Product Vision
Travel Intelligence is a professional travel curation and planning SaaS. It integrates natural-language AI discovery tools with a deterministic, explainable trip analysis engine. Travelers can explore, save, and book itineraries; curators and planners can design, publish, and refine itineraries with the help of an AI Copilot; and administrators oversee platform-wide demand analytics and user roles.

---

## 2. Current Product
Our platform has evolved from an itinerary planner into a multi-role workspace:
* **Traveler Workspace**: Personalized dashboards displaying saved trips, active bookings, review histories, and destination search modules.
* **Trip Manager (Curator) Board**: Drafting, manual schedule builders, AI refinement inputs, and publishing panels.
* **Platform Operations Dashboard**: Admin control panel providing user lists, deactivation actions, and role upgrade review forms.

---

## 3. Current Architecture
* **Frontend**: Single Page Application built on Angular 21, featuring standalone components, asynchronous API services, and custom animations.
* **Backend**: Express REST API exposing route controllers for auth, itineraries, role upgrades, and AI services.
* **Persistence**: Mongoose-managed MongoDB layer.
* **AI Provider resolver**: Abstraction separating client calls from the model endpoint, directing prompts to Ollama (offline development) or Google Gemini (production cloud).

---

## 4. Implemented Features

### 4.1 AI & Generation Layer
* **AI Travel Search**: Natural-language search with validation and fallback matching.
* **AI Itinerary Drafts**: Provider-agnostic generation of detailed travel schedules.
* **AI Itinerary Revision Protection**: Precision-edit pipeline that targets specific days while deterministically protecting other segments.

### 4.2 Curation & Planning
* **Manual Day Accordion Editor**: Drag-and-drop-like editing for days and activities, day addition/removal, and category selections.
* **Optimistic Concurrency Control**: Uses Mongoose version keys to prevent simultaneous curator updates from causing data loss.

### 4.3 SaaS Foundation
* **Role Upgrade Request Workflows**: Forms for users to request Trip Manager privileges, with review queues for admins.
* **Micro-Interaction & Animations**: Global slide entrance toasts, promise-based confirm dialogs, card hover elevations, and custom shimmer skeleton screens.

---

## 5. Current Role Model
* **Traveler (`user`)**: Can search, save, review, and book public itineraries. Can request upgrade to trip manager.
* **Curator (`trip-manager`)**: Can build custom itineraries, edit day schedules, and publish routes to travelers.
* **Platform Admin (`admin`)**: Can moderate itineraries, manage bookings, and review role upgrade requests.
* **Superadmin (`superadmin`)**: Has full access, including user directory deactivation and role promotion privileges.

---

## 6. Execution Roadmap

### 6.1 Foundation (Completed)
* [x] JWT Authentication & Router Guards
* [x] Core Mongoose Schemas & Relationships
* [x] AI Provider Abstraction
* [x] Custom Toast and Confirmation Overlay System

### 6.2 Traveler Experience
* [x] Autocomplete & AI Travel Search Integration
* [x] Saved Wishlists & Bookings Pipelines
* [x] Interactive cards hover transitions
* [ ] **Mapbox Map Integration**: Interactive pin drop and visual attraction route previews.

### 6.3 Trip Manager Workspace
* [x] Manual Day accordion schedule editor
* [x] AI Copilot refinement panel
* [x] Inline publish & archive controls
* [ ] **Itinerary Proposal Sharing**: Exporting custom agency plans as secure, shareable PDF summaries.

### 6.4 Agency Workspace
* [ ] **Multi-Client Workspace**: Shared folders for travel agencies, enabling collaborative curation among multiple planners.
* [ ] **Client Pitch Portal**: Custom booking portals branded for partner agencies.

### 6.5 Platform Operations
* [x] User Directory Table
* [x] Account deactivation toggles
* [x] Role Upgrade review panels
* [x] Complete Four-Role SaaS RBAC Architecture (Traveler, Trip Manager, Admin, Superadmin)
* [ ] **SaaS Analytics Dashboard**: Visual charts for revenue, active planners, API latency, and bookings.

### 6.6 AI & Intelligence Roadmap
* [x] Dynamic Gemini/Ollama Provider Resolver
* [x] Scope Extraction and Precision Merging
* [x] Stabilized Multi-Provider AI Runtime (health checks, retry proxy, quarantine, and failover)
* [ ] **Route Optimization**: Calculating optimal routes between daily stops to avoid backtracking.
* [ ] **Cost Intelligence**: Auto-estimating local expenses using real destination indexes.

### 6.7 Knowledge (RAG) Roadmap
* [ ] **Trusted Review Ingestion**: Ingesting verified user reviews.
* [ ] **RAG Context Injections**: Grounding generated plans with real user feedback.
* [ ] **Hidden Gems Classifier**: Surfacing local recommendations.

### 6.8 Affiliates Roadmap
* [ ] **GetYourGuide & Booking.com Hooks**: Embedding booking links directly inside stay/attraction cards.
* [ ] **Click Tracking**: Conversion metrics for affiliate commission estimates.

### 6.9 Security Roadmap
* [ ] **JWT Refresh Cookies**: Migrating tokens to secure HTTP-only cookies.
* [ ] **LLM Gateway Firewalls**: Prompt injection filters.

### 6.10 Deployment & Production
* [x] Multi-container Docker configuration
* [x] Automated Jenkins Pipeline
* [ ] **Distributed Cache**: Replacing in-memory storage with shared Redis caches.
* [ ] **Horizontally Scalable Workers**: Moving AI generation to asynchronous queues.

---

## 7. Long-Term Vision

### 7.1 Social Travel Ingestion
Convert social inspiration into travel plans:
```text
Instagram Reel / Video
         │
         ▼
  [Audio Transcript]
         │
         ▼
 [Named Entity Extraction] ── (Identifies places, cafés, sights)
         │
         ▼
 [RAG Knowledge Query]
         │
         ▼
[Structured Draft Builder]
         │
         ▼
 [Open Interactive Planner]
```

### 7.2 Offline Progressive Web App (PWA)
Ensure travelers can access maps, tickets, and daily schedules offline while on their journeys.
