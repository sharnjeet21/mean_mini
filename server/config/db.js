const mongoose = require('mongoose');

// Task 6: Connect Express application to MongoDB using Mongoose
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,        // keep up to 10 connections open
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.warn('Warning: Running without MongoDB. Static pages will still be served.');
    // process.exit(1); // Temporarily disabled so static HTML pages can be served for demo
  }
};

module.exports = connectDB;
