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
 * - Provides error logging for debugging and monitoring, redacted so the log
 *   record discloses no more than it needs to
 * - Sends standardized, generic JSON responses to prevent information leakage
 * - Serves as the terminal middleware in the error handling chain
 * - Leverages Express 5's automatic promise rejection forwarding
 * 
 * Security Considerations:
 * - Generic error messages prevent exposure of sensitive implementation details
 * - Detailed error information is logged server-side only
 * - No stack traces or internal error details sent to clients
 * - The server-side log record is held to the same least-privilege standard as
 *   the client response: request headers are recorded through a redacting
 *   allow-list, so no credential-bearing header value reaches the log, and the
 *   stack trace is gated to the development environment, so absolute host
 *   filesystem paths are not written to a production log
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

// Import the application configuration to read the current environment.
// config is the single process.env reader in this application, so gating log
// detail on the environment needs no direct process.env access and no new
// dependency here. The value is read at invocation time rather than captured
// at module load, so a change to config.nodeEnv is honoured immediately.
const config = require('../config');

/**
 * Request header names whose values are safe to record verbatim in the log
 *
 * Header values are caller-controlled and routinely carry credentials, so the
 * log record allow-lists rather than deny-lists them. A deny-list of the
 * headers known today (authorization, cookie, proxy-authorization, x-api-key)
 * still writes out the value of any credential header nobody enumerated -
 * x-auth-token, x-amz-security-token or a bespoke one - whereas an allow-list
 * is closed by default: a header absent from this list can never contribute
 * its value to a log line, whoever invented it.
 *
 * The five names here are the request metadata actually useful for reproducing
 * a server error, and none of them is a credential carrier.
 *
 * Names are compared lower-cased. Node lower-cases incoming header names on
 * req.headers already; the normalisation also covers a hand-built request
 * object, such as the one a unit test supplies.
 *
 * @constant {string[]}
 */
const LOGGABLE_HEADER_NAMES = [
    'host',
    'user-agent',
    'accept',
    'content-type',
    'content-length'
];

/**
 * Substituted for the value of any request header outside the allow-list
 *
 * The header NAME is still recorded. Replacing only the value keeps the record
 * useful for debugging - an operator can see which headers the caller sent -
 * without the value itself ever reaching the log.
 *
 * @constant {string}
 */
const REDACTED_VALUE = '[REDACTED]';

/**
 * Substituted for the stack trace outside the development environment
 *
 * A V8 stack trace names an absolute filesystem path for every frame, which
 * discloses the deployment's directory layout and dependency locations to
 * anyone who can read the log. Recording an explicit marker rather than
 * omitting the field keeps the record's shape identical in every environment,
 * so a reader can tell the stack was withheld deliberately rather than lost.
 *
 * @constant {string}
 */
const STACK_OMITTED_VALUE = '[stack omitted outside development]';

/**
 * Builds the loggable view of a request's headers
 *
 * Returns a NEW object rather than mutating the request: req.headers is live
 * request state that later middleware and the response path may still read,
 * so redaction must not be applied in place.
 *
 * @function sanitizeRequestHeaders
 * @param {Object} headers - The request's header bag, normally req.headers.
 *                           A missing or non-object value is tolerated.
 * @returns {Object} A new object carrying every header name from the input,
 *                   with allow-listed values preserved and every other value
 *                   replaced by REDACTED_VALUE. An empty object when the input
 *                   is not a usable header bag.
 *
 * @example
 * sanitizeRequestHeaders({ host: 'localhost:3000', authorization: 'Bearer x' });
 * // => { host: 'localhost:3000', authorization: '[REDACTED]' }
 */
function sanitizeRequestHeaders(headers) {
    // This middleware is the terminal error handler, so it must never throw
    // itself - an error raised here has nowhere left to be handled. A request
    // stand-in without a header bag would make Object.keys throw, so guard it.
    if (!headers || typeof headers !== 'object') {
        return {};
    }

    const sanitized = {};

    for (const name of Object.keys(headers)) {
        sanitized[name] = LOGGABLE_HEADER_NAMES.includes(name.toLowerCase())
            ? headers[name]
            : REDACTED_VALUE;
    }

    return sanitized;
}

/**
 * Express Error Handling Middleware Function
 * 
 * This function implements the Express.js error handling middleware pattern by accepting
 * four parameters in the specific order required by Express (err, req, res, next).
 * It serves as the final destination for all application errors, including those
 * automatically forwarded from rejected promises in Express 5.
 * 
 * The middleware performs three primary functions:
 * 1. Error logging for debugging and monitoring, redacted for least privilege
 * 2. Setting appropriate HTTP status code for error responses
 * 3. Sending standardized, generic error response to clients
 * 
 * Error Handling Flow:
 * 1. Receives error from Express framework (manual next(err) or automatic promise rejection)
 * 2. Logs error information - the stack trace in development only, and request
 *    headers through a redacting allow-list
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
    // Step 1: Log error details for debugging and monitoring
    // This provides developers with detailed error information including:
    // - Error message and type
    // - The stack trace, in development only - see STACK_OMITTED_VALUE
    // - Request context (URL, method, redacted headers) for reproduction
    // - Timestamp and environment information (handled by logger utility)
    //
    // The record is deliberately narrower than everything available on the
    // request. A log is read by more people, and retained longer, than a
    // response is, so the two disclosure risks the request carries are closed
    // here: credential-bearing header values, and the absolute host filesystem
    // paths every stack frame names.
    logger.error('Unhandled application error occurred:', {
        // Error details for debugging. The message and name are authored by the
        // application rather than derived from the environment, so they carry
        // no filesystem path and remain available in every environment - they
        // are what makes a production error diagnosable at all once the stack
        // is withheld.
        errorMessage: err.message,

        // The stack names an absolute path for every frame, so it is recorded
        // only in development. Outside development the marker records that it
        // was withheld on purpose.
        errorStack:
            config.nodeEnv === 'development' ? err.stack : STACK_OMITTED_VALUE,
        errorName: err.name,
        
        // Request context for error reproduction and analysis
        requestUrl: req.originalUrl || req.url,
        requestMethod: req.method,

        // Headers pass through the redacting allow-list: every header name the
        // caller sent is recorded, but only an allow-listed value is
        // reproduced. Authorization, Cookie and any other credential carrier
        // is recorded as '[REDACTED]'.
        requestHeaders: sanitizeRequestHeaders(req.headers),
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