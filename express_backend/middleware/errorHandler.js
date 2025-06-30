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

  // Log error for debugging
  console.error('Error:', err);

  // Supabase errors
  if (err.message && err.message.includes('supabase')) {
    error = {
      message: 'Database error occurred',
      statusCode: 500
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  // Rate limit errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429
    };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
