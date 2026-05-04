# Travel Itinerary Planner - Advanced MEAN Stack Application

A premium, AI-enhanced travel planning application built with MongoDB, Express.js, Angular 21, and Node.js. Featuring deep Gemini AI integration, dynamic Unsplash imagery, and a robust client-side caching architecture.

## 🚀 Key Modern Features

### 🤖 AI-Powered Intelligence
*   **Gemini Integration**: Generates attraction lists, local tips, and full itinerary suggestions in seconds.
*   **Dynamic Unsplash Hero**: Interactive homepage with an AI-driven crossfade slideshow of world destinations.
*   **Itinerary Preview Modal**: Instantly view rich, AI-generated previews of curated trips before planning.
*   **Smart Search**: Real-time destination autocomplete and suggestion engine.

### 🧭 Advanced Planning Tools
*   **4-Step Creation Wizard**: Guided flow for planning basics, dates, budget, and stops.
*   **Multi-Stop Support**: Add unlimited extra destinations and notes to a single itinerary.
*   **Auto-Duration Calculation**: Real-time "Days & Nights" calculation based on your selected travel dates.
*   **Social Proof**: Live trending destinations feed showing what the global community is exploring.

### ⚡ Performance & Reliability
*   **Smart AI Caching**: Client-side `localStorage` caching layer with TTL (Time-To-Live) to reduce API latency and protect rate limits.
*   **Fault-Tolerant UI**: Curated mock data fallbacks ensure the app stays beautiful even if external APIs are unreachable.
*   **Auto-Healing Auth**: Automatic logout and session cleanup upon JWT token expiry (prevents 401 loops).
*   **Forced Reactivity**: Change detection optimization ensures the UI always reflects async AI data arrival.

## 📁 Project Structure

```
├── server/                 # Backend (Express.js + MongoDB)
│   ├── config/            # Database & Environment configuration
│   ├── models/            # Mongoose schemas (User, Itinerary, etc.)
│   ├── routes/            # API endpoints (Auth, Itinerary, AI)
│   ├── middleware/        # JWT Authentication & Role-based guards
│   └── server.js          # Entry point
├── frontend/              # Frontend (Angular 21 + Tailwind/Custom CSS)
│   ├── src/app/
│   │   ├── components/    # Smart components (Wizard, Slideshow, Search)
│   │   └── services/      # API wrappers & LocalStorage Cache logic
│   └── package.json
└── README.md
```

## 🛠️ Quick Start

### 1. Prerequisites
- Node.js (v20+ recommended)
- MongoDB (Local or Atlas)
- Unsplash Developer Access Key
- Google Gemini API Key

### 2. Installation & Setup

```bash
# Clone the repo
git clone https://github.com/sharnjeet21/mean_mini.git
cd mean_mini

# Install all dependencies (Backend + Frontend)
npm install
cd frontend && npm install && cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
MONGO_URI=mongodb+srv://... (or localhost)
PORT=5000
JWT_SECRET=your_secret_key
UNSPLASH_ACCESS_KEY=your_key
GEMINI_API_KEY=your_key
```

### 4. Running the Application
```bash
# Run the full stack concurrently
npm run dev:full
```
*   **Frontend**: http://localhost:4200
*   **Backend API**: http://localhost:5000

## 🛡️ Role-Based Access Control

*   **User**: Browse, search, and preview itineraries.
*   **Admin**: Create complex multi-stop itineraries and manage bookings.
*   **Superadmin**: Full user management and role delegation controls.

---

**Built with ❤️ using the Modern MEAN Stack**

Contributors: [sharnjeet21](https://github.com/sharnjeet21), [yuvsingh716](https://github.com/yuvsingh716)  
Support: sharn.ss123@gmail.com, yuvsingh716@gmail.com
