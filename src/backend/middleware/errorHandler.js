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
 * - Logs a redacted error record for debugging and monitoring
 * - Sends standardized, generic JSON responses to prevent information leakage
 * - Serves as the terminal middleware in the error handling chain
 * - Delegates to Express's default handler when the response has already started
 * - Leverages Express 5's automatic promise rejection forwarding
 * 
 * Security Considerations:
 * - Generic error messages prevent exposure of sensitive implementation details
 * - No stack traces or internal error details sent to clients. The response's
 *   'path' field is the request path with every query value masked, so a URL
 *   that carried a credential is not reflected back to the caller
 * - The log record is minimized before it is written. Nothing the caller supplied
 *   is recorded: the query string is dropped whole, request headers are reduced to
 *   an allowlist of protocol metadata, query and route parameters to a count, the
 *   User-Agent to a presence marker, and the client address to its network prefix.
 *   Names are dropped with values, because a name channel leaks as readily
 * - The stack trace exposes absolute filesystem paths and internal structure, so
 *   it is withheld when NODE_ENV is 'production' and written otherwise
 * - What remains in the record - the error message and name, the request method,
 *   the pathname, field counts and the address prefix - is operator-facing
 *   diagnostic material. It is not safe by virtue of sitting in a log: wherever
 *   these logs are shipped or stored, access has to be controlled and retention
 *   bounded under the deployment's own policy
 * 
 * Requirements Addressed:
 * - F-001-RQ-004: Graceful error handling for server startup and runtime errors
 * - F-003-RQ-004: Error handling for request processing and routing failures
 * - Promise-Based Error Handling: Express 5 automatic error forwarding destination
 * - Error Handling Patterns: Centralized error handling with standardized responses
 * 
 * Technical Implementation:
 * - Express 5 error handling middleware signature (err, req, res, next)
 * - Terminates the request-response cycle with an appropriate error response,
 *   or delegates with next(err) when the response has already started
 * - Utilizes centralized logging utility for consistent error tracking
 * - Implements defensive programming practices for robust error handling
 */

// Import the logging utility for error tracking and debugging
// Logger provides environment-aware logging with proper formatting
const { logger } = require('../utils/logger');

// Import the application configuration, the only reader of process.env, to
// decide whether a stack trace may be written to the log in this environment
const config = require('../config');

/**
 * Token substituted for every value the error record must not carry
 * 
 * A single fixed marker, rather than a truncated or hashed value, keeps the
 * record readable and makes the redaction obvious to whoever reads the log.
 * 
 * @constant {string}
 */
const REDACTED = '[REDACTED]';

/**
 * Reserved key under which counts of dropped fields are recorded
 * 
 * Square brackets are not legal in an HTTP header field name, so this key
 * cannot collide with a header a caller sent, and it is distinctive enough to
 * be unmistakable for a query or route parameter name.
 * 
 * @constant {string}
 */
const REDACTED_COUNT_KEY = '[redacted]';

/**
 * Request headers whose values may be recorded, as an explicit allowlist
 * 
 * An allowlist rather than a denylist, deliberately: a denylist keyed on names
 * such as 'authorization' or 'cookie' misses the next credential header a
 * client invents ('x-auth', 'x-customer-data'), and a header name is itself
 * caller-controlled, so an unknown name is dropped along with its value. What
 * remains is protocol metadata the server needs to interpret the request.
 * 
 * @constant {Set<string>}
 */
const LOGGABLE_HEADERS = new Set([
    'host',
    'connection',
    'content-type',
    'content-length',
    'accept',
    'accept-encoding',
    'accept-language',
    'cache-control'
]);

/**
 * Builds the log-safe request path from the URL as received by the server
 * 
 * The pathname is kept verbatim - it identifies the route, which the server
 * defines - and the query string is dropped in full, names included, because a
 * parameter name is as caller-controlled as its value. The presence of a query
 * string is recorded as the single marker '?[REDACTED]'. The result is used for
 * the log record and for the 'path' field of the client response, so the two
 * always agree and neither reflects caller-supplied text.
 * 
 * @function sanitizeRequestPath
 * @param {string} rawUrl - The URL as received, including any query string
 * @returns {string} The pathname alone, or the pathname followed by the
 *                   '?[REDACTED]' marker when parameters were present
 */
function sanitizeRequestPath(rawUrl) {
    // String() keeps this total: an error raised before Express populated the
    // request must not turn into a second error inside the error handler.
    const rawPath = String(rawUrl);
    const separatorIndex = rawPath.indexOf('?');

    // No query string, so the URL carries nothing the caller supplied.
    if (separatorIndex === -1) {
        return rawPath;
    }

    const pathname = rawPath.slice(0, separatorIndex);

    // A trailing '?' with nothing after it carried no parameters at all.
    if (separatorIndex === rawPath.length - 1) {
        return pathname;
    }

    return `${pathname}?${REDACTED}`;
}

/**
 * Projects request headers onto the allowlisted subset, counting the rest
 * 
 * Allowlisted headers are recorded with their values. Every other header is
 * dropped entirely - name and value - and contributes only to a count under
 * REDACTED_COUNT_KEY, so a reader learns how much was withheld without
 * learning any of it. The copy is a new object; the request is never mutated.
 * 
 * @function redactHeaders
 * @param {Object} headers - Express's req.headers. A value that is not an
 *                           object, which is what an error raised before
 *                           routing can leave behind, yields an empty object
 * @returns {Object} The allowlisted headers, plus a count of those dropped
 */
function redactHeaders(headers) {
    if (typeof headers !== 'object' || headers === null) {
        return {};
    }

    return Object.keys(headers).reduce((recorded, name) => {
        if (LOGGABLE_HEADERS.has(name.toLowerCase())) {
            recorded[name] = headers[name];
        } else {
            recorded[REDACTED_COUNT_KEY] =
                (recorded[REDACTED_COUNT_KEY] || 0) + 1;
        }

        return recorded;
    }, {});
}

/**
 * Reduces caller-supplied name/value pairs to a count of how many there were
 * 
 * Used for req.query and req.params. Neither names nor values are recorded:
 * query names are chosen by the caller, and dropping route parameter names
 * alongside them keeps one rule for both (this application defines no route
 * parameters, so nothing diagnostic is lost). The count still distinguishes a
 * request that carried parameters from one that did not.
 * 
 * @function summarizeFieldCount
 * @param {Object} fields - Express's req.query or req.params
 * @returns {Object} An empty object when there was nothing to record, or the
 *                   count of fields under REDACTED_COUNT_KEY
 */
function summarizeFieldCount(fields) {
    if (typeof fields !== 'object' || fields === null) {
        return {};
    }

    const fieldCount = Object.keys(fields).length;

    return fieldCount === 0 ? {} : { [REDACTED_COUNT_KEY]: fieldCount };
}

/**
 * Records whether a User-Agent header was present, never what it said
 * 
 * The header is a caller-supplied string, so it can carry anything a client
 * chooses to put in it and cannot be recorded verbatim. Its presence is still
 * worth knowing: a request without one is unusual and often automated.
 * 
 * @function describeUserAgent
 * @param {string} [userAgent] - The value of the User-Agent request header
 * @returns {string} The redaction token when a value was present, or the fixed
 *                   marker '[absent]' when the header was missing or empty
 */
function describeUserAgent(userAgent) {
    return userAgent ? REDACTED : '[absent]';
}

/**
 * Truncates a client address to its network prefix
 * 
 * The prefix is retained because correlating several failures to the same
 * origin network is the reason the address is logged at all, and the host
 * portion - the part that identifies an individual machine or subscriber - is
 * masked. IPv4 keeps its first three octets (a /24); IPv6 keeps its first two
 * groups (a /32), which also masks the embedded address of an IPv4-mapped form
 * such as '::ffff:192.168.1.50'. Anything too short or too malformed to
 * truncate safely is replaced outright.
 * 
 * @function anonymizeClientIp
 * @param {string} address - req.ip, or the socket's remote address
 * @returns {string} The network prefix followed by the redaction token, or the
 *                   token alone when there is no truncatable address
 */
function anonymizeClientIp(address) {
    const value = String(address);
    const isIpv6 = value.includes(':');
    const separator = isIpv6 ? ':' : '.';
    const keptSegments = isIpv6 ? 2 : 3;
    const segments = value.split(separator);

    // Nothing recognizable enough to truncate - including a missing address,
    // which String() renders as text rather than throwing.
    if (segments.length <= keptSegments) {
        return REDACTED;
    }

    return `${segments.slice(0, keptSegments).join(separator)}` +
        `${separator}${REDACTED}`;
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
 * 1. Redacted error logging for debugging and monitoring
 * 2. Setting appropriate HTTP status code for error responses
 * 3. Sending standardized, generic error response to clients
 * 
 * Error Handling Flow:
 * 1. Receives error from Express framework (manual next(err) or automatic promise rejection)
 * 2. Logs a redacted error record, with the stack trace outside production
 * 3. Delegates to Express's default handler with next(err) when the response has
 *    already started, because nothing further can be written to it
 * 4. Otherwise sets HTTP 500 Internal Server Error status code
 * 5. Sends generic JSON error response to client
 * 6. Terminates the request-response cycle without calling next()
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
 * @param {Function} next - Express next function for passing control onward. Called with
 *                          the error only when res.headersSent is true, which hands the
 *                          request to Express's default handler; otherwise this middleware
 *                          terminates the chain itself.
 * @returns {void} This function does not return a value as it terminates the
 *                 request-response cycle by sending an error response, or by
 *                 delegating a response that has already started.
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
    // The request path is derived once and used twice - in the log record and in
    // the client response - so the two can never disagree, and the query string
    // is dropped from both. originalUrl is the URL as the client sent it; req.url
    // is the fallback for a request that never reached the router.
    const requestPath = sanitizeRequestPath(req.originalUrl || req.url);

    // Step 1: Log a redacted error record for debugging and monitoring
    // This provides developers with the error information they need:
    // - Error message and type
    // - Stack trace for debugging, outside production
    // - Request context (method, pathname, allowlisted headers) for reproduction
    // - Timestamp and environment information (handled by logger utility)
    // Request-supplied values are minimized first. The record is operator-facing
    // and must be protected as such; it is not made safe by being a log line.
    logger.error('Unhandled application error occurred:', {
        // Error details for debugging. The message and name come from the
        // code that threw, not from the caller, and they are the irreducible
        // diagnostic. The stack additionally exposes absolute filesystem paths
        // and internal structure, so it is withheld in production.
        errorMessage: err.message,
        errorStack: config.nodeEnv === 'production' ? REDACTED : err.stack,
        errorName: err.name,
        
        // Request context for error reproduction and analysis. Nothing the
        // caller supplied is recorded - not a value, and not a field, parameter
        // or header NAME, since a name channel leaks as readily as a value one.
        // Counts and allowlisted protocol metadata are recorded instead.
        requestUrl: requestPath,
        requestMethod: req.method,
        requestHeaders: redactHeaders(req.headers),
        requestParams: summarizeFieldCount(req.params),
        requestQuery: summarizeFieldCount(req.query),
        
        // Additional context for debugging
        timestamp: new Date().toISOString(),
        userAgent: describeUserAgent(req.get('User-Agent')),
        
        // Client address, truncated to its network prefix so repeated failures
        // from one origin can still be correlated while the host portion, which
        // identifies an individual machine or subscriber, is masked
        clientIP: anonymizeClientIp(req.ip || req.connection.remoteAddress)
    });

    // Step 2: Hand the request to Express's default handler when the response
    // has already started
    // Once headers are on the wire this middleware cannot set a status or send a
    // body: res.status()/res.json() would raise ERR_HTTP_HEADERS_SENT on top of
    // the original error and the real failure would be lost. Express's own
    // handler is the documented destination in that case - it closes the
    // connection - and reaching it requires calling next() with the error.
    if (res.headersSent) {
        return next(err);
    }

    // Step 3: Set HTTP status code to 500 (Internal Server Error)
    // This indicates to the client that a server-side error occurred
    // Status 500 is the standard HTTP response code for generic server errors
    res.status(500);

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
        
        // Request path for client-side error correlation. It is the same
        // redacted value the log record carries, so a query string that held a
        // credential is not echoed back to the caller
        path: requestPath
    });

    // Note: on this path the 'next' function is intentionally NOT called
    // This middleware terminates the request-response cycle by sending the error response
    // Calling next() after that would attempt to pass control to the next middleware,
    // which would result in an error since the response has already been sent
    // 
    // In Express error handling middleware, next() is only called when:
    // - Passing the error to another error handler
    // - Falling back to the default Express error handler
    // Since this is the final error handler, the only case that delegates is the
    // already-started response handled in Step 2, and every other error ends here
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
 * - Better debugging capabilities from a complete but minimized error record
 * 
 * @module errorHandler
 * @type {Function}
 * @exports errorHandler
 */
module.exports = { errorHandler };