require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import route modules
const pollRoutes = require('./routes/polls');
const healthRoutes = require('./routes/health');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const voteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit voting to 20 requests per 5 minutes per IP
  message: {
    success: false,
    message: 'Too many vote attempts. Please try again in 5 minutes.',
    code: 'VOTE_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pollCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit poll creation to 10 per hour per IP
  message: {
    success: false,
    message: 'Too many polls created. Please wait 1 hour before creating more polls.',
    code: 'POLL_CREATION_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Trust proxy for proper IP detection
app.set('trust proxy', 1);

// Request parsing middleware with enhanced security
app.use(express.json({ 
  limit: '1mb',
  strict: true,
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON payload',
        code: 'INVALID_JSON',
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid JSON');
    }
  }
}));

// API routes with specific rate limiting
app.use('/api/health', healthRoutes);
app.use('/api/polls', pollCreationLimiter, pollRoutes);

// Apply vote-specific rate limiting to vote endpoints
app.use('/api/polls/:slug/vote', voteLimiter);

// Swagger documentation setup
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Pollify API',
      version: '1.0.0',
      description: 'REST API for Pollify polling application',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${port}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

// Serve OpenAPI JSON
app.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// Import Supabase connection test
const { testConnection } = require('./config/supabase');

// Start server with database connection test
const startServer = async () => {
  try {
    // Test database connection on startup
    console.log('Testing database connection...');
    const dbHealthy = await testConnection();
    
    if (!dbHealthy) {
      console.error('❌ Database connection failed. Server starting anyway...');
    } else {
      console.log('✅ Database connection successful');
    }

    const server = app.listen(port, () => {
      console.log(`🚀 Pollify Express server running on port ${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/docs`);
      console.log(`📋 OpenAPI JSON: http://localhost:${port}/openapi.json`);
      console.log(`🏥 Health Check: http://localhost:${port}/api/health`);
      console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('📤 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('📤 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
