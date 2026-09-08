/**
 * Request Logger Middleware
 * 
 * An Express middleware function that records every incoming HTTP request on the console,
 * before routing, for observability and debugging purposes. Each request record carries three
 * fields: the HTTP method, the request pathname with any query string dropped, and a coarse
 * description of the request body. A body that cannot be inspected adds one further error
 * record, so the normal path writes one record and that path writes two. It is a pre-handler
 * request log rather than an audit trail - it runs before the route handler, so it records
 * nothing about the outcome: no response status, no duration, no identity, no request
 * identifier and no headers.
 * 
 * This middleware implements the centralized logging strategy defined in the system architecture
 * and serves as a component of the application's observability infrastructure. It logs request
 * details before processing continues, ensuring that all requests are tracked regardless
 * of whether they succeed or fail in subsequent middleware or route handlers.
 * 
 * Data Minimization (security):
 * - Nothing the caller supplied is logged - not a value and not a field or parameter NAME.
 *   A query string or a request body routinely carries tokens, passwords and personal data,
 *   this middleware cannot tell which parameter carries which, and a name channel leaks just
 *   as readily as a value channel ('/hello?<secret>=1' hides its secret in the name).
 * - A dropped query string is recorded as the single marker '?[REDACTED]', and a body as its
 *   kind and field count, so a reader still learns that parameters or a body were present.
 * - The pathname itself is logged verbatim: it identifies the route, which the server
 *   defines, rather than anything the caller chose.
 * 
 * Key Features:
 * - Records the HTTP method, the request pathname and a coarse body description
 * - Integration with centralized logger utility for consistent formatting
 * - Environment-aware logging (development vs production formatting)
 * - Pass-through operation - calls next() after the log write completes
 * - Support for all HTTP methods and request types
 * - Object bodies described by field count, with no field name or value rendered
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
 * Token substituted for every value the log record must not carry
 * 
 * A single fixed marker, rather than a truncated or hashed value, keeps the
 * record readable and makes the redaction obvious to whoever reads the log.
 * 
 * @constant {string}
 */
const REDACTED = '[REDACTED]';

/**
 * Builds the log-safe request path from the URL as received by the server
 * 
 * The pathname is kept verbatim - it identifies the route, which the server
 * defines - and the query string is dropped in full. Parameter names are
 * dropped along with their values, because a name is exactly as
 * caller-controlled as a value: '/hello?<secret>=1' hides its secret in the
 * name. What survives is the fact that a query string was present, recorded as
 * a single '?[REDACTED]' marker, which is enough to tell a reader that the
 * request carried parameters without telling them anything about the contents.
 * 
 * @function sanitizeRequestPath
 * @param {string} originalUrl - Express's req.originalUrl, the URL exactly as
 *                               received, including any query string
 * @returns {string} The pathname alone, or the pathname followed by the
 *                   '?[REDACTED]' marker when parameters were present
 */
function sanitizeRequestPath(originalUrl) {
    // String() keeps this total: a request without originalUrl renders as text
    // instead of throwing inside a logging middleware.
    const rawPath = String(originalUrl);
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
 * Describes a request body without rendering anything the caller supplied
 * 
 * The description is deliberately coarse - whether a body was present, what
 * kind of value it was, and how many fields an object carried. Neither field
 * values nor field NAMES are recorded, and no value is ever read: a body
 * routinely carries credentials and personal data, a name can carry them just
 * as easily, and reading a value can invoke a getter or a toJSON hook that
 * returns or throws caller-controlled text.
 * 
 * Object.keys is the only inspection performed. It enumerates own keys without
 * invoking getters, without calling toJSON and without unboxing wrappers, so no
 * caller-supplied string can reach the returned description.
 * 
 * @function describeRequestBody
 * @param {*} body - Express's req.body. Normally undefined in this application,
 *                   since no body parser is mounted
 * @param {string} path - The already-sanitized request path, used only to
 *                        identify the request if the inspection itself fails
 * @returns {string} '{}' when no body is present, '[<type> - redacted]' for a
 *                   primitive, '[object - N field(s) redacted]' for an object,
 *                   or '[object - unable to inspect]' when even counting fails
 */
function describeRequestBody(body, path) {
    // No body present - typical for GET requests, and the normal case
    // throughout this application because no body parser is mounted.
    if (body === undefined || body === null) {
        return '{}';
    }

    // A primitive body (string, number, boolean, bigint, symbol) is payload in
    // its entirety, so its type is recorded and its value is not.
    if (typeof body !== 'object') {
        return `[${typeof body} - redacted]`;
    }

    try {
        // Cardinality only: a count of fields discloses nothing about them.
        const fieldCount = Object.keys(body).length;

        return `[object - ${fieldCount} field(s) redacted]`;
    } catch (error) {
        // Some exotic objects cannot even be enumerated - a Proxy whose ownKeys
        // trap throws, for instance. The failure is reported without the thrown
        // message, which is itself caller-influenced text, and the request
        // record below still gets written.
        logger.error('Request body inspection failed for path:', path);

        return '[object - unable to inspect]';
    }
}

/**
 * Express middleware function for per-request HTTP logging
 * 
 * This function intercepts every incoming HTTP request and records it before
 * passing control to the next middleware in the stack. It records the HTTP method,
 * the request pathname and a coarse description of the request body, which gives
 * per-request visibility of what was asked for - not of the outcome, which has not
 * been decided at this point in the middleware chain.
 * 
 * The middleware operates non-destructively, meaning it does not modify the request
 * or response objects and simply observes and logs the request data. This ensures
 * that logging does not interfere with normal request processing flow.
 * 
 * Logging Format and Content:
 * - HTTP Method: GET, POST, PUT, DELETE, PATCH, etc.
 * - Request Path: The pathname alone, followed by the marker '?[REDACTED]' when the
 *   URL carried a query string. Parameter names and values are both dropped.
 * - Request Body: A description, never the body itself. This application mounts no
 *   body parser, so req.body is normally undefined and the field renders as '{}'.
 *   A primitive renders as '[<type> - redacted]', an object as
 *   '[object - N field(s) redacted]', and an object that cannot even be enumerated
 *   as '[object - unable to inspect]'.
 * 
 * Performance Considerations:
 * - Minimal processing overhead to avoid impacting request response times
 * - One synchronous write per request on the normal path, executed inline in the
 *   request path; a body that cannot be inspected adds a second synchronous write
 *   for the error record
 * - Describing an object body counts its own keys, which is proportional to the
 *   number of fields and reads none of them
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
 * // Sample log output for GET request to /hello. The logger hands its arguments
 * // straight to console.log, which joins them with single spaces, so the rendered
 * // line contains no commas. Development adds the '[INFO]:' level prefix.
 * // Development: [INFO]: HTTP Request - Method: GET Path: /hello Body: {}
 * // Production: HTTP Request - Method: GET Path: /hello Body: {}
 * 
 * @example
 * // Sample log output for a request carrying a query string and a parsed JSON
 * // body of two fields, showing what is recorded in place of each
 * // [INFO]: HTTP Request - Method: POST Path: /hello?[REDACTED] Body: [object - 2 field(s) redacted]
 */
function requestLogger(req, res, next) {
    // Extract HTTP method from request object (GET, POST, PUT, DELETE, etc.)
    // This provides information about the type of operation being requested
    const method = req.method;
    
    // Build the log-safe request path from the URL as received by the server
    // originalUrl is preferred over req.url because it preserves the request
    // path as the client sent it, even when previous middleware has rewritten
    // req.url. It also carries the query string, so it goes through the
    // sanitizer: the pathname is kept and the query string is dropped whole,
    // which is what stops '/hello?token=<secret>' reaching the console.
    const path = sanitizeRequestPath(req.originalUrl);
    
    // Describe the request body without rendering any part of it: presence,
    // kind of value, and field count only. Nothing the caller supplied - value
    // or field name - is read or reproduced. See describeRequestBody.
    const body = describeRequestBody(req.body, path);
    
    // Log the request information using the centralized logger utility
    // Rendered as: "HTTP Request - Method: [METHOD] Path: [PATH] Body: [BODY]"
    // The logger hands these arguments to console.log, which joins them with
    // single spaces. The consistent field labels keep the line readable and
    // greppable, but the output is plain text, not a machine-readable
    // serialization, so nothing downstream should try to parse it as one.
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