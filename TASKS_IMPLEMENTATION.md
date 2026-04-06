# Tasks Implementation for MEAN Mini Project

## 1. Node.js Setup
- Install Node.js from the official [Node.js website](https://nodejs.org/).
- Initialize a new Node.js project with:
  ```bash
  npm init -y
  ```
- **Status: ✅ Implemented** — `package.json` configured with all dependencies.

---

## 2. Express Server
- Install Express with:
  ```bash
  npm install express
  ```
- `app.js` sets up the basic Express entry point:
  ```javascript
  const express = require('express');
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
  ```
- Full server in `server/server.js` with routes, static files, and middleware.
- **Status: ✅ Implemented** — `app.js` + `server/server.js`

---

## 3. Bootstrap Integration
- Bootstrap 5 included via CDN in all HTML views:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">
  ```
- Also imported in Angular via `styles.scss`:
  ```scss
  @import 'bootstrap/dist/css/bootstrap.min.css';
  ```
- **Status: ✅ Implemented** — All views + Angular frontend use Bootstrap 5.

---

## 4. MongoDB CRUD Operations
- Full CRUD via REST API in `server/routes/itineraryRoutes.js`:
  ```javascript
  // Create
  router.post('/', authenticate, authorize('admin','superadmin'), async (req, res) => {
    const itinerary = await Itinerary.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(itinerary);
  });

  // Read
  router.get('/', authenticate, async (req, res) => {
    const itineraries = await Itinerary.find({}).populate('createdBy', 'name email');
    res.json(itineraries);
  });

  // Update
  router.put('/:id', authenticate, authorize('admin','superadmin'), async (req, res) => {
    const updated = await Itinerary.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  });

  // Delete
  router.delete('/:id', authenticate, authorize('admin','superadmin'), async (req, res) => {
    await Itinerary.findByIdAndDelete(req.params.id);
    res.json({ message: 'Itinerary deleted.' });
  });
  ```
- **Status: ✅ Implemented** — `server/routes/itineraryRoutes.js`, `userRoutes.js`, `roleRequestRoutes.js`

---

## 5. Mongoose Data Models
- Schemas defined in `server/models/`:
  ```javascript
  // User model
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  });
  const User = mongoose.model('User', userSchema);
  ```
- Also: `Itinerary.js` (with dailyPlan, bookings, tripSummary) and `RoleRequest.js`.
- **Status: ✅ Implemented** — `server/models/User.js`, `Itinerary.js`, `RoleRequest.js`

---

## 6. Database Connection
- Connect to MongoDB using Mongoose in `server/config/db.js`:
  ```javascript
  mongoose.connect('mongodb://localhost:27017/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  ```
- URI loaded from `.env` via `dotenv`.
- **Status: ✅ Implemented** — `server/config/db.js`

---

## 7. Angular Components
- Angular 21 standalone components created with Angular CLI:
  ```bash
  ng generate component componentName
  ```
- Components built:
  - `NavbarComponent` — responsive nav with auth-aware links
  - `HomeComponent` — landing page with hero, features, CTA
  - `LoginComponent` — JWT login form
  - `RegisterComponent` — registration with bcrypt on backend
  - `DashboardComponent` — itinerary grid with stats
  - `AboutComponent` — project overview with all 9 tasks listed
- **Status: ✅ Implemented** — `frontend/src/app/components/`

---

## 8. SPA Architecture
- Angular Router configured in `app.routes.ts`:
  ```typescript
  const routes: Routes = [
    { path: '',         component: HomeComponent },
    { path: 'home',     component: HomeComponent },
    { path: 'about',    component: AboutComponent },
    { path: 'login',    component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: '**', redirectTo: '/home', pathMatch: 'full' },
  ];
  ```
- `authGuard` protects the dashboard route — redirects to `/login` if not authenticated.
- **Status: ✅ Implemented** — `frontend/src/app/app.routes.ts`, `guards/auth.guard.ts`

---

## 9. Authentication System
- JWT-based authentication with bcrypt password hashing:
  ```javascript
  // Hash password on register
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);

  // Verify on login
  const isMatch = await bcrypt.compare(password, user.password);

  // Issue JWT
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  ```
- JWT middleware in `server/middleware/auth.js` validates `Authorization: Bearer <token>`.
- Angular `AuthService` stores token in `localStorage` and exposes reactive `currentUser` signal.
- HTTP interceptor (`auth.interceptor.ts`) attaches token to every API request automatically.
- **Status: ✅ Implemented** — `server/middleware/auth.js`, `frontend/src/app/services/auth.service.ts`

---

## Running the Application

```bash
# Install all dependencies
npm install
cd frontend && npm install && cd ..

# Seed the database
npm run init-db

# Run backend + frontend together
npm run dev:full
```

| URL | Description |
|-----|-------------|
| http://localhost:5000 | Express API |
| http://localhost:4200 | Angular SPA |
| http://localhost:4200/about | Task overview page |

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| User | user@travel.com | user123 |
| Admin | admin@travel.com | admin123 |
| Superadmin | superadmin@travel.com | superadmin123 |

---

### Conclusion
All 9 tasks from this document are fully implemented in the MEAN stack project.
