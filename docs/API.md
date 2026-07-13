# Travel Intelligence Platform — API Reference

This document catalogs the REST API endpoints, authorization guards, and expected request/response models of the Travel Intelligence server.

---

## 1. Authentication Endpoints

Prefix: `/api/v1/auth`

### 1.1 User Registration
* **Endpoint**: `POST /register`
* **Access**: Public
* **Payload**:
  ```json
  { "name": "Traveler Name", "email": "traveler@domain.com", "password": "securepassword123" }
  ```
* **Response**: `201 Created` with JWT access token.

### 1.2 User Login
* **Endpoint**: `POST /login`
* **Access**: Public
* **Payload**:
  ```json
  { "email": "traveler@domain.com", "password": "securepassword123" }
  ```
* **Response**: `200 OK` with JWT access token.

### 1.3 User Profile
* **Endpoint**: `GET /profile` / `PUT /profile`
* **Access**: Authenticated (User / Manager / Admin)
* **Description**: Returns or updates the authenticated user's profile metadata.

---

## 2. AI Planning Endpoints

Prefix: `/api/v1/ai`

### 2.1 Get Autocomplete Suggestions
* **Endpoint**: `GET /suggestions?q=tokyo`
* **Access**: Authenticated
* **Response**: List of matching places from local index or LLM.

### 2.2 Generate Itinerary Draft
* **Endpoint**: `POST /itinerary-draft`
* **Access**: Authenticated (Trip Manager / Admin / Superadmin)
* **Payload**:
  ```json
  {
    "destination": "Kyoto",
    "duration": 5,
    "travelers": 2,
    "travelStyle": "premium",
    "interests": ["culture", "history"],
    "budget": 5000
  }
  ```
* **Response**: `200 OK` with structured itinerary JSON.

### 2.3 Refine Itinerary (AI Copilot)
* **Endpoint**: `POST /itinerary-revision`
* **Access**: Authenticated (Curators / Admins)
* **Payload**:
  ```json
  {
    "itineraryId": "itinerary-id-123",
    "instruction": "Swap day 3 with walking tours and add local café stops."
  }
  ```
* **Response**: `200 OK` with merged and renumbered itinerary draft.

---

## 3. Itinerary Operations Endpoints

Prefix: `/api/v1/itineraries`

### 3.1 List Itineraries
* **Endpoint**: `GET /`
* **Access**: Public (retrieves active itineraries) / Curators (filters by owner)
* **Response**: Array of itineraries.

### 3.2 Create / Update Itinerary
* **Endpoint**: `POST /` / `PUT /:id`
* **Access**: Authenticated (Curator / Admin / Superadmin)
* **Description**: Creates or edits an itinerary. Put endpoints enforce Mongoose version checks (`__v` / `updatedAt`) to prevent concurrent overwrites.

### 3.3 Delete Itinerary
* **Endpoint**: `DELETE /:id`
* **Access**: Authenticated (Owner Curator / Admin / Superadmin)

---

## 4. User Directory & Role Upgrades

### 4.1 Get Users List
* **Endpoint**: `GET /api/v1/users`
* **Access**: Superadmin only / Admin (limited admin list)
* **Description**: List of all platform accounts.

### 4.2 Submit Curator Upgrade Request
* **Endpoint**: `POST /api/v1/role-requests`
* **Access**: Traveler (user) only
* **Payload**:
  ```json
  { "reason": "I coordinate group hiking trips and want to publish curated nature itineraries." }
  ```

### 4.3 Review Role Upgrade Request
* **Endpoint**: `PUT /api/v1/role-requests/:id/review`
* **Access**: Admin / Superadmin
* **Payload**:
  ```json
  { "status": "approved", "notes": "Approved for the demonstration portfolio." }
  ```
