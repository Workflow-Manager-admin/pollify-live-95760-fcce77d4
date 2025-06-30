/**
 * Global error handling middleware
 * Provides consistent error response format across the API
 */

// PUBLIC_INTERFACE
const errorHandler = (err, req, res, next) => {
  /**
   * Handle errors and send appropriate response
   * @param {Error} err - The error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  
  let error = { ...err };
  error.message = err.message;

  // Enhanced error logging
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Supabase/Database errors
  if (err.message && (err.message.includes('supabase') || err.message.includes('database'))) {
    error = {
      message: 'Database service temporarily unavailable. Please try again in a moment.',
      statusCode: 503,
      code: 'DATABASE_ERROR'
    };
  }

  // Supabase connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    error = {
      message: 'Database connection failed. Please try again later.',
      statusCode: 503,
      code: 'CONNECTION_ERROR'
    };
  }

  // PostgreSQL errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    if (err.code === '23505') { // Unique violation
      error = {
        message: 'Duplicate entry detected. This action has already been performed.',
        statusCode: 409,
        code: 'DUPLICATE_ENTRY'
      };
    } else {
      error = {
        message: 'Data constraint violation. Please check your input.',
        statusCode: 400,
        code: 'CONSTRAINT_VIOLATION'
      };
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message: `Validation failed: ${message}`,
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    };
  }

  // Express validator errors
  if (err.array && typeof err.array === 'function') {
    error = {
      message: 'Input validation failed',
      statusCode: 400,
      code: 'INPUT_VALIDATION_ERROR',
      errors: err.array()
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Authentication token is invalid',
      statusCode: 401,
      code: 'INVALID_TOKEN'
    };
  }

  // Token expired
  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Authentication token has expired',
      statusCode: 401,
      code: 'EXPIRED_TOKEN'
    };
  }

  // Rate limit errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests from this IP. Please try again in 15 minutes.',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  // Timeout errors
  if (err.code === 'ETIMEDOUT') {
    error = {
      message: 'Request timeout. Please try again.',
      statusCode: 408,
      code: 'TIMEOUT_ERROR'
    };
  }

  // Payload too large
  if (err.status === 413) {
    error = {
      message: 'Request payload too large',
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE'
    };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'An unexpected error occurred. Please try again later.';

  // Response object
  const errorResponse = {
    success: false,
    message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(error.errors && { errors: error.errors })
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      url: req.url,
      method: req.method,
      params: req.params,
      body: req.body
    };
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
