const mongoose = require('mongoose');
const dns = require('node:dns');

mongoose.set('bufferCommands', false);

let memoryServer = null;

const connectionOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function connect(uri) {
  await mongoose.connect(uri, connectionOptions);
  return mongoose.connection;
}

async function connectAtlas(mongoUri) {
  try {
    return await connect(mongoUri);
  } catch (error) {
    if (!String(error.message).includes('querySrv')) throw error;

    console.warn('MongoDB SRV lookup failed; retrying with public DNS resolvers.');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    await mongoose.disconnect().catch(() => {});
    return connect(mongoUri);
  }
}

async function connectDevelopmentDatabase() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const { seedDemoData } = require('../scripts/seedDemoData');
  memoryServer = await MongoMemoryServer.create({
    instance: { dbName: 'mean-mini-dev' },
  });
  const connection = await connect(memoryServer.getUri());
  await seedDemoData({
    connect: false,
    log: (message) => console.log(`[dev-seed] ${message}`),
  });
  return connection;
}

// Task 6: Connect Express application to MongoDB using Mongoose
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!mongoUri && isProduction) {
    console.warn('MONGO_URI is missing. Database-backed API routes will be unavailable.');
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    if (!mongoUri) throw new Error('MONGO_URI is not configured.');
    await connectAtlas(mongoUri);
    console.log('MongoDB Atlas connected');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (isProduction) return null;

    try {
      await mongoose.disconnect().catch(() => {});
      await connectDevelopmentDatabase();
      console.warn('Using an ephemeral local MongoDB for development.');
      console.warn('Local development data will be cleared when the server stops.');
      return mongoose.connection;
    } catch (fallbackError) {
      console.error('Development database fallback error:', fallbackError.message);
      console.warn('Warning: Running without MongoDB. Database-backed routes will return 503.');
      return null;
    }
  }
};

connectDB.stopDevelopmentDatabase = async () => {
  if (!memoryServer) return;
  await memoryServer.stop();
  memoryServer = null;
};

module.exports = connectDB;
