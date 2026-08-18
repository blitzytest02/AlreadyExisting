// Jest Testing Framework - v30.4.2 - unit testing for Node.js applications
// The handler is invoked directly with mock err/req/res/next objects. No HTTP
// client and no Express app are involved, which keeps every fallback branch
// reachable and lets the JSON envelope be inspected as a plain object.

// Import the terminal error-handling middleware under test.
// middleware/errorHandler.js line 192 is `module.exports = { errorHandler };`
// so this module has a NAMED export (its sibling requestLogger.js is a DEFAULT
// export - the two shapes are deliberately different and must not be normalised).
const { errorHandler } = require('../../middleware/errorHandler');

// Import the shared logger object so logger.error can be spied on.
// utils/logger.js line 141 is `module.exports = { logger };` -> NAMED export.
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
 *
 * Contract boundary worth keeping straight: this 500 JSON envelope applies ONLY to
 * errors explicitly forwarded with next(err). Requests to unmatched paths or with
 * unmatched methods continue to receive Express's default 404 handling and never
 * reach this handler.
 *
 * Behaviour under test (middleware/errorHandler.js lines 96-157):
 * - One logger.error call: a fixed prefix string plus one eleven-key diagnostic
 *   object (lines 103-122).
 * - res.status(500) (line 127) followed by res.json with a four-key envelope
 *   (lines 134-146).
 * - `req.originalUrl || req.url` for both the logged requestUrl (line 110) and the
 *   response path (line 145).
 * - `req.ip || req.connection.remoteAddress` for the logged client IP (line 121).
 * - `req.get('User-Agent')` for the logged user agent (line 118).
 * - next() is intentionally never called: the handler terminates the cycle.
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

    /** ISO-8601 shape produced by Date.prototype.toISOString(). */
    const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    describe('client response contract', () => {
        /**
         * Asserts the status code and the exact key set of the JSON envelope. The
         * key set is asserted by length AND membership so that an added, renamed or
         * removed field is caught rather than silently accepted.
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

            const payload = jsonPayload(res);
            expect(Object.keys(payload)).toHaveLength(4);
            expect(Object.keys(payload).sort()).toEqual(['error', 'path', 'status', 'timestamp']);
            expect(payload.error).toBe('Internal Server Error');
            expect(payload.status).toBe(500);
            expect(payload.path).toBe('/hello');
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

            errorHandler(err, req, res, jest.fn());

            const { timestamp } = jsonPayload(res);
            expect(typeof timestamp).toBe('string');
            expect(timestamp).toMatch(ISO_8601);
            expect(new Date(timestamp).toISOString()).toBe(timestamp);
        });

        /**
         * The envelope is generic by design: it must not leak the error message, the
         * error name or the stack trace to the client, all of which are logged
         * server-side instead. The literal 'Internal Server Error' is the intended
         * generic text, so the assertions target the leaked-detail substrings and the
         * diagnostic field names rather than the word "Error".
         */
        it('does not leak error details to the client', () => {
            const err = new Error('database credentials rejected');
            err.stack = 'Error: database credentials rejected\n    at leakyCall (secretModule.js:1:1)';
            const req = createRequest();
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            const payload = jsonPayload(res);
            const serialised = JSON.stringify(payload);
            expect(payload.error).toBe('Internal Server Error');
            expect(serialised).not.toContain('database credentials rejected');
            expect(serialised).not.toContain('secretModule.js');
            expect(serialised).not.toContain('at leakyCall');
            expect(payload.errorMessage).toBeUndefined();
            expect(payload.errorStack).toBeUndefined();
            expect(payload.errorName).toBeUndefined();

            // The detail is retained server-side for debugging instead of being sent.
            expect(logContext().errorMessage).toBe('database credentials rejected');
            expect(logContext().errorStack).toContain('secretModule.js');
        });

        /**
         * res.json is the only response method the handler may use; send/set/end must
         * remain untouched so the cycle terminates exactly once.
         */
        it('uses only res.status and res.json to terminate the response', () => {
            const err = new Error('Single write');
            const req = createRequest();
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(res.json).toHaveBeenCalledTimes(1);
            expect(res.send).not.toHaveBeenCalled();
            expect(res.set).not.toHaveBeenCalled();
            expect(res.end).not.toHaveBeenCalled();
        });
    });

    describe('diagnostic logging', () => {
        /**
         * Asserts the two-argument log call and the exact eleven-key diagnostic
         * context, including identity pass-through of the request objects.
         */
        it('logs the prefix string and an eleven-key diagnostic context', () => {
            const err = new Error('Handler blew up');
            const req = createRequest({
                method: 'POST',
                headers: { host: 'localhost:3000' },
                params: { id: '1' },
                query: { verbose: 'true' }
            });
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

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

            expect(context.errorMessage).toBe('Handler blew up');
            expect(context.errorName).toBe('Error');
            expect(typeof context.errorStack).toBe('string');
            expect(context.errorStack).toContain('Handler blew up');
            expect(context.requestMethod).toBe('POST');
            expect(context.requestHeaders).toBe(req.headers);
            expect(context.requestParams).toBe(req.params);
            expect(context.requestQuery).toBe(req.query);
            expect(context.timestamp).toMatch(ISO_8601);
        });

        /**
         * Custom error subclasses must have their own name reported, proving the
         * handler reads err.name rather than assuming 'Error'.
         */
        it('reports a custom error name and message', () => {
            class ValidationError extends Error {
                constructor(message) {
                    super(message);
                    this.name = 'ValidationError';
                }
            }
            const err = new ValidationError('field is required');
            const req = createRequest();
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(logContext().errorName).toBe('ValidationError');
            expect(logContext().errorMessage).toBe('field is required');
            expect(res.status).toHaveBeenCalledWith(500);
        });

        /**
         * The user agent is read through req.get, which must be called with exactly
         * the 'User-Agent' header name.
         */
        it('reads the user agent through req.get with the User-Agent header name', () => {
            const err = new Error('Agent check');
            const req = createRequest();
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(req.get).toHaveBeenCalledTimes(1);
            expect(req.get).toHaveBeenCalledWith('User-Agent');
            expect(logContext().userAgent).toBe('jest-test-agent');
        });

        /**
         * A request without a User-Agent header yields undefined, which must be
         * logged as-is rather than crashing or being substituted.
         */
        it('logs an undefined user agent when the header is absent', () => {
            const err = new Error('No agent');
            const req = createRequest({ get: jest.fn(() => undefined) });
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(req.get).toHaveBeenCalledWith('User-Agent');
            expect(logContext().userAgent).toBeUndefined();
            expect('userAgent' in logContext()).toBe(true);
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

            errorHandler(err, req, res, jest.fn());

            expect(logContext().requestUrl).toBe('/hello');
            expect(jsonPayload(res).path).toBe('/hello');
        });

        /**
         * Covers the right-hand side of the same fallback: when originalUrl is
         * absent, req.url is used for both the log context and the response path.
         */
        it('falls back to url when originalUrl is absent', () => {
            const err = new Error('Url fallback');
            const req = createRequest({ originalUrl: undefined, url: '/fallback-path' });
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(logContext().requestUrl).toBe('/fallback-path');
            expect(jsonPayload(res).path).toBe('/fallback-path');
        });

        /**
         * Covers the left-hand side of `req.ip || req.connection.remoteAddress`:
         * req.ip wins even when a different connection address is available.
         */
        it('prefers req.ip for the logged client IP', () => {
            const err = new Error('Ip precedence');
            const req = createRequest({ ip: '192.168.1.50', connection: { remoteAddress: '10.0.0.7' } });
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(logContext().clientIP).toBe('192.168.1.50');
        });

        /**
         * Covers the right-hand side of the client-IP fallback: with req.ip absent,
         * connection.remoteAddress is used.
         */
        it('falls back to connection.remoteAddress when req.ip is absent', () => {
            const err = new Error('Ip fallback');
            const req = createRequest({ ip: undefined, connection: { remoteAddress: '10.0.0.7' } });
            const res = createResponse();

            errorHandler(err, req, res, jest.fn());

            expect(logContext().clientIP).toBe('10.0.0.7');
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
         * The handler is synchronous and returns nothing; callers must not await it.
         */
        it('returns undefined synchronously', () => {
            const err = new Error('Sync');
            const req = createRequest();
            const res = createResponse();

            const result = errorHandler(err, req, res, jest.fn());

            expect(result).toBeUndefined();
            expect(res.json).toHaveBeenCalledTimes(1);
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

            errorHandler(err, req, res, jest.fn());

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledTimes(1);
            expect(jsonPayload(res).status).toBe(500);
        });
    });
});
