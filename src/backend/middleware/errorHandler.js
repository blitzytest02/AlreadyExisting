/**
 * Centralized Error Handling Middleware for Express Application
 * 
 * This middleware serves as the final error handler in the Express.js middleware stack,
 * catching any errors that occur in route handlers or other middleware. With Express 5's
 * enhanced capabilities, this middleware automatically receives rejected promises from
 * async route handlers without requiring explicit error forwarding.
 * 
 * Key Features:
 * - Catches all application errors including unhandled promise rejections
 * - Provides comprehensive error logging for debugging and monitoring
 * - Sends standardized, generic JSON responses to prevent information leakage
 * - Serves as the terminal middleware in the error handling chain
 * - Leverages Express 5's automatic promise rejection forwarding
 * 
 * Security Considerations:
 * - Generic error messages prevent exposure of sensitive implementation details
 * - Detailed error information is logged server-side only
 * - No stack traces or internal error details sent to clients
 * 
 * Requirements Addressed:
 * - F-001-RQ-004: Graceful error handling for server startup and runtime errors
 * - F-003-RQ-004: Error handling for request processing and routing failures
 * - Promise-Based Error Handling: Express 5 automatic error forwarding destination
 * - Error Handling Patterns: Centralized error handling with standardized responses
 * 
 * Technical Implementation:
 * - Express 5 error handling middleware signature (err, req, res, next)
 * - Terminates the request-response cycle with appropriate error response
 * - Utilizes centralized logging utility for consistent error tracking
 * - Implements defensive programming practices for robust error handling
 */

// Import the logging utility for error tracking and debugging
// Logger provides environment-aware logging with proper formatting
const { logger } = require('../utils/logger');

/**
 * Express Error Handling Middleware Function
 * 
 * This function implements the Express.js error handling middleware pattern by accepting
 * four parameters in the specific order required by Express (err, req, res, next).
 * It serves as the final destination for all application errors, including those
 * automatically forwarded from rejected promises in Express 5.
 * 
 * The middleware performs three primary functions:
 * 1. Comprehensive error logging for debugging and monitoring
 * 2. Setting appropriate HTTP status code for error responses
 * 3. Sending standardized, generic error response to clients
 * 
 * Error Handling Flow:
 * 1. Receives error from Express framework (manual next(err) or automatic promise rejection)
 * 2. Logs detailed error information including stack trace for debugging
 * 3. Sets HTTP 500 Internal Server Error status code
 * 4. Sends generic JSON error response to client
 * 5. Terminates request-response cycle (does not call next())
 * 
 * @function errorHandler
 * @param {Error} err - The error object that was thrown or passed to next(). Contains
 *                      error message, stack trace, and other error-specific properties.
 *                      In Express 5, this can come from rejected promises automatically.
 * @param {Object} req - Express request object containing request information including
 *                       URL, headers, parameters, body, and other request metadata.
 *                       Used for context in error logging and debugging.
 * @param {Object} res - Express response object used to send the HTTP response back
 *                       to the client. Provides methods for setting status codes,
 *                       headers, and response body content.
 * @param {Function} next - Express next function for passing control to the next middleware.
 *                          Not called in this error handler as it terminates the chain.
 * @returns {void} This function does not return a value as it terminates the
 *                 request-response cycle by sending an error response.
 * 
 * @example
 * // Usage in Express application setup (app.js)
 * const { errorHandler } = require('./middleware/errorHandler');
 * app.use(errorHandler); // Must be the last middleware in the stack
 * 
 * @example
 * // Automatic handling of promise rejections in Express 5
 * app.get('/example', async (req, res) => {
 *     // If fetchData() throws an error, Express 5 automatically forwards it to errorHandler
 *     const data = await fetchData();
 *     res.json(data);
 * });
 * 
 * @example
 * // Manual error forwarding (traditional approach still supported)
 * app.get('/manual', (req, res, next) => {
 *     try {
 *         throw new Error('Something went wrong');
 *     } catch (error) {
 *         next(error); // Forwards to errorHandler
 *     }
 * });
 */
function errorHandler(err, req, res, next) {
    // Step 1: Log comprehensive error details for debugging and monitoring
    // This provides developers with detailed error information including:
    // - Error message and type
    // - Complete stack trace for debugging
    // - Request context (URL, method, headers) for reproduction
    // - Timestamp and environment information (handled by logger utility)
    logger.error('Unhandled application error occurred:', {
        // Error details for debugging
        errorMessage: err.message,
        errorStack: err.stack,
        errorName: err.name,
        
        // Request context for error reproduction and analysis
        requestUrl: req.originalUrl || req.url,
        requestMethod: req.method,
        requestHeaders: req.headers,
        requestParams: req.params,
        requestQuery: req.query,
        
        // Additional context for debugging
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        
        // IP address for tracking (with privacy considerations)
        clientIP: req.ip || req.connection.remoteAddress
    });

    // Step 2: Set HTTP status code to 500 (Internal Server Error)
    // This indicates to the client that a server-side error occurred
    // Status 500 is the standard HTTP response code for generic server errors
    res.status(500);

    // Step 3: Send standardized, generic JSON error response to client
    // The response is intentionally generic to prevent information disclosure
    // that could expose sensitive implementation details or security vulnerabilities
    // 
    // Response format follows REST API conventions with consistent error structure
    res.json({
        // Generic error message that doesn't reveal implementation details
        error: 'Internal Server Error',
        
        // HTTP status code for programmatic error handling by clients
        status: 500,
        
        // Timestamp for client-side logging and debugging (optional)
        timestamp: new Date().toISOString(),
        
        // Request path for client-side error correlation (safe to expose)
        path: req.originalUrl || req.url
    });

    // Note: The 'next' function is intentionally NOT called here
    // This middleware terminates the request-response cycle by sending the error response
    // Calling next() would attempt to pass control to the next middleware, which
    // would result in an error since the response has already been sent
    // 
    // In Express error handling middleware, next() is only called when:
    // - Passing the error to another error handler
    // - Falling back to the default Express error handler
    // Since this is the final error handler, we terminate the cycle here
}

/**
 * Export the error handler function for use in the Express application
 * 
 * This export allows the error handler to be imported and used as middleware
 * in the main Express application. The middleware should be registered as the
 * final middleware in the application stack to catch all errors that occur
 * during request processing.
 * 
 * Export Structure:
 * - Named export for explicit importing and clear dependency management
 * - Function export maintains compatibility with Express middleware patterns
 * - Supports both destructured and direct import patterns
 * 
 * Usage Patterns:
 * - Destructured import: const { errorHandler } = require('./middleware/errorHandler');
 * - Direct import: const errorHandler = require('./middleware/errorHandler').errorHandler;
 * 
 * Integration in Express Application:
 * 1. Import the errorHandler function
 * 2. Register as the final middleware using app.use(errorHandler)
 * 3. Ensure it's placed after all routes and other middleware
 * 4. Express will automatically forward errors to this handler
 * 
 * Express 5 Benefits:
 * - Automatic promise rejection forwarding reduces boilerplate error handling
 * - Enhanced error propagation from async route handlers
 * - Improved error handling consistency across the application
 * - Better debugging capabilities with comprehensive error information
 * 
 * @module errorHandler
 * @type {Function}
 * @exports errorHandler
 */
module.exports = { errorHandler };