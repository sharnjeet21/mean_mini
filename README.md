# Travel Itinerary Planner - MEAN Stack Application

A comprehensive travel planning application built with MongoDB, Express.js, Angular, and Node.js (MEAN Stack).

## Features

✅ **Task 1**: Express, Node.js and npm packages setup
✅ **Task 2**: Express project and static site creation  
✅ **Task 3**: Bootstrap integration for responsive layouts
✅ **Task 4**: MongoDB with full CRUD operations
✅ **Task 5**: Data models with MongoDB and Mongoose
✅ **Task 6**: Express-MongoDB connection via Mongoose
✅ **Task 7**: Beautiful Angular UI with components

## Project Structure

```
├── server/                 # Backend (Express.js + MongoDB)
│   ├── config/            # Database configuration
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication middleware
│   └── server.js          # Main server file
├── frontend/              # Frontend (Angular)
│   ├── src/app/
│   │   ├── components/    # Angular components
│   │   └── services/      # API services
│   └── package.json
└── views/                 # Static HTML files (legacy)
```

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd mean_mini
npm install
cd frontend && npm install && cd ..
```

2. **Environment Setup:**
Create a `.env` file in the root directory:
```env
MONGO_URI=mongodb://localhost:27017/travel_planner
PORT=5000
JWT_SECRET=your_jwt_secret_here
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### AI Features Setup

The application uses two external APIs to power its AI-enhanced travel features:

**Unsplash (destination images)**
1. Create a free account at [https://unsplash.com/developers](https://unsplash.com/developers)
2. Create a new application to get your Access Key
3. Set `UNSPLASH_ACCESS_KEY` in your `.env` file

**Google Gemini (AI suggestions & itineraries)**
1. Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account and generate an API key
3. Set `GEMINI_API_KEY` in your `.env` file

3. **Initialize Database:**
```bash
npm run init-db
```

### Running the Application

#### Option 1: Run Both Frontend and Backend Together
```bash
npm run dev:full
```
- Backend: http://localhost:5000
- Frontend: http://localhost:4200

#### Option 2: Run Separately

**Backend only:**
```bash
npm run dev
```

**Frontend only:**
```bash
npm run frontend
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Itineraries
- `GET /api/itinerary` - Get all itineraries
- `POST /api/itinerary` - Create new itinerary (Admin only)
- `GET /api/itinerary/:id` - Get single itinerary
- `PUT /api/itinerary/:id` - Update itinerary (Admin only)
- `DELETE /api/itinerary/:id` - Delete itinerary (Admin only)
- `POST /api/itinerary/:id/book` - Book itinerary (User only)

### Users
- `GET /api/users` - Get all users (Admin only)
- `PUT /api/users/:id/role` - Update user role (Superadmin only)

### AI Travel Features
- `GET /api/image?place={destination}` - Get destination image
- `GET /api/suggestions?q={query}` - Get AI place suggestions
- `GET /api/trending` - Get trending destinations
- `GET /api/itinerary-suggestions?place={destination}` - Get attraction suggestions

### Role Requests
- `POST /api/role-requests` - Request admin role
- `GET /api/role-requests` - Get role requests (Admin only)
- `PUT /api/role-requests/:id` - Review role request (Superadmin only)

## Angular Components

### 🏠 Home Component
- Hero section with call-to-action
- Feature showcase
- How it works section
- Responsive design with Bootstrap

### 🔐 Authentication Components
- **Login Component**: User authentication form
- **Register Component**: User registration with validation

### 📊 Dashboard Component
- Statistics cards
- Itinerary grid with search/filter
- Responsive cards with hover effects
- Integration with backend API

### 🧭 Navbar Component
- Responsive navigation
- Route-based active states
- Modern gradient buttons

## Technologies Used

### Backend
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **Angular 21** - Frontend framework
- **Bootstrap 5** - CSS framework
- **Font Awesome** - Icons
- **RxJS** - Reactive programming
- **TypeScript** - Type safety

### Development
- **Concurrently** - Run multiple commands
- **Nodemon** - Auto-restart server
- **Angular CLI** - Development tools

## Features Implemented

### 🎨 Beautiful UI/UX
- Modern gradient designs
- Smooth animations and transitions
- Responsive layouts for all devices
- Professional typography with Inter font
- Custom scrollbar styling

### 🔒 Authentication System
- JWT-based authentication
- Role-based access control (User, Admin, Superadmin)
- Protected routes and middleware

### 📱 Responsive Design
- Mobile-first approach
- Bootstrap grid system
- Flexible components
- Touch-friendly interfaces

### 🚀 Performance
- Lazy loading components
- Optimized API calls
- Efficient state management
- Fast build times

## Development Commands

```bash
# Install dependencies
npm install

# Run backend only
npm run dev

# Run frontend only
npm run frontend

# Run both together
npm run dev:full

# Build frontend for production
npm run frontend:build

# Initialize database with sample data
npm run init-db
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

---

**Built with ❤️ using the MEAN Stack**


Contact us: sharn.ss123@gmail.com, yuvsingh716@gmail.com
