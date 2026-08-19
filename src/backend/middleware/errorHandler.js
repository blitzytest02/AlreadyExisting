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
 * - The server-side diagnostic records what identifies the failure, not the text around it.
 *   Writing credentials or personal data into a log file is the exposure described by CWE-532
 *   - a log is long lived, widely readable and rarely rotated - and no pattern can recognise an
 *   opaque token or an arbitrary piece of personal data, so no free-form string is retained -
 *   neither on the strength of having been scanned nor on the strength of its shape. Every
 *   recorded value is either a member of a list written in this file, an integer, or a fixed
 *   marker - with one deliberate exception, `clientIP`, which is derived from the peer address
 *   only after Node's own parser has established that it IS an address, and whose every component
 *   is then a decimal octet or a hex quartet. Field by field, the eleven-key diagnostic records:
 *     - `errorMessage`: the error's `code` when it is one of the codes listed in
 *       RECORDED_ERROR_CODES, otherwise `[omitted]`. The free-form `err.message` is never logged
 *     - `errorName`: the class name when it is one of the built-in error names listed in
 *       RECORDED_ERROR_NAMES, otherwise `[omitted]`
 *     - `errorStack`: at most five frames, each reduced to a module name from RECORDED_MODULES
 *       (or `[external]`) with its line and column. No function name, file path or other text
 *       from the trace is copied
 *     - `requestUrl`: a classification of the target - the route it asked for, `[unmatched]`
 *       otherwise - with a marker appended when a query was present. No character of the
 *       received target is logged
 *     - `requestMethod`: the method when HTTP defines it, otherwise `[omitted]`
 *     - `requestHeaders`, `requestParams`, `requestQuery`: how many entries the request
 *       carried. No name and no value from any of the three reaches the log, so Authorization,
 *       Cookie, X-API-Key and anything a future client invents are excluded by construction
 *     - `userAgent`: `[omitted]` when one was sent, absent when none was
 *     - `clientIP`: the network portion only (IPv4 /24, IPv6 /48), and `[omitted]` when the
 *       value is not an address at all - a colon alone does not make one
 *     - `timestamp`: generated here; the only field not derived from the request
 *   No value needs truncating, because none is copied from the request or the error in the first
 *   place: each is a list member, an integer of at most six digits, a fixed marker, or a
 *   validated address network of at most 16 characters, so the whole entry is bounded by
 *   construction and nothing logged here can flood the console or forge an entry of its own. `errorStack` is the only multi-line field, at most five frames of
 *   at most 41 characters each - 209 characters including the separators
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

// Node's own address parser, used to establish that a peer address is an address before any part
// of it is recorded. A built-in is preferred to a hand-written pattern here precisely because
// address syntax has more valid and invalid forms than a regular expression tends to cover.
const net = require('net');
// Node's legacy URL parser. This is deliberately the same parser Express reaches through
// `parseurl` when it resolves a request target, so a route label derived here agrees with the
// router by construction rather than by a pattern that has to be kept in step with it. It is also
// the reason WHATWG `new URL` is not used: that one resolves dot segments, so '/hello/../hello'
// would be labelled as the route although the router answers 404 for it.
const legacyUrl = require('url');


/**
 * Maximum number of digits accepted in a stack frame's line or column
 *
 * The line and column are the only part of a frame taken from the trace rather than from a list
 * in this file. `err.stack` is writable, so a frame could name a real module at line
 * '9007199254740991...' and use those digits to carry an arbitrary value; six digits addresses
 * any real source file and bounds the frame's length at the same time.
 *
 * @constant {number}
 */
const MAX_LOCATION_DIGITS = 6;

/**
 * Value written in place of content that is deliberately not logged
 *
 * @constant {string}
 */
const OMITTED_VALUE = '[omitted]';

/**
 * Marker that stands in for the whole content of a query string
 *
 * @constant {string}
 */
const QUERY_REDACTION_MARKER = '?[REDACTED]';

/**
 * Number of stack frames recorded
 *
 * The frames nearest the throw identify the fault; the tail is repeated framework and Node
 * internals that add volume without information.
 *
 * @constant {number}
 */
const MAX_LOGGED_STACK_FRAMES = 5;

/**
 * The error names this middleware will record
 *
 * Everything below is an allow list rather than a filter, and the difference is the whole
 * point: a filter has to recognise every shape a secret can take, and an opaque token, an API
 * key or a piece of personal data has no recognisable shape at all. An allow list can only be
 * wrong in the safe direction. `err.name` is writable, so it is matched against the built-in
 * error constructors and nothing else. A subclass names itself, so a 'SomethingError' convention
 * would admit 'JaneDoeError' as readily as 'ValidationError'; both are dropped.
 *
 * @constant {string[]}
 */
const RECORDED_ERROR_NAMES = [
    'Error',
    'TypeError',
    'RangeError',
    'SyntaxError',
    'ReferenceError',
    'EvalError',
    'URIError',
    'AggregateError',
    'AssertionError'
];

/**
 * The error codes this middleware will record
 *
 * A shape test cannot stand in for this list. `/^[A-Z][A-Z0-9_]{1,40}$/` describes an uppercase
 * token, and an opaque API key, licence key or session identifier is an uppercase token too, so
 * a shape test would admit `A3F9K2QXOPAQUE1234567890` as readily as `ENOENT`. Shape is not
 * provenance: only membership of a list written here establishes that a value came from the
 * platform rather than from a request. Codes outside this list are reported as omitted, which
 * costs a little diagnostic detail for an unusual failure and cannot leak anything.
 *
 * These are the codes Node raises for the failure modes an HTTP service actually meets.
 *
 * @constant {string[]}
 */
const RECORDED_ERROR_CODES = [
    // Filesystem and permissions
    'ENOENT', 'EACCES', 'EPERM', 'EEXIST', 'EISDIR', 'ENOTDIR', 'ENOTEMPTY', 'EMFILE', 'ENFILE',
    // Network and sockets
    'ECONNREFUSED', 'ECONNRESET', 'EADDRINUSE', 'EADDRNOTAVAIL', 'ENOTFOUND', 'EHOSTUNREACH',
    'ENETUNREACH', 'EPIPE', 'ETIMEDOUT', 'EAI_AGAIN', 'EPROTO', 'ECONNABORTED',
    // Node error codes reachable from request handling
    'ERR_INVALID_ARG_TYPE', 'ERR_INVALID_ARG_VALUE', 'ERR_INVALID_URL', 'ERR_INVALID_URI',
    'ERR_HTTP_HEADERS_SENT', 'ERR_STREAM_DESTROYED', 'ERR_STREAM_WRITE_AFTER_END',
    'ERR_UNHANDLED_REJECTION', 'ERR_SOCKET_BAD_PORT', 'ERR_OUT_OF_RANGE', 'ERR_ASSERTION',
    'ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'
];

/**
 * The application modules this middleware will name in a stack frame
 *
 * A frame's function name and file path are both writable - `err.stack` is a plain string
 * property - so neither is copied. A frame's file is instead matched against this list and
 * recorded as the name written here, which means a stack line contributes a module identifier
 * from this file plus two numbers and nothing else.
 *
 * @constant {string[]}
 */
const RECORDED_MODULES = [
    'app.js',
    'server.js',
    'routes/index.js',
    'routes/hello.js',
    'middleware/requestLogger.js',
    'middleware/errorHandler.js',
    'utils/logger.js',
    'config/index.js'
];

/**
 * Label recorded for a stack frame that is not one of this application's modules
 *
 * @constant {string}
 */
const EXTERNAL_FRAME = '[external]';

/**
 * The application routes this middleware will name in the log
 *
 * @constant {string[]}
 */
const KNOWN_ROUTES = ['/hello'];

/**
 * Label recorded for a request that names no known route
 *
 * @constant {string}
 */
const UNMATCHED_ROUTE = '[unmatched]';

/**
 * The HTTP methods this middleware will record
 *
 * `req.method` is client-supplied, so it is matched against the methods HTTP defines rather
 * than logged as received.
 *
 * @constant {string[]}
 */
const RECORDED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE', 'CONNECT'];

/**
 * Shape of the file, line and column at the end of a V8 stack frame
 *
 * Matched globally so the LAST occurrence in a line is used. A frame's own location is written
 * by V8 at the end of the line, in every form V8 produces:
 *
 *     at handler (/app/routes/hello.js:42:9)
 *     at async handler (/app/routes/hello.js:42:9)
 *     at new Handler (/app/app.js:1:1)
 *     at Object.<anonymous> (/app/server.js:1:1)
 *     at /app/app.js:1:1
 *
 * Taking the last match rather than anchoring on 'at <one token> (' is what makes the async and
 * constructor forms work: their prefixes carry two tokens before the location, and an anchored
 * pattern silently drops exactly the async frames Express 5 promise rejection produces.
 *
 * @constant {RegExp}
 */
const STACK_FRAME_LOCATION = /([^()\s]+):(\d+):(\d+)/g;

/**
 * The authority of an absolute-form request target, e.g. 'user:pw@host:3000' in
 * 'GET http://user:pw@host:3000/hello'
 *
 * @constant {RegExp}
 */
const ABSOLUTE_FORM_AUTHORITY = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/]*)/;

/**
 * A character in the HOST portion of an authority that the router and the parser read differently
 *
 * Parsing the path is necessary but not sufficient for agreement with the router, because the
 * router does not work from the parsed path alone: it also locates a protohost in the RAW target
 * by searching for a literal '/', and trims the mount prefix from that raw string.
 * 'http://host\\hello' is the case that exposes it - the parser turns the backslash into a
 * separator and reports '/hello', while the router finds no '/' to end the authority and is left
 * with '/host\\hello', so the route is never reached.
 *
 * Rather than reimplement the router's raw-target handling - mirroring its semantics by hand is
 * what went wrong before - a target whose HOST carries one of these characters is reported as
 * unmatched. That error is one-directional by design: declining to name a route can never
 * attribute a request to a route it did not reach.
 *
 * The test is applied to the host and port only, never to userinfo. ';' and '%' are ordinary
 * characters in a userinfo component, and the parser resets its host scan at the last '@', so
 * 'http://user;name@host/hello' and 'http://user%3Aname@host/hello' really do reach the route -
 * checked against the running application, which answers 200 for both - and declining them would
 * withhold an attribution that exists.
 *
 * @constant {RegExp}
 */
const AMBIGUOUS_HOST = /[\\;%#?]/;

/**
 * Maximum number of trailing delimiters a target may carry and still reach the route
 *
 * The aggregator mounts '/hello' without an end anchor and its leaf registers '/', and each of
 * those two segments permits one optional trailing delimiter - so '/hello', '/hello/' and
 * '/hello//' all reach the handler while '/hello///' is a 404. Normalising away *any* number of
 * trailing slashes would label that 404 as the route, which is the one thing a request log must
 * not do: with no response log to correct it, the arrival line is the only attribution there is.
 *
 * @constant {number}
 */
const MAX_TRAILING_DELIMITERS = 2;


/**
 * Returns a value only when it appears in the list of values this middleware may record.
 *
 * Membership is the whole test. There is deliberately no shape or pattern fallback: a regular
 * expression describes what a value looks like, and an opaque secret can be made to look like
 * anything, so a shape test cannot establish that a value came from the platform rather than
 * from a request. A value absent from the list is reported as omitted.
 *
 * @param {*} value - The candidate value
 * @param {string[]} allowed - The exact values that may be recorded
 * @returns {string} The value, or the omission marker
 */
function allowListed(value, allowed) {
    if (typeof value !== 'string') {
        return OMITTED_VALUE;
    }

    return allowed.includes(value) ? value : OMITTED_VALUE;
}

/**
 * Classifies a request target as one of the known routes, or as unmatched.
 *
 * The returned value is drawn from a fixed vocabulary - a name from KNOWN_ROUTES,
 * UNMATCHED_ROUTE or OMITTED_VALUE, optionally followed by QUERY_REDACTION_MARKER - so no
 * character of the received target reaches the log. An arbitrary path segment needs no label,
 * no '?' and no recognisable shape to be a secret: '/hello/A3F9K2QXOPAQUE1234567890' carries one
 * in plain sight, and masking credential-shaped text would not have touched it.
 *
 * The query delimiter is located on the raw target FIRST. Doing any transformation before that
 * split is what loses the marker: a pattern whose match can span a '?' consumes the delimiter,
 * and the resulting value then claims no query was present.
 *
 * The path is derived with the same parser the router uses (see legacyUrl above), a target whose
 * host the router would read differently is declined rather than guessed at (see AMBIGUOUS_HOST),
 * and the result is compared case-insensitively allowing up to two trailing delimiters but no
 * more - so the label names the route only where the router would actually reach it.
 *
 * @param {*} requestTarget - The request target, or any non-string
 * @returns {string} A route label safe to log
 */
function logSafePath(requestTarget) {
    if (typeof requestTarget !== 'string') {
        return OMITTED_VALUE;
    }

    // Locate the query delimiter on the RAW target before anything else happens, so a target that
    // carried a query always reports one.
    const queryStart = requestTarget.indexOf('?');
    const rawRoute = queryStart === -1 ? requestTarget : requestTarget.slice(0, queryStart);
    const marker = queryStart === -1 ? '' : QUERY_REDACTION_MARKER;

    // A host the router and the parser would read differently cannot be classified from the parsed
    // path alone - see AMBIGUOUS_HOST. Userinfo is excluded from the test: the parser resets its
    // host scan at the last '@', so a ';' or '%' before it does not change where the host ends.
    const authorityMatch = rawRoute.match(ABSOLUTE_FORM_AUTHORITY);

    if (authorityMatch) {
        const authority = authorityMatch[1];
        const userinfoEnd = authority.lastIndexOf('@');
        const hostPort = userinfoEnd === -1 ? authority : authority.slice(userinfoEnd + 1);

        if (AMBIGUOUS_HOST.test(hostPort)) {
            return UNMATCHED_ROUTE + marker;
        }
    }

    // Derive the path with the very parser the router uses, rather than a pattern that looks
    // equivalent. Deciding where an authority ends is where a hand-written pattern goes wrong:
    // 'http://host;tenant/hello' looks like it addresses '/hello', but this parser's host scan
    // stops at the ';', leaving the path ';tenant/hello' - so Express answers 404 and the label
    // must say so. Backslash and percent-bearing authorities behave the same way.
    let pathname;

    try {
        pathname = legacyUrl.parse(rawRoute).pathname;
    } catch (error) {
        // A target this parser rejects reaches no route, so it is reported as unmatched. The
        // error is not logged: it would carry the target text this function exists to withhold.
        return UNMATCHED_ROUTE + marker;
    }

    // A target with no path component at all - '' or 'mailto:someone@example.com' - yields null.
    if (typeof pathname !== 'string') {
        return UNMATCHED_ROUTE + marker;
    }

    // Count the trailing delimiters rather than discarding them: beyond what the mount and the
    // leaf each allow, the target does not reach the route and must not be labelled as it.
    const withoutTrailing = pathname.replace(/\/+$/, '');

    if (pathname.length - withoutTrailing.length > MAX_TRAILING_DELIMITERS) {
        return UNMATCHED_ROUTE + marker;
    }

    // Express matches this application's route case-insensitively.
    const normalized = (withoutTrailing || '/').toLowerCase();
    const label = KNOWN_ROUTES.includes(normalized) ? normalized : UNMATCHED_ROUTE;

    return label + marker;
}

/**
 * Reduces a stack trace to mapped module identifiers with their line and column.
 *
 * No text from the trace is copied. The message line is dropped, each remaining line is reduced
 * to its file, line and column, and the file is then replaced by the matching entry in
 * RECORDED_MODULES - or by EXTERNAL_FRAME when it is framework or Node internals. What reaches
 * the log is therefore a name written in this file plus two integers:
 *
 *     at handler (/app/src/backend/routes/hello.js:42:9)   ->  routes/hello.js:42:9
 *     at async run (/app/node_modules/express/index.js:5:1) ->  [external]
 *
 * Function names are dropped rather than mapped. A function name is chosen by whoever wrote the
 * function, and a frame in a stack assembled by hand can name anything at all, so it is exactly
 * the free-form text this diagnostic exists to avoid recording.
 *
 * @param {*} stack - The error's stack trace, or any non-string
 * @returns {string|undefined} One identifier per line, or undefined when no frame was found
 */
function logSafeStackFrames(stack) {
    if (typeof stack !== 'string') {
        return undefined;
    }

    const frames = stack
        .split('\n')
        .slice(1)
        .map((line) => {
            // Take the LAST file:line:column in the line: V8 writes the frame's own location at
            // the end, after any 'async'/'new'/'Object.<anonymous>' prefix.
            const locations = [...line.matchAll(STACK_FRAME_LOCATION)];

            if (locations.length === 0) {
                return undefined;
            }

            const [, file, lineNumber, column] = locations[locations.length - 1];

            // Compare with '/' separators so a Windows frame - 'C:\app\routes\hello.js:42:9' -
            // matches the same module entry as its POSIX equivalent. This normalised string is
            // used for matching only; what gets logged is the entry from RECORDED_MODULES, never
            // any part of the path itself.
            const comparablePath = file.replace(/\\/g, '/');
            const moduleName = RECORDED_MODULES.find(
                (candidate) => comparablePath === candidate || comparablePath.endsWith(`/${candidate}`)
            );
            const locationInRange = lineNumber.length <= MAX_LOCATION_DIGITS
                && column.length <= MAX_LOCATION_DIGITS;

            return moduleName && locationInRange
                ? `${moduleName}:${lineNumber}:${column}`
                : EXTERNAL_FRAME;
        })
        .filter((frame) => frame !== undefined)
        .slice(0, MAX_LOGGED_STACK_FRAMES);

    return frames.length ? frames.join('\n') : undefined;
}

/**
 * Counts the entries of a request map without recording any of them.
 *
 * Header, query and route-parameter names are chosen by the client just as their values are, so
 * neither is logged. The count still says whether the failing request carried parameters at all,
 * which is what a diagnostic needs from them.
 *
 * @param {Object} source - A header, query or route parameter map, or any non-object
 * @returns {number} How many entries it held
 */
function countOf(source) {
    if (!source || typeof source !== 'object') {
        return 0;
    }

    return Object.keys(source).length;
}

/**
 * Reduces a client address to its network portion.
 *
 * A repeated failure has to be attributable to a caller, but a full address identifies a person
 * under GDPR-style rules, so the host portion never reaches the log:
 *   203.0.113.24                            -> 203.0.113.x        (IPv4 /24)
 *   ::ffff:10.0.0.7                         -> 10.0.0.x           (IPv4-mapped IPv6)
 *   2001:0db8:85a3:0000:0000:8a2e:0370:7334 -> 2001:0db8:85a3:x   (IPv6 /48)
 *   2001:db8::5                             -> 2001:db8:x         (compressed IPv6)
 *
 * @param {*} address - The peer address, or any non-string
 * @returns {string|undefined} The network portion, or undefined when there is no address
 */
function logSafeClientNetwork(address) {
    if (typeof address !== 'string') {
        return undefined;
    }

    // Establish that this IS an address before deriving anything from it. Without this check the
    // presence of a ':' was doing the deciding, which is the same shape-instead-of-provenance
    // mistake the rest of this module exists to avoid: 'A3F9K2QXOPAQUE1234567890:' contains a
    // colon, so an opaque token would have been split into 'segments' and copied out as though
    // it were a network. net.isIP is the platform's own parser, so it also rejects out-of-range
    // octets such as '999.999.999.999' that a permissive digit pattern accepts.
    const family = net.isIP(address);

    if (family === 0) {
        return OMITTED_VALUE;
    }

    // Drop any zone index ('fe80::1%eth0'). It names a local interface rather than the peer, and
    // it is the one free-form component a valid address may carry.
    const routable = address.split('%')[0];

    // Because the value is now known to be an address, every component below is a decimal octet
    // or a hex quartet - so the result is at most 16 characters whatever the input length was.
    if (family === 4) {
        const [first, second, third] = routable.split('.');

        return `${first}.${second}.${third}.x`;
    }

    // The IPv4-mapped form carries an IPv4 host, so it is reduced as IPv4 rather than by hextet.
    const mapped = routable.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/i);

    if (mapped) {
        return `${mapped[1]}.x`;
    }

    // Split on '::' first so a compressed address is not mistaken for a full one: the hextets
    // before it are the only ones whose position is known.
    const hextets = routable.split('::')[0].split(':').filter((hextet) => hextet !== '');
    const network = hextets.slice(0, 3);

    return network.length ? `${network.join(':')}:x` : 'x';
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
    // Step 1: Log the error with enough context to reproduce it, and no more
    // Every field below is deliberately shaped rather than copied. The unshaped version of
    // this log entry - whole `req.headers`, whole `req.query`, the full request target and an
    // untrimmed stack - writes Authorization headers, session cookies, API keys, e-mail
    // addresses and connection strings into the console and from there into whatever collects
    // it, which is the sensitive-information-in-a-log-file exposure of CWE-532. What a
    // diagnostic actually needs is the shape of the failing request: which route, which
    // method, which parameters were present, how the request was framed, and where the throw
    // came from. That is what is recorded.
    logger.error('Unhandled application error occurred:', {
        // Error details. The free-form message is NOT recorded: message text routinely quotes
        // the value that caused the failure - a connection string, a rejected token, a
        // customer's e-mail address - and no pattern can recognise an opaque secret. What is
        // recorded instead identifies the failure without quoting anything: the error's stable
        // code when it has one, its class name when that is a name this middleware recognises,
        // and, for the frames nearest the throw, which of this application's modules they are
        // in and where.
        errorMessage: allowListed(err.code, RECORDED_ERROR_CODES),
        errorStack: logSafeStackFrames(err.stack),
        errorName: allowListed(err.name, RECORDED_ERROR_NAMES),

        // Request context for error reproduction and analysis: the route without its query
        // content, an allow-listed method, and how many headers, route parameters and query
        // parameters the request carried - never which ones, and never their values.
        requestUrl: logSafePath(req.originalUrl || req.url),
        requestMethod: allowListed(req.method, RECORDED_METHODS),
        requestHeaders: countOf(req.headers),
        requestParams: countOf(req.params),
        requestQuery: countOf(req.query),

        // Additional context for debugging. The User-Agent is a free-form client string with no
        // diagnostic value this endpoint needs, so only its presence is recorded.
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent') === undefined ? undefined : OMITTED_VALUE,

        // IP address for tracking (with privacy considerations): validated as an address first,
        // then reduced to its network portion, so a repeated failure is still attributable to a
        // caller without the log holding an address that identifies a person. A value that is
        // not an address is omitted whole rather than partially copied - this is the one field
        // derived from the request rather than selected from a list, so it is the one that has to
        // prove what it is.
        clientIP: logSafeClientNetwork(req.ip || req.connection.remoteAddress)
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