const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Itinerary = require('../models/Itinerary');
const sampleItinerary = require('../data/sampleItinerary');

dotenv.config();

// Task 9: Hash passwords with bcrypt before seeding
const hashPassword = async (plain) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

const initializeDB = async () => {
  try {
    // Task 6: Connect using Mongoose with options
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Superadmin
    const superadminExists = await User.findOne({ role: 'superadmin' });
    if (!superadminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'superadmin@travel.com',
        password: await hashPassword('superadmin123'),
        role: 'superadmin',
      });
      console.log('Superadmin created: superadmin@travel.com / superadmin123');
    }

    // Admin
    const adminExists = await User.findOne({ email: 'admin@travel.com' });
    if (!adminExists) {
      await User.create({
        name: 'Travel Admin',
        email: 'admin@travel.com',
        password: await hashPassword('admin123'),
        role: 'admin',
      });
      console.log('Admin created: admin@travel.com / admin123');
    }

    // Regular user
    const userExists = await User.findOne({ email: 'user@travel.com' });
    if (!userExists) {
      await User.create({
        name: 'Travel User',
        email: 'user@travel.com',
        password: await hashPassword('user123'),
        role: 'user',
      });
      console.log('User created: user@travel.com / user123');
    }

    // Sample itinerary
    const itineraryExists = await Itinerary.findOne({ title: sampleItinerary.title });
    if (!itineraryExists) {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        await Itinerary.create({ ...sampleItinerary, createdBy: admin._id });
        console.log('Sample itinerary created');
      }
    }

    console.log('Database initialization completed');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

initializeDB();
