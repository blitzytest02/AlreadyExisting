// Jest Testing Framework - v30.4.2 - unit testing for Node.js applications
// No HTTP client is required here: the middleware is invoked directly with mock
// req/res/next objects, which is faster and covers branches that a route-level
// request can never reach (for example a non-serializable request body).

// Import the request logging middleware under test.
// middleware/requestLogger.js line 167 is `module.exports = requestLogger;`
// so this module has a DEFAULT export: a plain (req, res, next) function.
const requestLogger = require('../../middleware/requestLogger');

// Import the shared logger object so its methods can be spied on.
// utils/logger.js line 141 is `module.exports = { logger };` -> NAMED export.
// The logger is a plain object literal with arrow-function properties, so
// jest.spyOn() can replace them without any jest.mock() factory.
const { logger } = require('../../utils/logger');

/**
 * requestLogger Middleware Unit Test Suite
 *
 * Covers the request-logging middleware named by jest.config.js's
 * `collectCoverageFrom` entry 'middleware/**\/*.js', which is measured against the
 * four 90% global coverage thresholds (branches, functions, lines, statements).
 *
 * Test Architecture:
 * - The middleware is exercised DIRECTLY, not through Supertest or an Express app,
 *   so every body-normalisation branch is reachable and independently assertable.
 * - Fresh mock req/res/next objects are built for every case; no mutable state is
 *   shared between cases.
 * - logger.info and logger.error are replaced with scoped spies and explicitly
 *   restored after each case. jest.config.js sets `clearMocks: true`, which clears
 *   recorded calls only - it does NOT restore original implementations - so the
 *   explicit restore below is required to avoid leaking a mocked logger.
 *
 * Behaviour under test (middleware/requestLogger.js lines 92-147):
 * - `method` comes from req.method (line 95).
 * - `path` comes from req.originalUrl (line 101). There is deliberately NO
 *   `|| req.url` fallback here, so every mock request supplies originalUrl.
 * - Body normalisation (lines 108-131): absent/null -> '{}', object ->
 *   JSON.stringify, non-serializable object -> '[Object - Unable to serialize]'
 *   plus a logger.error diagnostic, primitive -> String().
 * - A single logger.info call with seven ordered arguments (lines 136-141).
 * - next() is called unconditionally, outside the try/catch (line 146).
 *
 * The middleware is a passive observer: it never touches the response object.
 */
describe('requestLogger middleware', () => {
    let infoSpy;
    let errorSpy;

    /**
     * Replace both logger methods before every case.
     *
     * mockImplementation(() => {}) suppresses the real console output so the test
     * log stays readable, without editing utils/logger.js (a reference module that
     * must not change).
     */
    beforeEach(() => {
        infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
        errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    });

    /**
     * Restore the real logger implementations after every case so no mocked
     * function leaks into a later case or a sibling suite.
     */
    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Builds a minimal Express-like request object.
     *
     * Defaults describe the tutorial's only endpoint (GET /hello). `body` is
     * intentionally absent by default, which mirrors a real GET request and
     * exercises the `req.body === undefined` branch.
     *
     * @param {Object} [overrides] - Properties to add to or replace on the request
     * @returns {Object} A fresh mock request object
     */
    const createRequest = (overrides = {}) => ({
        method: 'GET',
        originalUrl: '/hello',
        ...overrides
    });

    /**
     * Builds a mock response whose every method is an observable spy.
     *
     * The middleware must not call any of these; asserting that proves the
     * "non-destructive observer" contract documented in the middleware source.
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
     * Asserts the single logger.info call and its exact seven-argument shape.
     *
     * The argument count is asserted as well as the values so that an argument
     * added to or dropped from the log statement is caught immediately.
     *
     * @param {string} method - Expected HTTP method logged
     * @param {string} path - Expected request path logged
     * @param {string} body - Expected normalised body string logged
     */
    const expectRequestLogged = (method, path, body) => {
        expect(infoSpy).toHaveBeenCalledTimes(1);
        expect(infoSpy).toHaveBeenCalledWith(
            'HTTP Request -',
            'Method:', method,
            'Path:', path,
            'Body:', body
        );
        expect(infoSpy.mock.calls[0]).toHaveLength(7);
    };

    /**
     * Asserts that the middleware left the response object completely untouched.
     *
     * @param {Object} res - The mock response handed to the middleware
     */
    const expectResponseUntouched = (res) => {
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
        expect(res.set).not.toHaveBeenCalled();
        expect(res.end).not.toHaveBeenCalled();
    };

    describe('request body normalisation', () => {
        /**
         * Covers the outer else branch (lines 127-131) via a short-circuited
         * `req.body !== undefined` check: the property is simply absent, which is
         * exactly what a real GET request looks like without a body parser.
         */
        it('logs empty object notation when req.body is undefined', () => {
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('GET', '/hello', '{}');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Covers the SECOND operand of `req.body !== undefined && req.body !== null`
         * (line 108). The undefined case above short-circuits on the first operand,
         * so this explicit null case is what makes that branch covered - omitting it
         * silently forfeits branch coverage against the 90% threshold.
         */
        it('logs empty object notation when req.body is explicitly null', () => {
            const req = createRequest({ method: 'POST', body: null });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', '{}');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Covers the object branch (line 110 -> line 114). The expectation is the
         * computed JSON.stringify value rather than a hand-typed string so the test
         * asserts the middleware's behaviour, not a duplicate of it.
         */
        it('serialises an object body with JSON.stringify', () => {
            const body = { name: 'John', email: 'john@example.com' };
            const req = createRequest({ method: 'POST', body });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', JSON.stringify(body));
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Arrays are `typeof 'object'`, so they take the same serialisation branch.
         * Included to prove the branch handles nested structures, not just flat maps.
         */
        it('serialises an array body with JSON.stringify', () => {
            const body = [1, 'two', { three: true }];
            const req = createRequest({ method: 'PUT', body });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('PUT', '/hello', JSON.stringify(body));
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Covers the primitive branch (lines 123-126) for a string body, and also
         * exercises originalUrl pass-through for a path carrying a query string.
         */
        it('converts a string body with String()', () => {
            const req = createRequest({
                method: 'POST',
                originalUrl: '/hello?verbose=true',
                body: 'raw text'
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello?verbose=true', 'raw text');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Covers the primitive branch for a numeric body. String(42) is '42', so a
         * number is logged without quoting.
         */
        it('converts a numeric body with String()', () => {
            const req = createRequest({ method: 'PATCH', body: 42 });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('PATCH', '/hello', '42');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Covers the primitive branch for a boolean body. `false` is deliberately
         * NOT used here because the source guards on undefined/null rather than
         * truthiness; `true` and `false` both reach String(), and the falsy variant
         * is asserted below to prove the guard is not a truthiness check.
         */
        it('converts a boolean body with String()', () => {
            const req = createRequest({ method: 'DELETE', body: true });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('DELETE', '/hello', 'true');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Guards against the guard on line 108 being weakened to a truthiness
         * check: `false` is falsy but neither undefined nor null, so it must be
         * logged as 'false' and never as '{}'.
         */
        it('logs a falsy boolean body as false rather than empty object notation', () => {
            const req = createRequest({ method: 'POST', body: false });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', 'false');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });
    });

    describe('serialisation failure handling', () => {
        /**
         * Covers the catch branch (lines 115-122) with a circular object, the
         * canonical JSON.stringify failure. The thrown message is captured from the
         * spy rather than hard-coded, because the exact wording is engine-specific.
         */
        it('falls back to a placeholder and logs a diagnostic for a circular body', () => {
            const body = {};
            body.self = body;
            const req = createRequest({ method: 'POST', body });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', '[Object - Unable to serialize]');

            expect(errorSpy).toHaveBeenCalledTimes(1);
            const errorArgs = errorSpy.mock.calls[0];
            expect(errorArgs).toHaveLength(4);
            expect(errorArgs[0]).toBe('Request body serialization failed:');
            expect(typeof errorArgs[1]).toBe('string');
            expect(errorArgs[1].length).toBeGreaterThan(0);
            expect(errorArgs[2]).toBe('for path:');
            expect(errorArgs[3]).toBe('/hello');

            // next() sits outside the try/catch, so the request must still proceed.
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Proves the thrown error's own message is passed through to logger.error
         * (line 121) rather than a fixed string, using a toJSON hook that throws a
         * message this test controls.
         */
        it('passes the thrown error message through to the diagnostic log', () => {
            const req = createRequest({
                method: 'POST',
                originalUrl: '/hello/deep-path',
                body: {
                    toJSON() {
                        throw new Error('serialisation exploded');
                    }
                }
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello/deep-path', '[Object - Unable to serialize]');
            expect(errorSpy).toHaveBeenCalledWith(
                'Request body serialization failed:',
                'serialisation exploded',
                'for path:',
                '/hello/deep-path'
            );
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * A BigInt nested inside an object is non-serializable and therefore takes
         * the catch branch. A BARE BigInt would instead be `typeof 'bigint'` and
         * take the String() branch, which the following case pins down.
         */
        it('falls back to a placeholder when an object contains a BigInt', () => {
            const req = createRequest({ method: 'POST', body: { big: BigInt(1) } });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', '[Object - Unable to serialize]');
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * A bare BigInt is a primitive, so it is stringified by String() and must
         * NOT trigger the serialisation-failure diagnostic.
         */
        it('converts a bare BigInt body with String() and logs no diagnostic', () => {
            const req = createRequest({ method: 'POST', body: BigInt(7) });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', '7');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });
    });

    describe('request metadata pass-through and continuation', () => {
        /**
         * Confirms req.method and req.originalUrl are logged verbatim for a path
         * that matches no application route. The middleware runs before routing, so
         * it logs unmatched paths exactly as received; asserting this documents that
         * ordering without exercising any route.
         */
        it('logs the method and originalUrl exactly as received', () => {
            const req = createRequest({ method: 'GET', originalUrl: '/nonexistent' });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('GET', '/nonexistent', '{}');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Regression guard for the middleware's Express signature: three declared
         * parameters mark it as ordinary (non-error) middleware.
         */
        it('is a three-argument Express middleware function', () => {
            expect(typeof requestLogger).toBe('function');
            expect(requestLogger).toHaveLength(3);
        });

        /**
         * Verifies spy isolation: this case runs after the serialisation-failure
         * cases above, and logger.error must show zero calls here. If a spy leaked
         * between cases, this assertion would fail.
         */
        it('reports no error diagnostics for a clean request after a failing one', () => {
            const req = createRequest({ method: 'GET', originalUrl: '/hello' });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expect(errorSpy).toHaveBeenCalledTimes(0);
            expectRequestLogged('GET', '/hello', '{}');
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * The middleware is synchronous and returns nothing; callers rely on next()
         * for continuation rather than a return value or a promise.
         */
        it('returns undefined synchronously', () => {
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            const result = requestLogger(req, res, next);

            expect(result).toBeUndefined();
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });
    });
});
