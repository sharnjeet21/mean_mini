const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Itinerary = require('../models/Itinerary');
const sampleItinerary = require('../data/sampleItinerary');

dotenv.config();

const initializeDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create superadmin user if doesn't exist
    const superadminExists = await User.findOne({ role: 'superadmin' });
    
    if (!superadminExists) {
      const superadmin = new User({
        name: 'Super Admin',
        email: 'superadmin@travel.com',
        password: 'superadmin123', // Change this in production
        role: 'superadmin'
      });
      await superadmin.save();
      console.log('Superadmin user created');
    }

    // Create sample admin user
    const adminExists = await User.findOne({ email: 'admin@travel.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'Travel Admin',
        email: 'admin@travel.com',
        password: 'admin123', // Change this in production
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created');
    }

    // Create sample regular user
    const userExists = await User.findOne({ email: 'user@travel.com' });
    if (!userExists) {
      const user = new User({
        name: 'Travel User',
        email: 'user@travel.com',
        password: 'user123', // Change this in production
        role: 'user'
      });
      await user.save();
      console.log('Regular user created');
    }

    // Create sample itinerary
    const itineraryExists = await Itinerary.findOne({ title: sampleItinerary.title });
    if (!itineraryExists) {
      const admin = await User.findOne({ role: 'admin' });
      if (admin) {
        const itinerary = new Itinerary({
          ...sampleItinerary,
          createdBy: admin._id
        });
        await itinerary.save();
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