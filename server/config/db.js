const mongoose = require('mongoose');

// Task 6: Connect Express application to MongoDB using Mongoose
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn('MONGO_URI is missing. Database-backed API routes will be unavailable.');
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,        // keep up to 10 connections open
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.warn('Warning: Running without MongoDB. Static pages will still be served.');
    return null;
  }
};

module.exports = connectDB;
