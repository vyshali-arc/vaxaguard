const mongoose = require('mongoose');

let memoryServer = null;

async function connectDB() {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || mongoUri.trim() === '') {
      console.log('ℹ️  No MONGODB_URI detected in environment.');
      console.log('🚀 Initializing in-memory MongoDB server for zero-setup local execution...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        mongoUri = memoryServer.getUri();
        console.log(`✅ In-memory MongoDB started at: ${mongoUri}`);
      } catch (memErr) {
        console.warn('⚠️  Could not start in-memory MongoDB, falling back to localhost:27017/vaxaguard');
        mongoUri = 'mongodb://127.0.0.1:27017/vaxaguard';
      }
    }

    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(mongoUri, {
      // Modern mongoose connection options
    });

    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // In production or tests, handle appropriately
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
}

module.exports = { connectDB, disconnectDB };
