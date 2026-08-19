/**
 * Error Handler Middleware Unit Test Suite
 *
 * Exercises `src/backend/middleware/errorHandler.js` DIRECTLY with mock `err`, `req`, `res`
 * and `next` objects. There is no Supertest here, no Express application and no route: the
 * handler is a plain four-argument function, and calling it with literals is the only way to
 * reach the request-fallback branches that a real request would never take.
 *
 * Why this suite exists
 * ---------------------
 * `src/backend/jest.config.js` collects coverage from `routes/**` and `middleware/**` only and
 * gates all four metrics at 90%; `collectCoverage: true` means those thresholds gate plain
 * `npm test`. This suite and its sibling `requestLogger.test.js` are what carry the two
 * middleware modules over that gate.
 *
 * What the handler does (the contract asserted below)
 * --------------------------------------------------
 * On an error forwarded to it, the handler writes one diagnostic log entry of eleven fields,
 * sets status 500, and sends a generic four-key JSON envelope. It deliberately never calls
 * `next()`: it is the terminal middleware, and the response is already sent by the time it
 * returns. Three expressions inside it have two sides each, and all six are covered here:
 *
 *   requestUrl   req.originalUrl || req.url
 *   clientIP     req.ip || req.connection.remoteAddress
 *   path         req.originalUrl || req.url          (the response field)
 *
 * Scope note: this 500 envelope applies ONLY to errors explicitly forwarded with `next(err)`,
 * thrown in a handler, or produced by a rejected promise. A request matching no route is not
 * an error, never reaches this handler, and continues to receive Express's own not-found
 * response instead - which is why no status other than 500 is asserted anywhere in this file.
 *
 * Isolation notes
 * ---------------
 * `utils/logger.js` exports a plain object literal whose `error` property is an ordinary arrow
 * function, so `jest.spyOn` replaces it directly. The spy is given an empty implementation so
 * the real `console.error` does not flood the run, and `jest.restoreAllMocks()` puts the
 * original back after every case (`clearMocks: true` clears recorded CALLS only, never
 * implementations). Importing the logger also loads `config/index.js`, which prints a
 * development configuration summary; that output is expected and is not suppressed here.
 */

// The middleware under test. errorHandler.js ends with `module.exports = { errorHandler };`,
// so this is a NAMED export - unlike its sibling requestLogger.js, which is a bare function.
// The two shapes differ on purpose and are read back exactly as each module publishes them.
const { errorHandler } = require('../../middleware/errorHandler');

// The logging sink the handler writes its diagnostic through, also a named export.
const { logger } = require('../../utils/logger');

/**
 * Every key the diagnostic log entry is expected to carry, in no particular order.
 *
 * Asserting the exact key set - not merely that these are present - is what makes an added
 * field a test failure. That matters for a diagnostic: a field silently gaining request
 * content is precisely the change this assertion exists to catch.
 *
 * @constant {string[]}
 */
const DIAGNOSTIC_KEYS = [
    'errorMessage',
    'errorStack',
    'errorName',
    'requestUrl',
    'requestMethod',
    'requestHeaders',
    'requestParams',
    'requestQuery',
    'timestamp',
    'userAgent',
    'clientIP'
];

/**
 * ISO-8601 shape with milliseconds and a `Z` suffix, which is what `Date#toISOString`
 * produces. Timestamps are asserted by shape, never by value.
 *
 * @constant {RegExp}
 */
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Builds a fresh mock request.
 *
 * `get` is always present and is the one property most easily forgotten: the handler calls
 * `req.get('User-Agent')` unconditionally, so a request literal without it throws a TypeError
 * before any assertion is reached. `connection` is always present too, so that the `clientIP`
 * fallback can be selected simply by leaving `ip` out.
 *
 * @param {Object} [overrides] - properties to add to or replace on the request
 * @returns {Object} a mock Express request
 */
function createRequest(overrides) {
    return Object.assign({
        method: 'GET',
        originalUrl: '/hello',
        url: '/hello',
        headers: { host: 'localhost:3000' },
        params: {},
        query: {},
        ip: '203.0.113.24',
        connection: { remoteAddress: '10.0.0.7' },
        get: jest.fn(() => 'jest-test-agent')
    }, overrides);
}

/**
 * Builds a fresh mock response with chainable `status` and `json` spies.
 *
 * The handler calls them as two separate statements, so chaining is not strictly required -
 * but returning `this` matches how Express actually behaves and costs nothing, and it means
 * this mock would still work if the two calls were ever chained.
 *
 * @returns {Object} a mock Express response
 */
function createResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        end: jest.fn()
    };
}

/**
 * Returns the JSON payload the handler sent to the client.
 *
 * @param {Object} res - the mock response handed to the handler
 * @returns {Object} the single argument passed to res.json
 */
function sentPayload(res) {
    return res.json.mock.calls[0][0];
}

/**
 * Returns the object the handler passed to logger.error as its second argument.
 *
 * @returns {Object} the diagnostic entry
 */
function loggedDiagnostic() {
    return logger.error.mock.calls[0][1];
}

describe('errorHandler middleware', () => {
    let err;
    let req;
    let res;
    let next;

    beforeEach(() => {
        // Silenced for the duration of the case so the real console.error stays out of the
        // test output without any source file being touched.
        jest.spyOn(logger, 'error').mockImplementation(() => {});

        // A real Error, so `stack` and `name` are genuine rather than invented.
        err = new Error('something went wrong');
        req = createRequest();
        res = createResponse();
        next = jest.fn();
    });

    afterEach(() => {
        // clearMocks clears calls but leaves the empty implementation in place, so an explicit
        // restore is required or a silenced logger would leak into every later case.
        jest.restoreAllMocks();
    });

    /**
     * The client-facing contract: one 500 response carrying a generic envelope of exactly four
     * fields. Nothing about the error itself - not its message, not its stack, not its type -
     * reaches the client.
     */
    describe('client response', () => {
        it('sets HTTP status 500 exactly once', () => {
            errorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('sends exactly one JSON body and uses no other response method', () => {
            errorHandler(err, req, res, next);

            expect(res.json).toHaveBeenCalledTimes(1);
            expect(res.send).not.toHaveBeenCalled();
            expect(res.set).not.toHaveBeenCalled();
            expect(res.end).not.toHaveBeenCalled();
        });

        it('sends an envelope of exactly four keys and nothing else', () => {
            errorHandler(err, req, res, next);

            const payload = sentPayload(res);

            expect(Object.keys(payload)).toHaveLength(4);
            expect(Object.keys(payload).sort()).toEqual(['error', 'path', 'status', 'timestamp']);
        });

        it('sends the generic error string and numeric status in the envelope', () => {
            errorHandler(err, req, res, next);

            const payload = sentPayload(res);

            // Generic on purpose: the specific failure belongs in the log, not in a response
            // any client can read.
            expect(payload.error).toBe('Internal Server Error');
            expect(payload.status).toBe(500);
        });

        it('stamps the envelope with a round-trippable ISO-8601 timestamp', () => {
            errorHandler(err, req, res, next);

            const payload = sentPayload(res);

            expect(payload.timestamp).toMatch(ISO_8601);
            expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
        });

        it('discloses nothing about the forwarded error in the response body', () => {
            // A distinctively named error carrying a distinctive message, so each assertion
            // below tests a real leak rather than a coincidence. Checking for the substring
            // 'Error' would prove nothing: the generic envelope legitimately contains it.
            class SecretLeakError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'SecretLeakError';
                }
            }

            errorHandler(new SecretLeakError('user:p4ssw0rd@db refused'), req, res, next);

            const payload = sentPayload(res);
            const serialised = JSON.stringify(payload);

            expect(payload.error).toBe('Internal Server Error');
            expect(serialised).not.toContain('p4ssw0rd');       // no message text
            expect(serialised).not.toContain('SecretLeakError'); // no error type
            expect(serialised).not.toContain('errorHandler');    // no stack frame
        });
    });

    /**
     * The diagnostic log entry - the counterpart to the generic response. Everything withheld
     * from the client is recorded here instead, in one call with one object.
     */
    describe('diagnostic logging', () => {
        it('logs once, with a fixed label and a single object', () => {
            errorHandler(err, req, res, next);

            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.error.mock.calls[0]).toHaveLength(2);
            expect(logger.error.mock.calls[0][0]).toBe('Unhandled application error occurred:');
            expect(typeof loggedDiagnostic()).toBe('object');
        });

        it('records exactly the eleven documented fields', () => {
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(Object.keys(diagnostic)).toHaveLength(11);
            expect(Object.keys(diagnostic).sort()).toEqual(DIAGNOSTIC_KEYS.slice().sort());
        });

        it('records the error message, name and stack from the forwarded error', () => {
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.errorMessage).toBe('something went wrong');
            expect(diagnostic.errorName).toBe('Error');
            expect(diagnostic.errorStack).toBe(err.stack);
            expect(typeof diagnostic.errorStack).toBe('string');
        });

        it('carries a custom error subclass name through unchanged', () => {
            class ValidationError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'ValidationError';
                }
            }

            errorHandler(new ValidationError('bad input'), req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.errorName).toBe('ValidationError');
            expect(diagnostic.errorMessage).toBe('bad input');
        });

        it('passes the request method, headers, params and query straight through', () => {
            const headers = { host: 'localhost:3000', accept: '*/*' };
            const params = { id: '7' };
            const query = { greeting: 'world' };
            const request = createRequest({
                method: 'POST',
                headers: headers,
                params: params,
                query: query
            });

            errorHandler(err, request, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.requestMethod).toBe('POST');
            expect(diagnostic.requestHeaders).toBe(headers);
            expect(diagnostic.requestParams).toBe(params);
            expect(diagnostic.requestQuery).toBe(query);
        });

        it('stamps the diagnostic with a round-trippable ISO-8601 timestamp', () => {
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.timestamp).toMatch(ISO_8601);
            expect(new Date(diagnostic.timestamp).toISOString()).toBe(diagnostic.timestamp);
        });

        it('reads the User-Agent through req.get and records what it returns', () => {
            errorHandler(err, req, res, next);

            expect(req.get).toHaveBeenCalledWith('User-Agent');
            expect(loggedDiagnostic().userAgent).toBe('jest-test-agent');
        });

        it('records an undefined User-Agent when the request sent no such header', () => {
            const request = createRequest({ get: jest.fn(() => undefined) });

            errorHandler(err, request, res, next);

            expect(request.get).toHaveBeenCalledWith('User-Agent');
            expect(loggedDiagnostic().userAgent).toBeUndefined();
            // The key is still present - it is the value that is absent.
            expect(Object.keys(loggedDiagnostic())).toContain('userAgent');
        });
    });

    /**
     * The three two-sided expressions. Each is covered from both sides, and the
     * originalUrl-present case deliberately gives `url` a DIFFERENT value so that a silent
     * swap of the two would fail rather than pass unnoticed.
     */
    describe('request fallback branches', () => {
        it('prefers originalUrl over url in both the log and the response', () => {
            const request = createRequest({
                originalUrl: '/hello?greeting=world',
                url: '/rewritten-by-middleware'
            });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestUrl).toBe('/hello?greeting=world');
            expect(sentPayload(res).path).toBe('/hello?greeting=world');
        });

        it('falls back to url in both the log and the response when originalUrl is absent', () => {
            const request = createRequest({ originalUrl: undefined, url: '/hello' });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestUrl).toBe('/hello');
            expect(sentPayload(res).path).toBe('/hello');
        });

        it('uses req.ip for the client address when Express resolved one', () => {
            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().clientIP).toBe('203.0.113.24');
        });

        it('falls back to the connection remote address when req.ip is absent', () => {
            const request = createRequest({
                ip: undefined,
                connection: { remoteAddress: '10.0.0.7' }
            });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().clientIP).toBe('10.0.0.7');
        });

        it('requires an address source: with neither ip nor connection it throws before responding', () => {
            // The fallback is `req.ip || req.connection.remoteAddress`, with no guard on
            // `connection` itself. Express always supplies one of the two for a real request, so
            // this case is only reachable by invoking the handler directly - but the behaviour is
            // recorded rather than left to be discovered, because the failure is a TypeError
            // raised INSTEAD of the generic 500 the caller was supposed to receive.
            const request = createRequest({ ip: undefined, connection: undefined });

            expect(() => errorHandler(err, request, res, next)).toThrow(TypeError);

            // Nothing was sent, which is the part that matters: the response the handler exists
            // to produce is not produced.
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
    });

    /**
     * Log-integrity characterisation for terminal and Unicode display controls.
     *
     * This is the reachable half of the control-character gap, and the reason it belongs in this
     * suite rather than the request logger's. `requestLogger` reads `req.originalUrl`, which keeps
     * percent-encoding intact, so `%1B` stays three characters there and never becomes ESC. This
     * handler reads `req.query`, and Express's query parser percent-DECODES, so a target of
     * `?x=%E2%80%AE%1B%5B2J` arrives here as genuine U+202E and ESC and is written to the console
     * unchanged. The same applies to the headers and User-Agent it records.
     *
     * Verified against a live Express app before these cases were written: that target yields
     * `req.query.x` with codepoints U+202E U+001B U+005B U+0032 U+004A, while `req.originalUrl`
     * for the identical request stays `"/t?x=%E2%80%AE%1B%5B2J"`.
     *
     * Reaching it needs an application error to be forwarded, and no route in this tutorial
     * raises one, so it is latent rather than open. These cases pin the current behaviour so the
     * gap is machine-visible rather than prose-only; when an encoder is authorised, every
     * expectation here must be inverted to require the neutralised form.
     */
    describe('control character handling (characterisation, not endorsement)', () => {
        it('records decoded query values verbatim, including a bidi override', () => {
            // What Express hands the handler after decoding ?x=%E2%80%AE, not the raw target.
            const req = createRequest({ query: { x: '\u202Etxt.exe' } });

            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestQuery).toEqual({ x: '\u202Etxt.exe' });
        });

        it('records a decoded ANSI escape sequence from a query value verbatim', () => {
            const req = createRequest({ query: { x: '\u001b[2J' } });

            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestQuery.x).toBe('\u001b[2J');
        });

        it('records decoded C0 controls from a query value verbatim', () => {
            const req = createRequest({ query: { x: 'first\r\nforged' } });

            errorHandler(err, req, res, next);

            // A CRLF inside a logged value is the log-forging shape: one entry that renders as
            // two. Note this arrives via the decoded query, not the request target - Node's HTTP
            // parser rejects a raw CRLF in the target with 400 before any middleware runs.
            expect(loggedDiagnostic().requestQuery.x).toBe('first\r\nforged');
        });

        it('records Unicode separators from a query value verbatim', () => {
            const req = createRequest({ query: { x: 'before\u2028after\u2029end' } });

            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestQuery.x).toBe('before\u2028after\u2029end');
        });

        it('records a header value containing controls verbatim', () => {
            const req = createRequest({ headers: { 'x-note': 'value\u202Ereversed' } });

            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestHeaders['x-note']).toBe('value\u202Ereversed');
        });

        it('records a User-Agent containing controls verbatim', () => {
            const req = createRequest({ get: jest.fn(() => 'agent\u001b[2J') });

            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().userAgent).toBe('agent\u001b[2J');
        });

        it('records an error message containing controls verbatim', () => {
            // The message can be attacker-influenced whenever a handler interpolates request
            // data into the error it throws, which is a common shape in real applications.
            const controlError = new Error('failed for \u001b[2J\u202Ereversed');

            errorHandler(controlError, req, res, next);

            expect(loggedDiagnostic().errorMessage).toBe('failed for \u001b[2J\u202Ereversed');
        });

        it('reflects a decoded control in the client response path when the target carries one', () => {
            // originalUrl is normally still encoded, so this is the narrower case of a caller or
            // upstream proxy supplying an already-decoded target: the envelope hands it straight
            // back. That is the envelope reflecting the caller's own target in `path` and the
            // control-character gap described above meeting in a single response.
            const req = createRequest({ originalUrl: '/hello?x=\u202Ereversed' });

            errorHandler(err, req, res, next);

            expect(sentPayload(res).path).toBe('/hello?x=\u202Ereversed');
        });
    });

    /**
     * Terminal behaviour and signature - the two properties that make Express treat this
     * function as the final error handler and nothing else.
     */
    describe('terminal behaviour', () => {
        it('never calls next, on any of the branches above', () => {
            // One assertion per branch shape, because "terminal" has to hold everywhere: a
            // next() call after the response was sent produces a second, failing write.
            errorHandler(err, req, res, next);
            expect(next).not.toHaveBeenCalled();

            errorHandler(err, createRequest({ originalUrl: undefined }), createResponse(), next);
            expect(next).not.toHaveBeenCalled();

            errorHandler(err, createRequest({ ip: undefined }), createResponse(), next);
            expect(next).not.toHaveBeenCalled();
        });

        it('declares four parameters, which is how Express recognises error middleware', () => {
            // Arity is the whole registration contract: wrap this handler in a shorter
            // function and Express stops routing errors to it, with no warning at all.
            expect(errorHandler).toHaveLength(4);
        });

        it('runs synchronously and returns undefined', () => {
            const result = errorHandler(err, req, res, next);

            expect(result).toBeUndefined();
            expect(res.json).toHaveBeenCalledTimes(1);
        });

        it('sets the status before sending the body', () => {
            errorHandler(err, req, res, next);

            // Ordering is load-bearing: a body written first would flush 200 and the status
            // call would then be too late to matter.
            expect(res.status.mock.invocationCallOrder[0])
                .toBeLessThan(res.json.mock.invocationCallOrder[0]);
        });

        it('logs the diagnostic before responding to the client', () => {
            errorHandler(err, req, res, next);

            expect(logger.error.mock.invocationCallOrder[0])
                .toBeLessThan(res.json.mock.invocationCallOrder[0]);
        });
    });
});
