# Travel Itinerary Management System

A comprehensive role-based travel itinerary management system built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JavaScript.

## Features

### Role-Based Access Control
- **Superadmin**: Complete system access, user management, role assignment
- **Admin**: Create and manage detailed travel itineraries
- **User**: Browse and book available itineraries

### Core Functionality
- **User Authentication**: Secure login/logout with session management
- **Detailed Itinerary Planning**: Day-by-day travel plans with activities, timings, and locations
- **Booking System**: Users can book itineraries created by admins
- **User Management**: Superadmin can manage users and roles
- **Responsive Design**: Bootstrap-powered responsive UI
- **Cloud Deployment**: Configured for Vercel deployment

## User Roles & Permissions

### Superadmin
- Full system access and control
- User management (create, update, delete users)
- Role assignment and management
- View all system statistics
- Access to all itineraries and bookings

### Admin
- Create detailed travel itineraries
- Manage existing itineraries (update, delete)
- View booking information
- Cannot manage users or roles

### User
- Browse available itineraries
- Book itineraries
- View personal bookings
- Cannot create or modify itineraries

## Sample Itinerary Format

The system supports detailed day-by-day itineraries with the following structure:

```
🗓️ Day 1 – Ludhiana → Kasauli (Travel + Local Walk)
6:00 AM – Departure from Ludhiana by car/bus
Distance: ~165 km | Travel Time: 4–5 hours
8:30 AM – Breakfast (on the way)
Stop near Chandigarh - Paratha, curd, tea ☕
11:00 AM – Arrival in Kasauli
Check-in to hotel and rest
1:30 PM – Lunch
Local Himachali thali or simple North Indian meal 🍛
3:30 PM – Visit Christ Church & Walk on Mall Road
7:30 PM – Dinner
Soup, roti, paneer/veg curry 🍲
9:30 PM – Rest
```

Each itinerary includes:
- Daily activities with specific timings
- Meal plans and local cuisine recommendations
- Sightseeing locations and descriptions
- Travel distances and duration
- Budget information
- Trip summary with highlights

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Session-based with role-based access control
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Deployment**: Vercel (serverless functions)
- **Environment**: dotenv for configuration

## Project Structure

```
├── api/
│   └── index.js              # Vercel serverless entry point
├── server/
│   ├── config/
│   │   └── db.js             # Database connection
│   ├── middleware/
│   │   └── auth.js           # Authentication & authorization middleware
│   ├── models/
│   │   ├── User.js           # User model with roles
│   │   └── Itinerary.js      # Enhanced itinerary model
│   ├── routes/
│   │   ├── authRoutes.js     # Authentication routes
│   │   ├── itineraryRoutes.js # Itinerary CRUD routes
│   │   └── userRoutes.js     # User management routes (superadmin)
│   ├── scripts/
│   │   └── initializeDB.js   # Database initialization script
│   ├── data/
│   │   └── sampleItinerary.js # Sample itinerary data
│   └── server.js             # Main server file
├── views/
│   ├── index.html            # Landing page
│   ├── login.html            # Login page
│   ├── register.html         # Registration page
│   └── dashboard.html        # Role-based dashboard
├── app.js                    # Application entry point
└── package.json              # Dependencies and scripts
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/sharnjeet21/mean_mini.git
   cd mean_mini
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   PORT=5000
   ```

4. **Initialize Database**
   ```bash
   npm run init-db
   ```
   This creates default users:
   - Superadmin: `superadmin@travel.com` / `superadmin123`
   - Admin: `admin@travel.com` / `admin123`
   - User: `user@travel.com` / `user123`

   **Note:** You can also register new users with any role using the registration form.

5. **Start the application**
5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration with role selection
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get current user profile

### Itineraries
- `GET /api/itinerary` - Get all itineraries (filtered by role)
- `GET /api/itinerary/:id` - Get single itinerary
- `POST /api/itinerary` - Create new itinerary (Admin/Superadmin only)
- `PUT /api/itinerary/:id` - Update itinerary (Admin/Superadmin only)
- `DELETE /api/itinerary/:id` - Delete itinerary (Admin/Superadmin only)
- `POST /api/itinerary/:id/book` - Book itinerary (Users only)
- `GET /api/itinerary/user/bookings` - Get user's bookings

### User Management (Superadmin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id/role` - Update user role
- `PUT /api/users/:id/status` - Toggle user active status
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/stats/overview` - Get user statistics

## Data Models

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required),
  role: String (enum: ['user', 'admin', 'superadmin'], default: 'user'),
  isActive: Boolean (default: true),
  createdAt: Date
}
```

### Itinerary
```javascript
{
  title: String (required),
  destination: String (required),
  startDate: Date (required),
  endDate: Date (required),
  duration: String (required), // e.g., "4 Days / 3 Nights"
  budget: Number (required, min: 0),
  description: String,
  dailyPlan: [{
    day: Number (required),
    title: String (required),
    activities: [{
      time: String,
      activity: String,
      description: String,
      location: String
    }]
  }],
  tripSummary: {
    totalDistance: String,
    travelTime: String,
    mealsIncluded: [String],
    highlights: [String]
  },
  createdBy: ObjectId (ref: 'User'),
  isActive: Boolean (default: true),
  bookings: [{
    userId: ObjectId (ref: 'User'),
    bookedAt: Date,
    status: String (enum: ['pending', 'confirmed', 'cancelled'])
  }],
  createdAt: Date
}
```

## Usage Examples

### Registration with Role Selection
Users can now select their role during registration:
- **User Role**: Browse and book travel itineraries
- **Admin Role**: Create and manage itineraries
- **Superadmin Role**: Full system access and user management

### Default Login Credentials
After running `npm run init-db`, use these credentials:

**Superadmin Access:**
- Email: `superadmin@travel.com`
- Password: `superadmin123`
- Can manage all users and system settings

**Admin Access:**
- Email: `admin@travel.com`
- Password: `admin123`
- Can create and manage itineraries

**User Access:**
- Email: `user@travel.com`
- Password: `user123`
- Can browse and book itineraries

### Creating an Itinerary (Admin/Superadmin)
```javascript
POST /api/itinerary
{
  "title": "Ludhiana to Kasauli - Hill Station Getaway",
  "destination": "Kasauli, Himachal Pradesh",
  "startDate": "2024-04-15",
  "endDate": "2024-04-18",
  "duration": "4 Days / 3 Nights",
  "budget": 15000,
  "description": "A perfect hill station getaway...",
  "dailyPlan": [
    {
      "day": 1,
      "title": "Ludhiana → Kasauli (Travel + Local Walk)",
      "activities": [
        {
          "time": "6:00 AM",
          "activity": "Departure from Ludhiana",
          "description": "Start journey by car/bus",
          "location": "Ludhiana"
        }
        // ... more activities
      ]
    }
    // ... more days
  ],
  "tripSummary": {
    "totalDistance": "~165 km one way",
    "travelTime": "4–5 hours",
    "mealsIncluded": ["Breakfast", "Lunch", "Dinner daily"],
    "highlights": ["Panoramic Himalayan views", "Colonial architecture"]
  }
}
```

### Booking an Itinerary (User)
```javascript
POST /api/itinerary/:id/book
// Requires user authentication
```

## Deployment

### Vercel Deployment

This application is configured for Vercel deployment with serverless functions.

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy to Vercel**
   ```bash
   vercel
   ```

3. **Environment Variables**
   Set the following environment variables in your Vercel dashboard:
   - `MONGO_URI`: Your MongoDB connection string

4. **Initialize Database**
   After deployment, run the initialization script to create default users:
   ```bash
   vercel env pull .env.local
   npm run init-db
   ```

### Manual Deployment

For other platforms, ensure you:
1. Set the `MONGO_URI` environment variableqoutes_app
2. Install dependencies with `npm install`
3. Start the application with `npm start`

## Development

### Adding New Features
1. Create new routes in `server/routes/`
2. Add corresponding models in `server/models/`
3. Update middleware for role-based access in `server/middleware/`
4. Update the frontend views in `views/`
5. Test with different user roles
6. Test locally before deployment

### Role-Based Development
- Always implement proper authorization checks
- Test endpoints with different user roles
- Ensure data isolation between user types
- Validate permissions on both frontend and backend

### Database Connection
The application uses MongoDB Atlas. Ensure your connection string includes:
- Username and password
- Database name
- Proper network access configuration

## Security Considerations

- Change default passwords in production
- Implement proper password hashing (bcrypt recommended)
- Use environment variables for sensitive data
- Implement rate limiting for API endpoints
- Add input validation and sanitization
- Use HTTPS in production
- Implement proper session management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License

## Support

For issues and questions, please create an issue in the repository or contact the development team.qoutes_app