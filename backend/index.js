import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: join(__dirname, '.env') });

// Now import other modules that depend on environment variables
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Seafood Purchasing API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint for frontend connection
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Connection successful! Backend is ready.',
    serverTime: new Date().toISOString()
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Shipment endpoints (placeholder for future implementation)
app.get('/api/shipments', (req, res) => {
  res.json({
    message: 'Shipments endpoint ready for implementation',
    shipments: []
  });
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Seafood Purchasing Backend Server Started
📍 Running on: http://localhost:${PORT}
🔗 API Health: http://localhost:${PORT}/api/health
🌊 Frontend expected at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
📝 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});