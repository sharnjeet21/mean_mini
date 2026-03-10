# Travel Itinerary App

A full-stack web application for managing travel itineraries built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JavaScript.

## Features

- **User Authentication**: Register and login functionality
- **Itinerary Management**: Create, view, and manage travel itineraries
- **Travel Planning**: Track destinations, dates, budget, and notes
- **Responsive Design**: Bootstrap-powered responsive UI
- **Cloud Deployment**: Configured for Vercel deployment

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Deployment**: Vercel (serverless functions)
- **Environment**: dotenv for configuration

## Project Structure

```
├── api/
│   └── index.js          # Vercel serverless entry point
├── server/
│   ├── config/
│   │   └── db.js         # Database connection
│   ├── models/
│   │   ├── User.js       # User model
│   │   └── Itinerary.js  # Itinerary model
│   ├── routes/
│   │   ├── authRoutes.js # Authentication routes
│   │   └── itineraryRoutes.js # Itinerary CRUD routes
│   └── server.js         # Main server file
├── views/
│   ├── index.html        # Landing page
│   ├── login.html        # Login page
│   ├── register.html     # Registration page
│   └── dashboard.html    # User dashboard
├── app.js               # Application entry point
└── package.json         # Dependencies and scripts
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

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login

### Itineraries
- `GET /api/itinerary` - Get all itineraries
- `POST /api/itinerary` - Create new itinerary
- `PUT /api/itinerary/:id` - Update itinerary
- `DELETE /api/itinerary/:id` - Delete itinerary

## Data Models

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required),
  createdAt: Date
}
```

### Itinerary
```javascript
{
  destination: String (required),
  startDate: Date (required),
  endDate: Date (required),
  budget: Number (required, min: 0),
  notes: String (optional),
  createdAt: Date
}
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

### Manual Deployment

For other platforms, ensure you:
1. Set the `MONGO_URI` environment variable
2. Install dependencies with `npm install`
3. Start the application with `npm start`

## Development

### Adding New Features
1. Create new routes in `server/routes/`
2. Add corresponding models in `server/models/`
3. Update the frontend views in `views/`
4. Test locally before deployment

### Database Connection
The application uses MongoDB Atlas. Ensure your connection string includes:
- Username and password
- Database name
- Proper network access configuration

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