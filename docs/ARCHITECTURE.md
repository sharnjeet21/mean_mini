# Travel Intelligence Platform — System Architecture

This document describes the high-level architecture, directory layout, database models, and service layer designs of the Travel Intelligence Platform.

---

## 1. Technical Stack

The platform is designed around a modern, performance-focused MEAN-stack architecture:
* **Frontend**: Angular (v21+), styling via HSL Hues and Tailwind CSS, stateful services, custom animations, and standalone components.
* **Backend**: Node.js & Express API server.
* **Database**: MongoDB for document persistence, mapped using Mongoose schemas.
* **AI Provider layer**: Abstracted resolver mapping prompts to Ollama (local) or Google Gemini (cloud).

---

## 2. Directory Layout

```text
mean_mini/
├── assets/                     # Organized static screenshots and placeholders
│   ├── ui/                     # UI visual audits & mockups
│   ├── destinations/           # Destination hero image catalog
│   └── placeholders/           # Fallback cards & badges
├── docs/                       # Comprehensive project documentation
├── frontend/                   # Angular Client Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # Standalone components (Dashboard, Profile, Detail)
│   │   │   ├── services/       # Services (Auth, Api, Toast, Confirm)
│   │   │   └── utils/          # Client utilities & animation triggers
│   │   └── styles.scss         # Global SCSS style sheets & animation tokens
├── scripts/                    # Platform audit & verification scripts
└── server/                     # Express REST API Server
    ├── middleware/             # Authorization guards, validation pipelines
    ├── models/                 # Mongoose schemas (User, Itinerary, RoleRequest)
    ├── routes/                 # Express Router controllers (Auth, AI, Itineraries)
    ├── scripts/                # Database seeders & initializers
    └── services/               # Core services (AI resolvers, cache, image lookup)
```

---

## 3. Database Schema Definitions

### 3.1 User Schema (`server/models/User.js`)
Stores platform identity credentials and privilege assignments:
* `name`: String (2 to 80 chars)
* `email`: String (lowercase, validated format, unique index)
* `password`: String (bcrypt hashed hash)
* `role`: String (enum: `user`, `trip-manager`, `admin`, `superadmin`, default: `user`)
* `isActive`: Boolean (default: `true`, toggled by superadmins)

### 3.2 Itinerary Schema (`server/models/Itinerary.js`)
Persists structured travel plans, analytics, and booking statuses:
* `title`: String (required)
* `destination`: String (required)
* `startDate` & `endDate`: Dates
* `duration`: String (e.g., "4 Days")
* `budget`: Number
* `travelerCount`: Number
* `category` & `travelStyle`: Strings
* `description`: String
* `dailyPlan`: Array of Day plans (containing day numbers, titles, and activities arrays)
* `createdBy`: Reference to `User` model
* `isActive`: Boolean (default: `true`, determines public discovery state)
* `bookings`: Array of user bookings
* `favorites`: Array of User IDs who saved the plan

### 3.3 Role Request Schema (`server/models/RoleRequest.js`)
Tracks traveler requests to upgrade account privileges:
* `userId`: Reference to `User` (required)
* `requestedRole`: String (enum: `trip-manager`, `admin`, default: `trip-manager`)
* `reason`: String (min 10 characters)
* `status`: String (enum: `pending`, `approved`, `rejected`, default: `pending`)
* `reviewedBy`: Reference to `User`
* `reviewedAt`: Date
* `reviewNotes`: String (reviewer feedback)

---

## 4. Key Flows & Interactions

### 4.1 AI-Driven Itinerary Plan Merger
To avoid LLMs rewriting unaffected itinerary schedule slots, the system uses a backend precision-merge mechanism:
1. User requests itinerary revision with natural-language text.
2. System extracts affected day ranges via LLM extraction tags.
3. System prompts LLM *only* for the affected days.
4. Express backend intercepts the raw json and deterministically stitches unchanged original days back into the document, maintaining locations and preserving the duration bounds.

### 4.2 Custom Modal Confirmations Hook
Visual confirmation overlays use a promise resolution pattern:
* Clicking a delete/publish button triggers `ConfirmService.confirm({ title, message, type })`.
* This pushes a configuration model to a reactive signal, prompting `AppRoot` to scale in the confirmation modal.
* The calling component pauses execution via `await`, resuming instantly once the overlay resolves the promise as `true` (Confirm) or `false` (Cancel).
