// Jest Testing Framework - v30.4.2 - unit testing for Node.js applications
// The handler is invoked directly with mock err/req/res/next objects. No HTTP
// client and no Express app are involved, which keeps every fallback branch
// reachable and lets the JSON envelope be inspected as a plain object.

// Import the terminal error-handling middleware under test.
// middleware/errorHandler.js ends with `module.exports = { errorHandler };`, so
// this module has a NAMED export (its sibling requestLogger.js is a DEFAULT
// export - the two shapes are deliberately different and must not be normalised).
const { errorHandler } = require('../../middleware/errorHandler');

// Import the shared logger object so logger.error can be spied on.
// utils/logger.js ends with `module.exports = { logger };` -> NAMED export.
const { logger } = require('../../utils/logger');

/**
 * errorHandler Middleware Unit Test Suite
 *
 * Covers the terminal error-handling middleware named by jest.config.js's
 * `collectCoverageFrom` entry 'middleware/**\/*.js', which is measured against the
 * four 90% global coverage thresholds (branches, functions, lines, statements).
 *
 * Test Architecture:
 * - The handler is exercised DIRECTLY rather than through Supertest, so both sides
 *   of every `||` fallback can be driven deterministically.
 * - Fresh chainable res mocks plus fresh err/req/next objects are built for each
 *   case, which prevents a stale mock.calls entry from producing a false pass.
 * - logger.error is replaced with a scoped spy and explicitly restored after each
 *   case. jest.config.js sets `clearMocks: true`, which clears recorded calls only
 *   and does NOT restore the original implementation.
 * - Where the ORDER of two calls carries meaning, the order is asserted and not merely
 *   the fact that both happened - see expectStatusSetBeforeBodySent and the stateful
 *   response mock, which together pin the status the client would actually receive.
 *
 * What this suite deliberately does NOT cover, and where that lives instead:
 * a directly invoked handler proves nothing about whether app.js registers it, or
 * registers it after the routes where a forwarded error can reach it - error middleware
 * mounted before the routes is never offered their errors and this file would stay green.
 * That registration is asserted by behaviour in tests/integration/hello.test.js, under
 * 'Application Composition and Middleware Ordering', which drives a forwarded error
 * through the assembled application and reads the real 500 response back off the wire.
 *
 * Contract boundary worth keeping straight: this 500 JSON envelope applies ONLY to
 * errors explicitly forwarded with next(err). Requests to unmatched paths or with
 * unmatched methods continue to receive Express's default 404 handling and never
 * reach this handler.
 *
 * Behaviour under test:
 * - One logger.error call: a fixed prefix string plus one eleven-key diagnostic
 *   object.
 * - res.status(500) followed by res.json with a four-key envelope.
 * - `req.originalUrl || req.url` for both the logged requestUrl and the response
 *   path; the logged copy has its query content replaced, the response keeps the
 *   client's own request target because the client already holds it.
 * - `req.ip || req.connection.remoteAddress` for the logged client IP.
 * - `req.get('User-Agent')` for the logged user agent.
 * - next() is intentionally never called: the handler terminates the cycle.
 *
 * The diagnostic is asserted as an ALLOW-LISTED contract, not as a filtered copy of
 * the request. A log is long lived, widely readable and rarely rotated, and writing a
 * credential or personal data into one is the exposure CWE-532 describes - and no
 * pattern can recognise an opaque token or an arbitrary piece of personal data, so no
 * free-form string is retained on the strength of having been scanned - nor on the
 * strength of its SHAPE, since a shape test cannot tell an opaque secret from a
 * platform identifier:
 * - errorMessage: err.code when it is one of the codes the module lists, else '[omitted]'.
 *   The free-form err.message is never logged
 * - errorName: a built-in error class name, else '[omitted]'
 * - errorStack: at most five frames, each a module name from the module's own list plus
 *   its line and column, or '[external]'. No function name or file path is copied
 * - requestUrl: a route classification - the route asked for or '[unmatched]' - with the
 *   query marker appended when a query was present
 * - requestMethod: a method HTTP defines, else '[omitted]'
 * - requestHeaders / requestParams / requestQuery: entry COUNTS, so no client-chosen
 *   name and no value from any of them reaches the log
 * - userAgent: '[omitted]' when one was sent, absent when none was
 * - clientIP: the network portion only (IPv4 /24, IPv6 /48), and '[omitted]' when the
 *   value is not an address - validation comes first, since a colon alone does not make one
 * - timestamp: generated by the handler
 *
 * The 'sensitive value redaction' block therefore plants values that no filter could
 * recognise - an opaque token as a header name and as an error name, an unlabelled
 * secret and non-e-mail personal data in the message, a full IPv6 address - and asserts
 * that none of them appears in any argument of the logger call, while the client still
 * receives the same generic four-field envelope.
 */
describe('errorHandler middleware', () => {
    let errorSpy;

    /**
     * Replace logger.error before every case. mockImplementation(() => {}) keeps the
     * real console.error output from flooding the test log without editing
     * utils/logger.js (a reference module that must not change).
     */
    beforeEach(() => {
        errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    /**
     * Restore the real implementation after every case so no mocked logger leaks
     * into a later case or a sibling suite.
     */
    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Builds a minimal Express-like request object.
     *
     * Every default is present for a reason: `get` must exist because the handler
     * calls req.get('User-Agent'), and `connection` must exist because the client-IP
     * fallback reads connection.remoteAddress. Omitting either makes the handler
     * throw a TypeError before any assertion is reached.
     *
     * @param {Object} [overrides] - Properties to add to or replace on the request
     * @returns {Object} A fresh mock request object
     */
    const createRequest = (overrides = {}) => ({
        method: 'GET',
        originalUrl: '/hello',
        url: '/hello',
        headers: { host: 'localhost:3000', accept: '*/*' },
        params: {},
        query: {},
        ip: '127.0.0.1',
        connection: { remoteAddress: '10.0.0.7' },
        get: jest.fn(() => 'jest-test-agent'),
        ...overrides
    });

    /**
     * Builds a mock response with chainable status/json spies plus the response
     * methods the handler must never touch.
     *
     * @returns {Object} A fresh mock response object
     */
    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis()
    });

    /**
     * Builds a response mock that behaves like a real one with respect to WHEN the status
     * code is fixed, so the status the client would actually receive can be read back.
     *
     * A plain pair of spies records that status(500) and json(payload) both happened but
     * not in which order, and order is what decides the status line: on a real response
     * the code is written into the head at the moment the body is sent, so calling json()
     * first flushes the default 200 and a later status(500) is a no-op on an already-sent
     * response. This mock mirrors that by snapshotting its current statusCode inside json(),
     * which turns an ordering fault into a wrong VALUE - the same thing the client sees -
     * rather than something inferable only from call sequence numbers.
     *
     * @returns {{res: Object, sent: Array<{statusCode: number, payload: Object}>}} The mock
     *     response and the log of what it would have put on the wire
     */
    const createStatefulResponse = () => {
        const sent = [];
        const res = {
            // 200 is Node's default until something sets it, which is exactly the value a
            // send-before-status handler would leak.
            statusCode: 200,
            status: jest.fn((code) => {
                res.statusCode = code;
                return res;
            }),
            json: jest.fn((payload) => {
                sent.push({ statusCode: res.statusCode, payload });
                return res;
            }),
            send: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            end: jest.fn().mockReturnThis()
        };

        return { res, sent };
    };

    /**
     * Asserts the status code was fixed before the body was handed over.
     *
     * Both calls are made as separate statements by the source (status at its line 127,
     * json at 134), so nothing in the call counts distinguishes the correct order from the
     * broken one. Jest's per-mock invocation sequence numbers do.
     *
     * @param {Object} res - The mock response handed to the handler
     */
    const expectStatusSetBeforeBodySent = (res) => {
        expect(res.status.mock.invocationCallOrder[0])
            .toBeLessThan(res.json.mock.invocationCallOrder[0]);
    };

    /**
     * Returns the single object passed to res.json.
     *
     * @param {Object} res - The mock response handed to the handler
     * @returns {Object} The JSON envelope the handler produced
     */
    const jsonPayload = (res) => res.json.mock.calls[0][0];

    /**
     * Returns the single diagnostic object passed to logger.error.
     *
     * @returns {Object} The diagnostic context the handler logged
     */
    const logContext = () => errorSpy.mock.calls[0][1];

    /**
     * Serialises every argument of every logger.error call made during a case,
     * with the handler-generated `timestamp` field removed.
     *
     * Negative-leakage assertions run against this whole-output view rather than
     * against one field, so a secret that moved to a different key is still caught.
     *
     * The timestamp is excluded because it is the one diagnostic field built from the
     * clock rather than from the request, so it can never carry request content - and
     * its digits collide with short fixtures. An address whose host portion is `.7`
     * is reported correctly as `10.0.0.x`, yet a timestamp of `...:16.742Z` contains
     * the literal `.7`, which made a correct implementation fail roughly one run in
     * ten. Dropping the field removes that false positive without weakening the scan:
     * the timestamp is pinned separately against an anchored ISO-8601 pattern, and a
     * value matching that pattern cannot contain anything else.
     *
     * @returns {string} All logged arguments, minus the timestamp, as one searchable string
     */
    const allLoggedText = () =>
        errorSpy.mock.calls
            .map((args) =>
                args
                    .map((arg) => {
                        if (typeof arg === 'string') {
                            return arg;
                        }
                        if (arg && typeof arg === 'object' && 'timestamp' in arg) {
                            const { timestamp, ...rest } = arg;
                            return JSON.stringify(rest);
                        }
                        return JSON.stringify(arg);
                    })
                    .join(' ')
            )
            .join('\n');

    /** ISO-8601 shape produced by Date.prototype.toISOString(). */
    const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    describe('client response contract', () => {
        /**
         * Asserts the status code, the order it was set in, and the exact key set of the
         * JSON envelope. The key set is asserted by length AND membership so that an added,
         * renamed or removed field is caught rather than silently accepted.
         */
        it('responds with status 500 and a four-key JSON envelope', () => {
            const err = new Error('Something went wrong');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(res.status).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledTimes(1);
            expectStatusSetBeforeBodySent(res);

            const payload = jsonPayload(res);
            expect(Object.keys(payload)).toHaveLength(4);
            expect(Object.keys(payload).sort()).toEqual(['error', 'path', 'status', 'timestamp']);
            expect(payload.error).toBe('Internal Server Error');
            expect(payload.status).toBe(500);
            expect(payload.path).toBe('/hello');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The envelope timestamp must be a real ISO-8601 instant. The value itself is
         * generated at call time, so the assertion checks shape and round-trip
         * equality rather than a literal string.
         */
        it('stamps the envelope with an ISO-8601 timestamp', () => {
            const err = new Error('Timestamped failure');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            const { timestamp } = jsonPayload(res);
            expect(typeof timestamp).toBe('string');
            expect(timestamp).toMatch(ISO_8601);
            expect(new Date(timestamp).toISOString()).toBe(timestamp);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The envelope is generic by design: it must not carry the error message, the
         * error name or the stack trace to the client, all of which stay server-side.
         * The literal 'Internal Server Error' is the intended generic text, so the
         * assertions target the withheld-detail substrings and the diagnostic field
         * names rather than the word "Error".
         *
         * The fixture is deliberately ordinary rather than credential-shaped: what the
         * client must not receive is the detail itself, whatever it happens to contain.
         * Credential-shaped fixtures belong to the redaction cases further down, which
         * assert what must not reach the LOG either.
         */
        it('does not send error details to the client', () => {
            const err = new Error('order total could not be computed');
            err.stack = 'Error: order total could not be computed\n    at computeTotal (checkout.js:1:1)';
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            const payload = jsonPayload(res);
            const serialised = JSON.stringify(payload);
            expect(payload.error).toBe('Internal Server Error');
            expect(serialised).not.toContain('order total could not be computed');
            expect(serialised).not.toContain('checkout.js');
            expect(serialised).not.toContain('at computeTotal');
            expect(payload.errorMessage).toBeUndefined();
            expect(payload.errorStack).toBeUndefined();
            expect(payload.errorName).toBeUndefined();

            // What the server keeps is which module failed, not the text of the failure. The
            // frame names a file this application does not own, so it is reported as external:
            // neither the function name nor the file name is copied out of the trace.
            expect(logContext().errorMessage).toBe('[omitted]');
            expect(logContext().errorStack).toBe('[external]');
            const logged = allLoggedText();
            expect(logged).not.toContain('order total could not be computed');
            expect(logged).not.toContain('checkout.js');
            expect(logged).not.toContain('computeTotal');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * res.json is the only response method the handler may use; send/set/end must
         * remain untouched so the cycle terminates exactly once, and the status must be in
         * place before that single write happens.
         */
        it('uses only res.status and res.json to terminate the response', () => {
            const err = new Error('Single write');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(res.json).toHaveBeenCalledTimes(1);
            expect(res.send).not.toHaveBeenCalled();
            expect(res.set).not.toHaveBeenCalled();
            expect(res.end).not.toHaveBeenCalled();
            expectStatusSetBeforeBodySent(res);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The status the CLIENT would receive is 500 - the point of the whole handler.
         *
         * This is the same requirement as the ordering assertion above, restated as a value
         * so a reader does not have to reason about invocation sequence numbers to see what
         * is at stake. The stateful mock records its statusCode at the moment the body is
         * handed over, exactly as a real response fixes the status line when it is sent. A
         * handler that called json() before status(500) would record 200 here and would put
         * 200 on the wire, while still satisfying every "was it called, and with what"
         * assertion in this file.
         *
         * The end-to-end counterpart lives in tests/integration/hello.test.js, where a
         * forwarded error travels through the assembled application and the 500 is read back
         * off a real HTTP response.
         */
        it('records status 500 on the response before the body is handed over', () => {
            const err = new Error('Status precedes body');
            const req = createRequest();
            const { res, sent } = createStatefulResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(sent).toHaveLength(1);
            expect(sent[0].statusCode).toBe(500);
            expect(sent[0].payload.status).toBe(500);
            expect(sent[0].payload.error).toBe('Internal Server Error');
            expect(res.statusCode).toBe(500);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('diagnostic logging', () => {
        /**
         * Asserts the two-argument log call and the exact eleven-key diagnostic
         * context. The request-derived fields are asserted as the shaped values the
         * handler is required to produce - entry counts for headers, route parameters
         * and query, an allow-listed method, a route classification - and NOT as references
         * to the request's own objects: asserting identity would make a raw pass-through
         * of client data the thing this suite protects.
         */
        it('logs the prefix string and an eleven-key diagnostic context', () => {
            const err = new Error('Handler blew up');
            const req = createRequest({
                method: 'POST',
                headers: { host: 'localhost:3000', 'content-type': 'application/json' },
                params: { id: '1' },
                query: { verbose: 'true' }
            });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy.mock.calls[0]).toHaveLength(2);
            expect(errorSpy.mock.calls[0][0]).toBe('Unhandled application error occurred:');

            const context = logContext();
            expect(Object.keys(context)).toHaveLength(11);
            expect(Object.keys(context).sort()).toEqual([
                'clientIP',
                'errorMessage',
                'errorName',
                'errorStack',
                'requestHeaders',
                'requestMethod',
                'requestParams',
                'requestQuery',
                'requestUrl',
                'timestamp',
                'userAgent'
            ]);

            // No err.code on a plain Error, so errorMessage reports the omission.
            expect(context.errorMessage).toBe('[omitted]');
            expect(context.errorName).toBe('Error');
            expect(typeof context.errorStack).toBe('string');
            expect(context.errorStack).not.toContain('Handler blew up');

            // Every recorded frame is a mapped module identifier with its line and column, or
            // the external marker - never a line copied out of the trace.
            context.errorStack.split('\n').forEach((frame) => {
                expect(frame === '[external]' || /^[a-zA-Z/.]+\.js:\d{1,6}:\d{1,6}$/.test(frame)).toBe(true);
            });
            expect(context.requestMethod).toBe('POST');
            expect(context.requestUrl).toBe('/hello');
            expect(context.userAgent).toBe('[omitted]');

            // Counts only: neither the names nor the values of the three maps are logged.
            expect(context.requestHeaders).toBe(2);
            expect(context.requestParams).toBe(1);
            expect(context.requestQuery).toBe(1);
            const serialisedContext = JSON.stringify(context);
            expect(serialisedContext).not.toContain('content-type');
            expect(serialisedContext).not.toContain('application/json');
            expect(serialisedContext).not.toContain('verbose');
            // Nothing here compares object identity, so a defensive copy inside the logger
            // could not break these assertions: an entry count is a value, and the names and
            // values themselves are never handed to the logger in the first place.
            expect(context.timestamp).toMatch(ISO_8601);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A custom error subclass names itself, so its name is free-form text however
         * conventional it looks. 'ValidationError' and 'JaneDoeError' are the same kind of value
         * to any pattern that could be written for them - which is why the handler reports the
         * name only when it is one of the built-in error classes and omits every other, rather
         * than admitting anything ending in 'Error'.
         */
        it('omits a custom error name and never the message', () => {
            class ValidationError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'ValidationError';
                }
            }
            const err = new ValidationError('field is required');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().errorName).toBe('[omitted]');
            expect(logContext().errorMessage).toBe('[omitted]');
            const logged = allLoggedText();
            expect(logged).not.toContain('field is required');
            expect(logged).not.toContain('ValidationError');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A built-in error class name is drawn from a fixed vocabulary defined by the language,
         * so it is recorded as received. This is the positive half of the case above.
         */
        it('records a built-in error class name', () => {
            const err = new TypeError('cannot read property of undefined');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().errorName).toBe('TypeError');
            expect(allLoggedText()).not.toContain('cannot read property of undefined');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The user agent is read through req.get, which must be called with exactly
         * the 'User-Agent' header name.
         */
        it('reads the user agent through req.get with the User-Agent header name', () => {
            const err = new Error('Agent check');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(req.get).toHaveBeenCalledTimes(1);
            expect(req.get).toHaveBeenCalledWith('User-Agent');
            expect(logContext().userAgent).toBe('[omitted]');
            expect(allLoggedText()).not.toContain('jest-test-agent');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A request without a User-Agent header yields undefined, which must be
         * logged as-is rather than crashing or being substituted.
         */
        it('logs an undefined user agent when the header is absent', () => {
            const err = new Error('No agent');
            const req = createRequest({ get: jest.fn(() => undefined) });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(req.get).toHaveBeenCalledWith('User-Agent');
            expect(logContext().userAgent).toBeUndefined();
            expect('userAgent' in logContext()).toBe(true);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('sensitive value redaction', () => {
        /**
         * The central negative case. Every value the handler could conceivably retain
         * carries something a filter could not recognise: an opaque token as a header
         * name and as the error name, an unlabelled secret and a person's name in the
         * message, an opaque User-Agent, secret-bearing query and parameter names, and a
         * full IPv6 address. None of them may appear in any argument passed to the
         * logger, and the client must still receive the unchanged generic envelope.
         */
        it('keeps opaque secrets and personal data out of every logged argument', () => {
            // Every fixture below is placed in a position that a shape test WOULD have admitted:
            // an uppercase token as err.code matches an /^[A-Z][A-Z0-9_]+$/ 'stable code'; a name
            // ending in 'Error' matches a 'SomethingError' convention; a function name and file
            // path inside a well-formed frame match a frame-location pattern; and an unlabelled
            // path segment matches no credential pattern at all. Shape is not provenance, so the
            // handler admits values by list membership only and each of these is dropped.
            const err = new Error('Jane Doe of 12 Rue Nowhere rejected: A3F9K2QXOPAQUE1234567890');
            err.name = 'JaneDoeError';
            err.code = 'A3F9K2QXOPAQUE1234567890';
            err.stack = [
                'JaneDoeError: Jane Doe rejected',
                '    at A3F9K2QXOPAQUE1234567890 (/app/A3F9K2QXOPAQUE1234567890.js:1:1)'
            ].join('\n');
            const req = createRequest({
                method: 'POST',
                originalUrl: '/hello/A3F9K2QXOPAQUE1234567890?access_token=s3cr3t-token&email=jane.doe@example.com',
                url: '/hello',
                headers: {
                    host: 'tenant.example.com',
                    'x-eyJhbGciOiJIUzI1NiJ9': 'opaque-name-carrier',
                    authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.PAYLOAD.SIGNATURE',
                    cookie: 'session=abc123; csrf=zzz',
                    'x-api-key': 'key-9999'
                },
                params: { 'customer-jane.doe@example.com': 'C0NTRACTID' },
                query: { access_token: 's3cr3t-token', email: 'jane.doe@example.com' },
                ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
                get: jest.fn(() => 'OPAQUEAGENT/1.0 D4K9SECRET')
            });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            const logged = allLoggedText();
            ['A3F9K2QXOPAQUE1234567890', 'Jane Doe', 'Rue Nowhere', 'JaneDoeError',
                'eyJhbGciOiJIUzI1NiJ9', 'abc123', 'zzz', 'key-9999',
                'tenant.example.com', 'opaque-name-carrier', 's3cr3t-token',
                'jane.doe@example.com', 'C0NTRACTID', 'OPAQUEAGENT', 'D4K9SECRET',
                '8a2e:0370:7334']
                .forEach((planted) => {
                    expect(logged).not.toContain(planted);
                });

            // What the diagnostic does record: counts, an allow-listed method, the route
            // classification, the network portion of the address, and the omission markers.
            const context = logContext();
            expect(context.requestHeaders).toBe(5);
            expect(context.requestParams).toBe(1);
            expect(context.requestQuery).toBe(2);
            expect(context.requestMethod).toBe('POST');
            expect(context.requestUrl).toBe('[unmatched]?[REDACTED]');
            expect(context.clientIP).toBe('2001:0db8:85a3:x');
            expect(context.errorMessage).toBe('[omitted]');
            expect(context.errorName).toBe('[omitted]');
            expect(context.errorStack).toBe('[external]');
            expect(context.userAgent).toBe('[omitted]');

            // The client contract is untouched by any of the above.
            const payload = jsonPayload(res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(Object.keys(payload).sort()).toEqual(['error', 'path', 'status', 'timestamp']);
            expect(payload.error).toBe('Internal Server Error');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A listed code is the one error detail worth logging: membership of the module's list
         * establishes that the platform raised it, so it cannot carry request content. Every
         * other code is treated as free-form text and omitted - including one whose shape is
         * indistinguishable from a real code.
         */
        it('records a listed error code and omits anything that is not one', () => {
            const recognised = new Error('connection refused by the database');
            recognised.code = 'ECONNREFUSED';
            const req = createRequest();
            errorHandler(recognised, req, createResponse(), jest.fn());

            expect(logContext().errorMessage).toBe('ECONNREFUSED');
            expect(allLoggedText()).not.toContain('connection refused by the database');

            // Anything outside the list is omitted, whether or not it looks like a code. The
            // second fixture is the important one: it is an uppercase token indistinguishable in
            // shape from ENOENT, so only list membership separates the two.
            [
                'user jane.doe@example.com not found',
                'A3F9K2QXOPAQUE1234567890',
                'AKIAIOSFODNN7EXAMPLE',
                'SESSION_9F3B2A7C4D1E'
            ].forEach((code) => {
                errorSpy.mockClear();
                const unrecognised = new Error('lookup failed');
                unrecognised.code = code;
                errorHandler(unrecognised, createRequest(), createResponse(), jest.fn());

                expect(logContext().errorMessage).toBe('[omitted]');
                expect(allLoggedText()).not.toContain(code);
            });
        });

        /**
         * `err.stack` is writable, so every part of a frame is text of someone's choosing -
         * the function name and the file path just as much as anything appended after them.
         * A frame therefore contributes a module name from the handler's own list plus its line
         * and column, and nothing else. This case plants a secret in each position a frame has:
         * the message line, the function name, the file path, trailing text, and a line that is
         * not a frame at all.
         */
        it('records mapped module identifiers only, dropping every other part of a frame', () => {
            const err = new Error('outer failure');
            err.stack = [
                'Error: outer failure for jane.doe@example.com with token=hunter2',
                '    at authorizeA9X2OPAQUE (/app/auth.js:12:9) header="Authorization: Bearer LEAKME"',
                '    a hand written line carrying HANDWRITTENSECRET',
                '    at fetchUser (/app/SECRETINPATH/user.js:34:5)',
                '    at handler (/app/src/backend/routes/hello.js:42:9)'
            ].join('\n');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            // Two unknown files, then the one frame in a module this application owns.
            expect(logContext().errorStack).toBe('[external]\n[external]\nroutes/hello.js:42:9');
            const logged = allLoggedText();
            ['outer failure', 'jane.doe@example.com', 'hunter2', 'LEAKME', 'A9X2OPAQUE',
                'authorize', 'HANDWRITTENSECRET', 'hand written line', 'SECRETINPATH',
                'fetchUser', 'auth.js', 'user.js'].forEach((planted) => {
                expect(logged).not.toContain(planted);
            });
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * V8 writes several frame forms, and the async form is the one Express 5 produces when a
         * rejected promise is forwarded - exactly the path this handler exists to serve. A
         * pattern anchored on 'at <one token> (' silently drops all of these, so the location is
         * taken as the last file:line:column in the line instead.
         */
        it('recognises the async, constructor, anonymous and bare frame forms', () => {
            const err = new Error('async failure');
            err.stack = [
                'Error: async failure',
                '    at async handler (/app/src/backend/routes/hello.js:42:9)',
                '    at new Handler (/app/src/backend/app.js:1:1)',
                '    at Object.<anonymous> (/app/src/backend/server.js:7:3)',
                '    at /app/src/backend/middleware/errorHandler.js:5:2',
                '    at run (/app/node_modules/express/lib/router/index.js:5:1)'
            ].join('\n');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().errorStack.split('\n')).toEqual([
                'routes/hello.js:42:9',
                'app.js:1:1',
                'server.js:7:3',
                'middleware/errorHandler.js:5:2',
                '[external]'
            ]);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * V8 on Windows writes the same frame forms with '\' separators and a drive letter. The
         * module list is written with '/', so matching normalises separators - otherwise every
         * application frame on a platform this tutorial supports would be reported as external,
         * losing exactly the context the field exists for. Only the matched module name is
         * logged, never any part of the path.
         */
        it('maps Windows frame paths to the same module identifiers', () => {
            const err = new Error('windows failure');
            err.stack = [
                'Error: windows failure',
                '    at async handler (C:\\app\\src\\backend\\routes\\hello.js:42:9)',
                '    at new Handler (C:\\app\\src\\backend\\app.js:1:1)',
                '    at Object.<anonymous> (C:\\app\\src\\backend\\server.js:7:3)',
                '    at C:\\app\\src\\backend\\middleware\\errorHandler.js:5:2',
                '    at run (C:\\app\\node_modules\\express\\index.js:5:1)'
            ].join('\n');

            errorHandler(err, createRequest(), createResponse(), jest.fn());

            expect(logContext().errorStack.split('\n')).toEqual([
                'routes/hello.js:42:9',
                'app.js:1:1',
                'server.js:7:3',
                'middleware/errorHandler.js:5:2',
                '[external]'
            ]);

            // The drive letter and directory names are not copied out of the trace.
            const logged = allLoggedText();
            expect(logged).not.toContain('C:');
            expect(logged).not.toContain('\\app');
            expect(logged).not.toContain('node_modules');
        });

        /**
         * The line and column are the only part of a frame taken from the trace, so a frame
         * naming a real module at an absurd line is rejected rather than allowed to carry those
         * digits into the log.
         */
        it('rejects a frame whose line or column is out of range', () => {
            const err = new Error('range');
            err.stack = [
                'Error: range',
                '    at fn (/app/src/backend/app.js:12345678901234567890:1)',
                '    at fn (/app/src/backend/app.js:1:98765432109876543210)',
                '    at fn (/app/src/backend/app.js:12:34)'
            ].join('\n');

            errorHandler(err, createRequest(), createResponse(), jest.fn());

            expect(logContext().errorStack.split('\n')).toEqual([
                '[external]',
                '[external]',
                'app.js:12:34'
            ]);
            expect(allLoggedText()).not.toContain('12345678901234567890');
        });

        /**
         * At most five frames are recorded, so one error cannot write a page of
         * framework internals into the log.
         */
        it('records at most five stack frames', () => {
            const err = new Error('deep failure');
            const frames = Array.from(
                { length: 12 },
                (unused, index) => `    at frame${index} (/app/src/backend/app.js:${index}:1)`
            );
            err.stack = ['Error: deep failure'].concat(frames).join('\n');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            const stackLines = logContext().errorStack.split('\n');
            expect(stackLines).toHaveLength(5);
            expect(stackLines[0]).toBe('app.js:0:1');
            expect(stackLines[4]).toBe('app.js:4:1');
            expect(logContext().errorStack).not.toContain('frame');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A stack with no recognisable frame - one replaced wholesale with prose, for
         * example - records nothing rather than that prose.
         */
        it('records no stack when no line is a frame location', () => {
            const err = new Error('framed');
            err.stack = 'Error: framed\n    something else entirely about jane.doe@example.com';
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().errorStack).toBeUndefined();
            expect('errorStack' in logContext()).toBe(true);
            expect(allLoggedText()).not.toContain('jane.doe@example.com');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The method is client-supplied, so it is matched against the methods HTTP
         * defines rather than logged as received.
         */
        it('records an allow-listed method and omits anything else', () => {
            ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'TRACE', 'CONNECT']
                .forEach((method) => {
                    errorSpy.mockClear();
                    errorHandler(new Error('m'), createRequest({ method }), createResponse(), jest.fn());
                    expect(logContext().requestMethod).toBe(method);
                });

            errorSpy.mockClear();
            const req = createRequest({ method: 'BREW token=hunter2' });
            errorHandler(new Error('m'), req, createResponse(), jest.fn());

            expect(logContext().requestMethod).toBe('[omitted]');
            expect(allLoggedText()).not.toContain('hunter2');
        });

        /**
         * Nothing recorded here is copied from the request or the error, so there is nothing for
         * a length cap to act on: an oversized path becomes a label and an oversized code or
         * User-Agent is omitted. This asserts that no truncation marker is ever produced.
         */
        it('needs no truncation because no oversized value is admitted', () => {
            const err = new Error('oversized');
            err.code = `E${'C'.repeat(400)}`;
            const req = createRequest({
                originalUrl: `/hello/${'q'.repeat(400)}?token=s3cr3t`,
                get: jest.fn(() => 'u'.repeat(400))
            });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            // Nothing here is shortened, because nothing oversized is copied in the first place:
            // the path becomes a label, and the code and User-Agent are omitted outright.
            // Truncating a secret would not have redacted it.
            const context = logContext();
            expect(context.requestUrl).toBe('[unmatched]?[REDACTED]');
            expect(context.errorMessage).toBe('[omitted]');
            expect(context.userAgent).toBe('[omitted]');

            const logged = allLoggedText();
            expect(logged).not.toContain('s3cr3t');
            expect(logged).not.toContain('qqq');
            expect(logged).not.toContain('uuu');
            expect(logged).not.toContain('CCC');

            // Every recorded value is short by construction, so no marker is ever needed.
            expect(logged).not.toContain('...[truncated]');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * Counts are still reported when the maps are large, and nothing about their
         * contents is.
         */
        it('reports entry counts for headers, query and route parameters', () => {
            const query = {};
            for (let index = 0; index < 25; index += 1) {
                query[`field${index}`] = `value${index}`;
            }
            const err = new Error('many parameters');
            const req = createRequest({ query, params: {}, headers: { host: 'h', accept: '*/*' } });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            const context = logContext();
            expect(context.requestQuery).toBe(25);
            expect(context.requestHeaders).toBe(2);
            expect(context.requestParams).toBe(0);
            const logged = allLoggedText();
            expect(logged).not.toContain('field0');
            expect(logged).not.toContain('value0');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A request stub without headers, params or query - which is what a directly
         * invoked handler may receive - reports zero counts rather than throwing.
         */
        it('reports zero counts when headers, params and query are absent', () => {
            const err = new Error('bare request');
            const req = createRequest({ headers: undefined, params: undefined, query: undefined });
            const res = createResponse();
            const next = jest.fn();

            expect(() => errorHandler(err, req, res, next)).not.toThrow();

            const context = logContext();
            expect(context.requestHeaders).toBe(0);
            expect(context.requestParams).toBe(0);
            expect(context.requestQuery).toBe(0);
            expect(res.json).toHaveBeenCalledTimes(1);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The client address is reduced to its network portion for every address family,
         * including a full eight-hextet IPv6 address and the IPv4-mapped form, so no host
         * identifier survives.
         */
        it('records only the network portion of the client address', () => {
            const cases = [
                { ip: '203.0.113.24', expected: '203.0.113.x', host: '.24' },
                { ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334', expected: '2001:0db8:85a3:x', host: '8a2e:0370:7334' },
                { ip: '2001:db8::5', expected: '2001:db8:x', host: '::5' },
                { ip: '::ffff:10.0.0.7', expected: '10.0.0.x', host: '.7' },
                { ip: 'fe80::1%eth0', expected: 'fe80:x', host: '::1%eth0' },
                { ip: '::1', expected: 'x', host: '::1' },
                { ip: 'unknown-peer', expected: '[omitted]', host: 'unknown-peer' }
            ];

            cases.forEach(({ ip, expected, host }) => {
                errorSpy.mockClear();
                const req = createRequest({ ip });
                errorHandler(new Error('address handling'), req, createResponse(), jest.fn());

                expect(logContext().clientIP).toBe(expected);
                expect(allLoggedText()).not.toContain(host);
            });
        });

        /**
         * The address is validated before any part of it is used, because otherwise the presence
         * of a ':' does the deciding: an opaque token containing one would be split into
         * 'segments' and copied out as though it were a network. Every value below is something
         * a proxy header or a test double can put in `req.ip`, and none of them is an address, so
         * each is omitted whole rather than partially copied.
         */
        it('omits a client address that is not an address', () => {
            const invalid = [
                // A colon-bearing opaque token - the case a ':' test admits and a parser rejects.
                'A3F9K2QXOPAQUE1234567890:',
                'A3F9K2QXOPAQUE1234567890:B:C:D',
                // An oversized first segment, which no cap on the output would have shortened
                // had it been copied.
                `${'a'.repeat(300)}:b:c:d`,
                // Octets outside the valid range, which a permissive digit pattern accepts.
                '999.999.999.999',
                '10.0.0.256',
                // Host names and personal data that happen to carry a colon.
                'tenant.example.com:443',
                'jane.doe@example.com:x',
                // Control characters, which would otherwise forge a second log entry.
                'tok\r\n[INFO]: forged entry:x',
                // Structurally wrong addresses.
                ':::',
                '1.2.3',
                'not-an-address'
            ];

            invalid.forEach((ip) => {
                errorSpy.mockClear();
                errorHandler(new Error('address handling'), createRequest({ ip }), createResponse(), jest.fn());

                expect(logContext().clientIP).toBe('[omitted]');

                // Nothing recognisable from the input reaches any logged argument.
                const logged = allLoggedText();
                expect(logged).not.toContain(ip.slice(0, 12));
                expect(logged).not.toContain('forged entry');
            });
        });

        /**
         * Because a recorded address has been validated, every component of the logged value is a
         * decimal octet or a hex quartet - so the field is bounded by construction whatever the
         * length of the input was, and needs no cap of its own.
         */
        it('records an address short enough to need no bounding', () => {
            ['203.0.113.24', '2001:0db8:85a3:0000:0000:8a2e:0370:7334', `${'a'.repeat(300)}:b:c:d`]
                .forEach((ip) => {
                    errorSpy.mockClear();
                    errorHandler(new Error('address length'), createRequest({ ip }), createResponse(), jest.fn());

                    // 16 characters is the longest possible: three four-character hextets and ':x'.
                    expect(logContext().clientIP.length).toBeLessThanOrEqual(16);
                });
        });

        /**
         * With no address available from either source the field is reported as absent
         * rather than as the text 'undefined', and the diagnostic still reaches the log.
         */
        it('reports an absent client address as undefined', () => {
            const req = createRequest({ ip: undefined, connection: {} });
            const res = createResponse();
            const next = jest.fn();

            expect(() => errorHandler(new Error('no address'), req, res, next)).not.toThrow();

            expect(logContext().clientIP).toBeUndefined();
            expect('clientIP' in logContext()).toBe(true);
            expect(allLoggedText()).not.toContain('undefined');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A diagnostic needs to know which route failed, and the classification supplies that
         * without recording any part of the target. Content in a path segment is therefore not
         * masked - it is never copied at all, which is what covers the unlabelled opaque segment
         * and the personal data that no credential pattern would match.
         */
        it('classifies a path carrying labelled, unlabelled and personal content as unmatched', () => {
            const cases = [
                // A labelled credential and an e-mail address.
                { target: '/hello/token=hunter2/jane.doe@example.com', planted: ['hunter2', 'jane.doe@example.com'] },
                // An opaque segment with no label, no '?' and no recognisable shape. This is the
                // case masking cannot reach: there is nothing about it for a pattern to match.
                { target: '/hello/A3F9K2QXOPAQUE1234567890', planted: ['A3F9K2QXOPAQUE1234567890'] },
                // Personal data that is not an e-mail address.
                { target: '/hello/patients/Jane-Doe-1985-07-12', planted: ['Jane-Doe', '1985-07-12'] }
            ];

            cases.forEach(({ target, planted }) => {
                errorSpy.mockClear();
                errorHandler(new Error('path content'), createRequest({ originalUrl: target }), createResponse(), jest.fn());

                expect(logContext().requestUrl).toBe('[unmatched]');
                planted.forEach((value) => {
                    expect(allLoggedText()).not.toContain(value);
                });
            });
        });

        /**
         * The query delimiter is located before anything else is done to the target. Transforming
         * first is what loses the marker: a credential pattern whose match can span a '?' eats
         * the delimiter, and the value then reports no query where one was sent.
         */
        it('keeps the query marker when a labelled credential precedes the query', () => {
            const err = new Error('label before query');
            const req = createRequest({ originalUrl: '/hello/token=abc?foo=bar' });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().requestUrl).toBe('[unmatched]?[REDACTED]');
            const logged = allLoggedText();
            expect(logged).not.toContain('abc');
            expect(logged).not.toContain('foo=bar');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The label reports what the router will do, and Express matches this application's route
         * case-insensitively, accepts the absolute request form, and accepts up to two trailing
         * delimiters but no more - so those forms are recorded as the route, and one delimiter
         * further is recorded as unmatched because that is what the router answers.
         */
        it('records the route for the forms Express actually matches', () => {
            [['/hello', '/hello'], ['/HELLO', '/hello'], ['/hello/', '/hello'],
                ['/hello//', '/hello'], ['/hello?a=1', '/hello?[REDACTED]'],
                ['/hello//?a=1', '/hello?[REDACTED]'],
                // One delimiter more than the mount and the leaf allow: Express answers 404, so
                // the label must not name the route.
                ['/hello///', '[unmatched]'], ['/hello///?a=1', '[unmatched]?[REDACTED]'],
                // Absolute-form targets reach the route, because Express routes on the path.
                ['http://localhost:3000/hello', '/hello'],
                ['http://localhost:3000/hello//', '/hello'],
                ['http://localhost:3000/hello///', '[unmatched]'],
                ['http://localhost:3000', '[unmatched]'],
                ['http://user:pw@localhost:3000/hello', '/hello'],
                // The parser's host scan stops at each of these, so the path never reaches the
                // route and Express answers 404 - which the label must reflect.
                ['http://localhost:3000;tenant/hello', '[unmatched]'],
                ['http://localhost:3000%2Ftenant/hello', '[unmatched]'],
                ['http://localhost:3000\\tenant/hello', '[unmatched]'],
                // The boundary case: the parser reports '/hello' for these, but the router trims
                // the mount prefix from the raw target and is left with '/host\\hello', so the
                // route is never reached. Over the wire Node's HTTP parser answers 400 and no log
                // line is produced, so this matters for a directly invoked handler - which is the
                // only way this middleware is reached in this application.
                ['http://localhost:3000\\hello', '[unmatched]'],
                ['http://localhost:3000\\hello//', '[unmatched]'],
                ['http://localhost:3000\\hello?a=1', '[unmatched]?[REDACTED]'],
                // Rejected by Node's HTTP parser before any middleware sees it: this asserts the
                // classifier is safe when called directly, not that Express answered 404 for it.
                ['http://localhost:3000#fragment/hello', '[unmatched]'],
                ['http://localhost:3000;tenant/hello?a=1', '[unmatched]?[REDACTED]'],
                // No character here ends the host scan, so these reach the route - including ';'
                // and '%' in userinfo, which the parser resets past at the last '@'. Verified 200
                // against the running application.
                ['http://[::1]:3000/hello', '/hello'],
                ['http://user;name@localhost:3000/hello', '/hello'],
                ['http://user%3Aname@localhost:3000/hello', '/hello'],
                ['http://user%40x@localhost:3000/hello', '/hello'],
                ['http://user;name@localhost:3000/hello?a=1', '/hello?[REDACTED]'],
                // In the HOST the same characters do move where the host ends: 404, so unmatched.
                ['http://user@localhost:3000;tenant/hello', '[unmatched]'],
                // Rejected by the parser, and carrying no path component, respectively.
                ['http://[', '[unmatched]'],
                ['mailto:jane.doe@example.com', '[unmatched]'],
                ['/hello/../hello', '[unmatched]'], ['/hello%2f', '[unmatched]'],
                ['/helloX', '[unmatched]'], ['/hello/x', '[unmatched]'],
                // The root, and a target of nothing but slashes, normalise to '/' - which is
                // not a route this application registers.
                ['/', '[unmatched]'], ['//', '[unmatched]']].forEach(([target, expected]) => {
                errorSpy.mockClear();
                errorHandler(new Error('route form'), createRequest({ originalUrl: target }), createResponse(), jest.fn());

                expect(logContext().requestUrl).toBe(expected);
            });
        });

        /**
         * A target with no path component at all yields no path to classify. Both sources must be
         * empty to reach this: an empty `originalUrl` is falsy, so the handler's documented
         * `|| req.url` fallback would otherwise supply the path instead.
         */
        it('reports a target with no path component as unmatched', () => {
            const req = createRequest({ originalUrl: '', url: '' });
            const res = createResponse();
            const next = jest.fn();

            expect(() => errorHandler(new Error('no path'), req, res, next)).not.toThrow();

            expect(logContext().requestUrl).toBe('[unmatched]');
            expect(res.json).toHaveBeenCalledTimes(1);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * With neither originalUrl nor url present there is no path to record, so the
         * field reports its omission and the handler still answers.
         */
        it('reports an omitted path when the request carries no target', () => {
            const req = createRequest({ originalUrl: undefined, url: undefined });
            const res = createResponse();
            const next = jest.fn();

            expect(() => errorHandler(new Error('no target'), req, res, next)).not.toThrow();

            expect(logContext().requestUrl).toBe('[omitted]');
            expect(jsonPayload(res).path).toBeUndefined();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * An error forwarded as a plain object has no code, name or stack. Each field
         * reports its omission rather than the text 'undefined', and the handler still
         * answers the client.
         */
        it('reports omissions for an error carrying no code, name or stack', () => {
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler({}, req, res, next);

            const context = logContext();
            expect(context.errorMessage).toBe('[omitted]');
            expect(context.errorName).toBe('[omitted]');
            expect(context.errorStack).toBeUndefined();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * A request that sent no User-Agent is distinguishable from one that did: the
         * field is absent rather than carrying the omission marker.
         */
        it('omits the user agent field entirely when none was sent', () => {
            const req = createRequest({ get: jest.fn(() => undefined) });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(new Error('no agent'), req, res, next);

            expect(logContext().userAgent).toBeUndefined();
            expect('userAgent' in logContext()).toBe(true);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * The response path deliberately keeps the client's own request target,
         * including any query string: the client sent it and already holds it, and it is
         * the only field that lets a caller correlate the 500 with its own request. The
         * logged copy is the one that must not keep it - asserting both here keeps the
         * distinction explicit rather than accidental.
         */
        it('redacts the logged path while the client envelope keeps its own request target', () => {
            const err = new Error('path handling');
            const req = createRequest({ originalUrl: '/hello?access_token=s3cr3t-token' });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().requestUrl).toBe('/hello?[REDACTED]');
            expect(allLoggedText()).not.toContain('s3cr3t-token');
            expect(jsonPayload(res).path).toBe('/hello?access_token=s3cr3t-token');
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('request fallback branches', () => {
        /**
         * Covers the left-hand side of `req.originalUrl || req.url` for BOTH the log
         * context (line 110) and the response path (line 145). `url` deliberately
         * differs from `originalUrl` so a silent swap of the two would fail here.
         */
        it('prefers originalUrl over url for the log context and the response path', () => {
            const err = new Error('Url precedence');
            const req = createRequest({ originalUrl: '/hello', url: '/rewritten-internally' });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().requestUrl).toBe('/hello');
            expect(jsonPayload(res).path).toBe('/hello');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * Covers the right-hand side of the same fallback: when originalUrl is
         * absent, req.url is used for both the log context and the response path.
         */
        it('falls back to url when originalUrl is absent', () => {
            const err = new Error('Url fallback');
            const req = createRequest({ originalUrl: undefined, url: '/hello' });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            // The fallback is read from req.url, then classified like any other target. The
            // client's own envelope still carries the target verbatim - the caller already
            // holds it, and needs it to correlate the failure with its request.
            expect(logContext().requestUrl).toBe('/hello');
            expect(jsonPayload(res).path).toBe('/hello');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * Covers the left-hand side of `req.ip || req.connection.remoteAddress`:
         * req.ip wins even when a different connection address is available.
         */
        it('prefers req.ip for the logged client IP', () => {
            const err = new Error('Ip precedence');
            const req = createRequest({ ip: '192.168.1.50', connection: { remoteAddress: '10.0.0.7' } });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().clientIP).toBe('192.168.1.x');
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * Covers the right-hand side of the client-IP fallback: with req.ip absent,
         * connection.remoteAddress is used.
         */
        it('falls back to connection.remoteAddress when req.ip is absent', () => {
            const err = new Error('Ip fallback');
            const req = createRequest({ ip: undefined, connection: { remoteAddress: '10.0.0.7' } });
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(logContext().clientIP).toBe('10.0.0.x');
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('terminal behaviour', () => {
        /**
         * The handler is the final middleware in the stack: it must never call next,
         * because the response has already been written.
         */
        it('never calls next', () => {
            const err = new Error('Terminal');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(next).not.toHaveBeenCalled();
        });

        /**
         * Express identifies error middleware by arity, so the four-argument
         * signature is part of the contract and worth a cheap regression guard.
         */
        it('is a four-argument Express error middleware function', () => {
            expect(typeof errorHandler).toBe('function');
            expect(errorHandler).toHaveLength(4);
        });

        /**
         * The handler finishes the response synchronously; callers must not await it.
         *
         * Both effects the handler owes - the diagnostic log and the single response write -
         * have already happened by the time the call returns, with nothing awaited. The
         * return value is deliberately not asserted: Express ignores whatever error
         * middleware returns, so the very common `return res.status(500).json(payload);`
         * form is behaviourally identical and must not fail this suite.
         */
        it('completes the response synchronously, without anything to await', () => {
            const err = new Error('Sync');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledTimes(1);
            expectStatusSetBeforeBodySent(res);
            expect(next).not.toHaveBeenCalled();
        });

        /**
         * Verifies spy and mock isolation across cases: running after every case
         * above, this invocation must see exactly one logger.error call and one
         * res.json call of its own.
         */
        it('records exactly one log and one response per invocation', () => {
            const err = new Error('Isolation');
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            errorHandler(err, req, res, next);

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledTimes(1);
            expect(jsonPayload(res).status).toBe(500);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
