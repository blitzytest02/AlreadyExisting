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
 * - The server-side diagnostic is bounded rather than wholesale: request headers are recorded
 *   from a fixed allow-list, so a credential a client sends in an Authorization header or a
 *   cookie is not copied into the log (CWE-532), and the stack - the one field that names
 *   absolute filesystem paths - is recorded in development only
 * - The response carries X-Content-Type-Options: nosniff, because its `path` field echoes the
 *   caller's own target: a request target carrying raw markup therefore appears in a JSON body,
 *   and nosniff is what stops a content-sniffing client treating that body as HTML
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

// The configuration boundary. Read here for one decision only - whether the diagnostic carries
// the error's stack - and read through this module rather than from process.env directly,
// because config/index.js is where every setting in this package is resolved and defaulted.
const config = require('../config');

/**
 * The request headers the diagnostic is allowed to record, by lower-case name.
 *
 * Express lower-cases incoming header names, so these are compared as written. The three chosen
 * are the ones that explain a failure without describing the caller: which host was addressed,
 * what the client said it was sending, and what it said it would accept.
 *
 * This is an allow-list on purpose. A deny-list of secret-looking names ('authorization',
 * 'cookie', 'x-api-key', ...) has to be right about every header a client might invent, and the
 * one it has not heard of is the one that reaches the log. An allow-list is wrong in the
 * harmless direction: a header nobody listed is simply absent from the diagnostic.
 *
 * @constant {string[]}
 */
const RECORDED_REQUEST_HEADERS = ['host', 'content-type', 'accept'];

/**
 * Copies the allow-listed headers out of a request's header set.
 *
 * Absent headers are omitted rather than recorded as undefined, so the logged object shows what
 * the request actually carried. The `headers` guard exists because this must never be the reason
 * an error response is not sent: a request object without headers would otherwise throw here,
 * inside the handler whose job is to answer when something has already gone wrong.
 *
 * @param {Object} [headers] - the request's header set, as Express assembled it
 * @returns {Object} a new object holding only the allow-listed headers that were present
 */
function recordedRequestHeaders(headers) {
    const recorded = {};

    if (!headers) {
        return recorded;
    }

    for (const name of RECORDED_REQUEST_HEADERS) {
        if (headers[name] !== undefined) {
            recorded[name] = headers[name];
        }
    }

    return recorded;
}

/**
 * Express Error Handling Middleware Function
 * 
 * This function implements the Express.js error handling middleware pattern by accepting
 * four parameters in the specific order required by Express (err, req, res, next).
 * It serves as the final destination for all application errors, including those
 * automatically forwarded from rejected promises in Express 5.
 * 
 * The middleware performs four primary functions:
 * 1. Comprehensive error logging for debugging and monitoring
 * 2. Setting appropriate HTTP status code for error responses
 * 3. Marking the response nosniff, so the target it echoes cannot be sniffed as HTML
 * 4. Sending standardized, generic error response to clients
 * 
 * Error Handling Flow:
 * 1. Receives error from Express framework (manual next(err) or automatic promise rejection)
 * 2. Logs the error and the request context needed to reproduce it - the request's headers are
 *    recorded from an allow-list, and the stack trace is included in development only
 * 3. Sets HTTP 500 Internal Server Error status code
 * 4. Sets X-Content-Type-Options: nosniff on the response
 * 5. Sends generic JSON error response to client
 * 6. Terminates request-response cycle (does not call next())
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
    // Step 1: Log the error details needed to diagnose the failure, and only those
    // This provides developers with:
    // - Error message and type
    // - Request context (target, method, allow-listed headers, params, query) for reproduction
    // - A timestamp and the client address
    // - The stack trace, in development only
    //
    // What it deliberately does not provide is the request's own credentials. The headers are
    // copied from a fixed allow-list rather than wholesale, because `req.headers` carries
    // whatever the client sent - `Authorization`, `Cookie`, an API key - and a diagnostic that
    // copies it out puts those values in a log file, which is the weakness CWE-532 describes.
    // A failure is reproducible without them.
    const diagnostic = {
        // Error details for debugging
        errorMessage: err.message,
        errorName: err.name,

        // Request context for error reproduction and analysis
        requestUrl: req.originalUrl || req.url,
        requestMethod: req.method,
        requestHeaders: recordedRequestHeaders(req.headers),
        requestParams: req.params,
        requestQuery: req.query,

        // Additional context for debugging
        timestamp: new Date().toISOString(),

        // IP address for tracking (with privacy considerations)
        clientIP: req.ip || req.connection.remoteAddress
    };

    // The stack is the field that names absolute filesystem paths - every frame carries the file
    // it came from - so it is recorded where those paths are the developer's own and withheld
    // where the log may travel further than the machine that wrote it. `errorName` and
    // `errorMessage` above identify the failure in every environment; the frames narrow it down
    // for whoever is fixing it. The check reads config.nodeEnv rather than process.env so this
    // module has one configuration source like every other module here.
    if (config.nodeEnv === 'development') {
        diagnostic.errorStack = err.stack;
    }

    logger.error('Unhandled application error occurred:', diagnostic);

    // Step 2: Set HTTP status code to 500 (Internal Server Error)
    // This indicates to the client that a server-side error occurred
    // Status 500 is the standard HTTP response code for generic server errors
    res.status(500);

    // Step 3: Tell the client not to second-guess the response's content type
    //
    // The envelope below hands the caller's own request target back in `path`, verbatim, which
    // is deliberate - it is what lets a caller correlate the failure with the request it sent.
    // The consequence is that a target carrying raw markup (`/boom?x=<script>...`) is echoed
    // into a response body. The body is `application/json`, so a conforming client renders
    // nothing; a legacy content-sniffing client, however, may disregard that content type,
    // decide the payload looks like HTML and execute the markup it finds. `nosniff` forecloses
    // that: it instructs the client to honour the declared type and never sniff a different one.
    //
    // This is the same header Express's own not-found response sends alongside its escaped
    // target, so the error path here is marked no more strictly than the framework marks its
    // own. It is one header on a response that is already a failure, and it is set here rather
    // than by any header middleware - none is a dependency of this tutorial, and none is added.
    res.set('X-Content-Type-Options', 'nosniff');

    // Step 4: Send standardized, generic JSON error response to client
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