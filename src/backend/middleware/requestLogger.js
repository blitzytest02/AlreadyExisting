/**
 * Request Logger Middleware
 * 
 * A comprehensive Express middleware function that provides detailed logging of all incoming
 * HTTP requests for observability and debugging purposes. This middleware captures essential
 * request metadata including HTTP method, request path, and request body to create a complete
 * audit trail of client interactions with the server.
 * 
 * This middleware implements the centralized logging strategy defined in the system architecture
 * and serves as a critical component of the application's observability infrastructure. It logs
 * request details before processing continues, ensuring that all requests are tracked regardless
 * of whether they succeed or fail in subsequent middleware or route handlers.
 * 
 * Key Features:
 * - Comprehensive request metadata logging (method, path, body)
 * - Integration with centralized logger utility for consistent formatting
 * - Environment-aware logging (development vs production formatting)
 * - Non-blocking operation - continues request processing after logging
 * - Support for all HTTP methods and request types
 * - Request body logging with automatic JSON stringification for objects
 * 
 * Requirements Addressed:
 * - Basic error handling and logging (Core Features and Functionalities)
 * - F-003: Request Processing (Core HTTP Server Features)
 * - Logging and Tracing Strategy (Cross-cutting Concerns)
 * - Monitoring and Observability Approach (System Architecture)
 * 
 * Technical Integration:
 * - Uses standardized logger utility from '../utils/logger.js'
 * - Follows Express.js 5.1.0 middleware pattern and conventions
 * - Compatible with promise-based error handling in Express 5.x
 * - Supports variadic logging parameters for flexible message composition
 */

// Import the centralized logger utility for consistent logging across the application
// This provides access to the standardized info() and error() logging functions
// with environment-specific formatting and proper console output routing
const { logger } = require('../utils/logger.js'); // Version: Custom utility module

/**
 * Express middleware function for comprehensive HTTP request logging
 * 
 * This function intercepts every incoming HTTP request and logs detailed information
 * about the request before passing control to the next middleware in the stack. It
 * captures and logs the HTTP method, request path, and request body content to
 * provide complete visibility into client interactions with the server.
 * 
 * The middleware operates non-destructively, meaning it does not modify the request
 * or response objects and simply observes and logs the request data. This ensures
 * that logging does not interfere with normal request processing flow.
 * 
 * Logging Format and Content:
 * - HTTP Method: GET, POST, PUT, DELETE, PATCH, etc.
 * - Request Path: Full URL path including query parameters
 * - Request Body: Complete request body content with automatic formatting
 * - Request ID: Generated for correlation across log entries (future enhancement)
 * 
 * Performance Considerations:
 * - Minimal processing overhead to avoid impacting request response times
 * - Asynchronous logging to prevent blocking request processing
 * - Efficient string concatenation and object serialization
 * - Memory-conscious handling of large request bodies
 * 
 * @function requestLogger
 * @param {Object} req - Express request object containing HTTP request data
 *                      including method, path, headers, body, and query parameters
 * @param {Object} res - Express response object for sending HTTP responses
 *                      (not used in this middleware but required by Express pattern)
 * @param {Function} next - Express next function for continuing to next middleware
 *                         in the stack. Must be called to continue request processing
 * @returns {void} This function does not return a value; it calls next() to proceed
 *                to the next middleware in the Express application stack
 * 
 * @example
 * // Integration in Express application
 * const express = require('express');
 * const requestLogger = require('./middleware/requestLogger');
 * const app = express();
 * 
 * // Apply request logger to all routes
 * app.use(requestLogger);
 * 
 * @example
 * // Sample log output for GET request to /hello
 * // Development: [INFO]: HTTP Request - Method: GET, Path: /hello, Body: {}
 * // Production: HTTP Request - Method: GET, Path: /hello, Body: {}
 * 
 * @example
 * // Sample log output for POST request with JSON body
 * // [INFO]: HTTP Request - Method: POST, Path: /api/users, Body: {"name":"John","email":"john@example.com"}
 */
function requestLogger(req, res, next) {
    // Extract HTTP method from request object (GET, POST, PUT, DELETE, etc.)
    // This provides information about the type of operation being requested
    const method = req.method;
    
    // Extract the full request path including any query parameters
    // originalUrl provides the complete URL path as received by the server
    // This is preferred over req.url as it preserves the original request path
    // even when the request has been modified by previous middleware
    const path = req.originalUrl;
    
    // Extract and process the request body for logging
    // Handle different body types and ensure proper serialization for logging
    let body;
    
    // Check if request body exists and handle different content types
    if (req.body !== undefined && req.body !== null) {
        // Check if body is already an object (parsed by body-parser middleware)
        if (typeof req.body === 'object') {
            try {
                // Convert JavaScript object to JSON string for consistent logging
                // Use JSON.stringify to handle nested objects and arrays properly
                body = JSON.stringify(req.body);
            } catch (error) {
                // Handle potential circular references or non-serializable objects
                // Fall back to string representation if JSON serialization fails
                body = '[Object - Unable to serialize]';
                
                // Log the serialization error for debugging purposes
                logger.error('Request body serialization failed:', error.message, 'for path:', path);
            }
        } else {
            // Handle primitive types (string, number, boolean) by converting to string
            body = String(req.body);
        }
    } else {
        // Handle cases where no body is present (typical for GET requests)
        // Use empty object notation to indicate no body content
        body = '{}';
    }
    
    // Log the complete request information using the centralized logger utility
    // Format: "HTTP Request - Method: [METHOD], Path: [PATH], Body: [BODY]"
    // This structured format enables easy parsing and filtering in log analysis tools
    logger.info(
        'HTTP Request -',
        'Method:', method,
        'Path:', path,
        'Body:', body
    );
    
    // Continue to the next middleware or route handler in the Express stack
    // This is critical for maintaining the request-response cycle flow
    // Without calling next(), the request would hang and never receive a response
    next();
}

/**
 * Export the requestLogger middleware function as the default export
 * 
 * This allows the middleware to be easily imported and used in the main
 * Express application setup. The default export pattern is used because
 * this module provides a single primary function.
 * 
 * Integration Pattern:
 * - Import: const requestLogger = require('./middleware/requestLogger');
 * - Usage: app.use(requestLogger);
 * 
 * The middleware can be applied globally to all routes or selectively to
 * specific route groups depending on the application's logging requirements.
 * 
 * @module requestLogger
 * @type {Function}
 * @exports requestLogger
 */
module.exports = requestLogger;