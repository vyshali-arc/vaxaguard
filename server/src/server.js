require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { seedDatabase } = require('./utils/seedData');
const { startScheduler } = require('./jobs/scheduler');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect to Database (Atlas or automatic in-memory fallback)
    await connectDB();

    // 2. Auto-seed starter vaccine guidelines and demo data
    await seedDatabase(false);

    // 3. Start background due date scheduler
    startScheduler();

    // 4. Start HTTP Server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🛡️  VaxaGuard Full-Stack Server Running on Port ${PORT}`);
      console.log(`🔗 Local Web App: http://localhost:${PORT}`);
      console.log(`🏥 Health Check:  http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment:   ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('👋 VaxaGuard Server safely closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

startServer();
