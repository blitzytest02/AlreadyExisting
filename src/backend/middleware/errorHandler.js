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
 * - The diagnostic records the request's pathname, never its query string. Express percent-DECODES
 *   the query into `req.query`, so a target of `?password=hunter2` or `?x=%E2%80%AE` would
 *   otherwise put a live secret, or a genuine bidirectional override, into a log file that
 *   outlives the request and is read by more people than sent it. What survives is the fact that
 *   a query was present and how many parameters it held, which is what a reproduction needs
 * - Every value the diagnostic does record from the request is escaped to printable ASCII and
 *   bounded to a fixed length, so no caller can forge a log line, address the terminal reading
 *   the log, or make one request cost the operator an unbounded amount of log
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
 * The largest number of characters any single recorded value contributes to the diagnostic.
 *
 * Applied after escaping, because escaping is what can grow a value - one control character
 * becomes six characters - and it is the text that actually reaches the console that has to be
 * bounded. 256 is longer than any target, header or message this tutorial produces, so the cap is
 * invisible in normal use and only takes effect on input that was trying to be large.
 *
 * @constant {number}
 */
const MAX_LOGGED_VALUE_LENGTH = 256;

/**
 * Everything that is not printable ASCII.
 *
 * Written as a negation rather than as a list of the characters known to be dangerous, because
 * that list is open-ended: C0 controls, DEL, the Unicode line and paragraph separators, the
 * bidirectional overrides, and whatever a future terminal decides to interpret. Naming the small
 * set that is safe to pass through is the only version of this rule that does not need revisiting.
 * A negated range also keeps literal control characters out of the pattern, which is what
 * `no-control-regex` objects to.
 *
 * @constant {RegExp}
 */
const UNSAFE_LOG_CHARACTERS = /[^\x20-\x7E]/g;

/**
 * Replace every non-printable-ASCII character with inert `\uXXXX` text.
 *
 * The replacement is text, not an escape a later reader turns back into the character: `\u202e` in
 * a log file is six printable characters and stays six printable characters. Node's own inspection
 * of a logged object escapes C0 controls but passes U+202E and U+2028 through unchanged, so this
 * is what closes the display-control half of the gap rather than duplicating what the runtime
 * already does.
 *
 * This helper, `safeLogValue` and the bound above are deliberately identical to the copies in
 * requestLogger.js. The two middleware modules are self-contained by design - each imports only
 * the logger - and keeping the sanitizer local to each avoids introducing a shared source file
 * that is neither middleware nor covered by the coverage scope this package verifies
 * (`routes/**` and `middleware/**`). Both copies are exercised to completion by their own unit
 * suite, so a divergence between them fails a test rather than going unnoticed.
 *
 * @param {string} value - Already-stringified value to neutralize
 * @returns {string} The same text with every unsafe character replaced by its escape
 */
function escapeUnsafeCharacters(value) {
    return value.replace(
        UNSAFE_LOG_CHARACTERS,
        (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
}

/**
 * Convert an arbitrary value into text that is safe and bounded to record.
 *
 * `String()` is applied unconditionally so the function has one path regardless of what it is
 * handed - a string, a header value Express delivered as an array, a number - and no caller has to
 * decide whether conversion is needed first.
 *
 * When the escaped text exceeds the bound, the excess is dropped and the number of dropped
 * characters is stated, because a truncated value that says nothing about the truncation reads
 * like the whole value.
 *
 * @param {*} value - Value to record in the diagnostic
 * @returns {string} Printable, bounded text
 */
function safeLogValue(value) {
    const escaped = escapeUnsafeCharacters(String(value));

    if (escaped.length <= MAX_LOGGED_VALUE_LENGTH) {
        return escaped;
    }

    const droppedCharacters = escaped.length - MAX_LOGGED_VALUE_LENGTH;

    return `${escaped.slice(0, MAX_LOGGED_VALUE_LENGTH)}[truncated ${droppedCharacters} characters]`;
}

/**
 * The request's pathname, neutralized and bounded, for the diagnostic.
 *
 * `req.originalUrl` is preferred over `req.url` for the same reason the response envelope prefers
 * it: it is the target as the server received it. The difference is what happens next - the
 * envelope hands the caller its own target back verbatim so a failure can be correlated with the
 * request that caused it, while the log keeps only the part that identifies the route. The query
 * string is where values live, and a log file is the wrong place for them.
 *
 * Nothing is decoded here. The raw target is what the client sent; decoding it would turn `%0A`
 * into a real newline and `%E2%80%AE` into a real override - precisely the input the escape step
 * exists to keep out.
 *
 * @param {Object} req - Express request object
 * @returns {string} The pathname of the request target, escaped and bounded
 */
function loggedRequestPath(req) {
    const target = String(req.originalUrl || req.url);
    const boundaryIndex = target.search(/[?#]/);

    if (boundaryIndex === -1) {
        return safeLogValue(target);
    }

    return safeLogValue(target.slice(0, boundaryIndex));
}

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
 * Values are neutralized on the way out. The allow-list decides WHICH headers are recorded; it
 * says nothing about what a client can put inside one, and `Accept` is as free-form as any other
 * header. Escaping and bounding each value is what makes the recorded set safe to write.
 *
 * @param {Object} [headers] - the request's header set, as Express assembled it
 * @returns {Object} a new object holding only the allow-listed headers that were present, with
 *                   every value escaped to printable ASCII and bounded
 */
function recordedRequestHeaders(headers) {
    const recorded = {};

    if (!headers) {
        return recorded;
    }

    for (const name of RECORDED_REQUEST_HEADERS) {
        if (headers[name] !== undefined) {
            recorded[name] = safeLogValue(headers[name]);
        }
    }

    return recorded;
}

/**
 * Copies a request's route parameters, neutralizing names and values.
 *
 * Route parameters are named by the application - this tutorial's single route has none - but
 * their values come from the caller's target, and a router elsewhere could name one from a
 * wildcard. Both halves are therefore escaped and bounded, and the result is a new object rather
 * than `req.params` itself, so the diagnostic cannot be a live view of the request.
 *
 * The guard mirrors the one above: a request object without `params` must not be the reason an
 * error response is not sent.
 *
 * @param {Object} [params] - the request's route parameters, as Express matched them
 * @returns {Object} a new object holding the same parameters, escaped and bounded
 */
function recordedRouteParams(params) {
    const recorded = {};

    if (!params) {
        return recorded;
    }

    for (const name of Object.keys(params)) {
        recorded[safeLogValue(name)] = safeLogValue(params[name]);
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
 *    recorded from an allow-list, the pathname is recorded in place of the full target, every
 *    recorded value is escaped and bounded, and the stack trace is included in development only
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
    // - Request context (pathname, method, allow-listed headers, route params, and how many query
    //   parameters the target carried) for reproduction
    // - A timestamp and the client address
    // - The stack trace, in development only
    //
    // What it deliberately does not provide is the request's own credentials, or any value the
    // caller chose. The headers are copied from a fixed allow-list rather than wholesale, because
    // `req.headers` carries whatever the client sent - `Authorization`, `Cookie`, an API key - and
    // a diagnostic that copies it out puts those values in a log file, which is the weakness
    // CWE-532 describes. The same reasoning removes the query string: `req.query` is the decoded
    // form of `?password=hunter2`, and `?x=%E2%80%AE` decodes to a genuine display override, so
    // the values are dropped and only their number is kept. Everything that does remain is escaped
    // to printable ASCII and bounded, so one request cannot forge a second log line, address the
    // terminal reading the log, or cost the operator an unbounded amount of it. A failure is
    // reproducible without any of what was removed.
    const diagnostic = {
        // Error details for debugging. The message is neutralized because a handler that
        // interpolates request data into the error it throws - a common shape - makes the message
        // partly the caller's text; the name is neutralized for the same reason, since a thrown
        // value's `name` is only conventionally the constructor's.
        errorMessage: safeLogValue(err.message),
        errorName: safeLogValue(err.name),

        // Request context for error reproduction and analysis. The pathname identifies the route
        // that failed; the query string is deliberately not recorded, and what remains of it is
        // the count below - enough to know a query was present and how large, without writing the
        // values a caller put in it into a log file.
        requestPath: loggedRequestPath(req),
        requestMethod: req.method,
        requestHeaders: recordedRequestHeaders(req.headers),
        requestParams: recordedRouteParams(req.params),
        requestQueryParameterCount: Object.keys(req.query || {}).length,

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