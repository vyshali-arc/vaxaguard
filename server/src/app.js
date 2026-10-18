const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const dependentRoutes = require('./routes/dependent.routes');
const vaccineRoutes = require('./routes/vaccine.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const recordRoutes = require('./routes/record.routes');
const organizationRoutes = require('./routes/organization.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const documentRoutes = require('./routes/document.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Security HTTP headers with CSP configured for modern CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.tailwindcss.com",
          "https://unpkg.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.tailwindcss.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://images.unsplash.com"
        ],
        connectSrc: [
          "'self'",
          "*"
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// REST API routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dependents', dependentRoutes);
app.use('/api/vaccines', vaccineRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);

// Serve static frontend files
const clientPath = path.join(__dirname, '../../client');
app.use(express.static(clientPath));

// Fallback: send index.html for unrecognized routes (SPA friendly)
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Central error handler
app.use(errorHandler);

module.exports = app;
