// Jest Testing Framework - v30.4.2 - unit testing for Node.js applications
// No HTTP client is required here: the middleware is invoked directly with mock
// req/res/next objects, which is faster and covers branches that a route-level
// request can never reach (for example a non-serializable request body).

// Import the request logging middleware under test.
// middleware/requestLogger.js ends with `module.exports = requestLogger;`, so this
// module has a DEFAULT export: a plain (req, res, next) function.
const requestLogger = require('../../middleware/requestLogger');

// Import the shared logger object so its methods can be spied on.
// utils/logger.js ends with `module.exports = { logger };` -> NAMED export.
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
 * What this suite deliberately does NOT cover, and where that lives instead:
 * calling the middleware directly says nothing about whether app.js ever registers it,
 * or registers it ahead of the router - a middleware can be fully covered here and
 * unmounted in production. That registration and its position are asserted by
 * behaviour in tests/integration/hello.test.js, under 'Application Composition and
 * Middleware Ordering', which re-assembles app.js against recorded doubles and reads
 * back the stages a request actually traversed. The division is intentional: branch
 * coverage of the logic belongs here, proof that the logic is wired in belongs there,
 * and neither substitutes for the other.
 *
 * Within this suite the temporal contract IS asserted: the request must be logged before
 * the request is allowed to continue. See expectRequestLogged, which every case uses.
 *
 * Behaviour under test:
 * - `method` comes from req.method.
 * - `method` is recorded only when HTTP defines it, otherwise '[omitted]'.
 * - `path` is a CLASSIFICATION of req.originalUrl, not the target: the known route it
 *   asked for, '[unmatched]', or '[omitted]', with the marker '?[REDACTED]' appended
 *   when a query string was present. No character of the received target is logged, so
 *   nothing here is masked or truncated. There is deliberately NO `|| req.url` fallback,
 *   so every mock request supplies originalUrl.
 * - Body normalisation: absent/null -> '{}', object -> JSON.stringify, a serialization
 *   failure or an undefined result -> '[Object - Unable to serialize]' (a failure also
 *   logs a fixed reason, never the thrown message), primitive -> String().
 * - The body and the serialization-failure reason are the only values that can grow;
 *   each is a single line of at most 200 characters, marker included.
 * - A single logger.info call with seven ordered arguments; console joins them with
 *   spaces, which is why expected output reads `Method: GET Path: /hello`.
 * - next() is called unconditionally, outside the try/catch.
 *
 * Why the query assertions matter: a query string is written by the client, and
 * clients put access tokens, passwords and e-mail addresses in one. Logging it
 * verbatim copies that secret into console output and from there into whatever
 * collects it - the CWE-532 exposure. The cases under 'sensitive value redaction'
 * are negative-leakage regression tests: they assert the secret appears in NO
 * argument of NO logger call, so re-introducing the raw request target fails the
 * suite rather than passing quietly.
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
     * Asserts the single logger.info call, its exact seven-argument shape, and that it
     * happened BEFORE the request was allowed to continue.
     *
     * The argument count is asserted as well as the values so that an argument
     * added to or dropped from the log statement is caught immediately.
     *
     * The ordering assertion is what makes this middleware a request logger rather than a
     * response logger, and it cannot be stated by counting calls: `logger.info` and
     * `next` are both called exactly once whichever way round they appear in the source.
     * Jest records a global, monotonically increasing sequence number for every mock
     * invocation in `mock.invocationCallOrder`, so comparing the two numbers states the
     * temporal contract directly - move `next()` above the log statement and downstream
     * routing, the response, and any downstream log line would all be emitted before this
     * request was recorded. Every case routes through this helper, so no case can be
     * accidentally left unordered.
     *
     * @param {string} method - Expected HTTP method logged
     * @param {string} path - Expected request path logged
     * @param {string} body - Expected normalised body string logged
     * @param {Function} next - The jest.fn() continuation handed to the middleware, whose
     *     invocation order the log call is compared against
     */
    const expectRequestLogged = (method, path, body, next) => {
        expect(infoSpy).toHaveBeenCalledTimes(1);
        expect(infoSpy).toHaveBeenCalledWith(
            'HTTP Request -',
            'Method:', method,
            'Path:', path,
            'Body:', body
        );
        expect(infoSpy.mock.calls[0]).toHaveLength(7);
        expect(infoSpy.mock.invocationCallOrder[0])
            .toBeLessThan(next.mock.invocationCallOrder[0]);
    };

    /**
     * Asserts that the serialisation diagnostic was recorded before the request log line.
     *
     * The catch block runs while the log arguments are still being assembled, so the full
     * temporal contract of a failing body is `logger.error` -> `logger.info` -> `next`.
     * The first two are compared here and the second pair by expectRequestLogged, which
     * together pin the whole sequence. Without this, a diagnostic emitted after the request
     * line - or after the request had already moved on - would still satisfy the call counts.
     */
    const expectDiagnosticLoggedBeforeRequest = () => {
        expect(errorSpy.mock.invocationCallOrder[0])
            .toBeLessThan(infoSpy.mock.invocationCallOrder[0]);
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

    /**
     * Collects every argument of every logger call made during a case into one
     * string, so a leak can be asserted against the whole log output rather than
     * against one field that happened to be checked.
     *
     * @returns {string} All info and error arguments joined together
     */
    const allLoggedText = () =>
        infoSpy.mock.calls
            .concat(errorSpy.mock.calls)
            .map((args) => args.map((arg) => String(arg)).join(' '))
            .join('\n');

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

            expectRequestLogged('GET', '/hello', '{}', next);
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

            expectRequestLogged('POST', '/hello', '{}', next);
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

            expectRequestLogged('POST', '/hello', JSON.stringify(body), next);
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

            expectRequestLogged('PUT', '/hello', JSON.stringify(body), next);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * Covers the primitive branch for a string body, and also shows that a path
         * carrying a query string keeps its route while the query content is replaced.
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

            expectRequestLogged('POST', '/hello?[REDACTED]', 'raw text', next);
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

            expectRequestLogged('PATCH', '/hello', '42', next);
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

            expectRequestLogged('DELETE', '/hello', 'true', next);
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

            expectRequestLogged('POST', '/hello', 'false', next);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });
    });

    describe('serialisation failure handling', () => {
        /**
         * Covers the catch branch with a circular object, the canonical JSON.stringify
         * failure. The diagnostic carries a fixed reason rather than the thrown
         * message, so the assertion pins all four arguments exactly.
         */
        it('falls back to a placeholder and logs a diagnostic for a circular body', () => {
            const body = {};
            body.self = body;
            const req = createRequest({ method: 'POST', body });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '/hello', '[Object - Unable to serialize]', next);
            expectDiagnosticLoggedBeforeRequest();

            expect(errorSpy).toHaveBeenCalledTimes(1);
            const errorArgs = errorSpy.mock.calls[0];
            expect(errorArgs).toHaveLength(4);
            expect(errorArgs[0]).toBe('Request body serialization failed:');
            expect(errorArgs[1]).toBe('the body could not be converted to JSON for logging');
            expect(errorArgs[2]).toBe('for path:');
            expect(errorArgs[3]).toBe('/hello');

            // next() sits outside the try/catch, so the request must still proceed.
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * The thrown error's own message must NOT reach the log. A body's toJSON can
         * throw anything, so its message is attacker-influenced free-form text: this
         * one carries a credential and a newline that would forge a second log entry
         * if it were passed through. Neither may appear in any logger argument.
         */
        it('logs a fixed reason instead of the thrown error message', () => {
            const req = createRequest({
                method: 'POST',
                originalUrl: '/hello/deep-path',
                body: {
                    toJSON() {
                        throw new Error('serialisation exploded token=hunter2\n[INFO]: forged line');
                    }
                }
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('POST', '[unmatched]', '[Object - Unable to serialize]', next);
            expectDiagnosticLoggedBeforeRequest();

            // The failure entry reports the same classified label as the request line, so the
            // second call cannot reintroduce the target the first one withheld.
            expect(errorSpy).toHaveBeenCalledWith(
                'Request body serialization failed:',
                'the body could not be converted to JSON for logging',
                'for path:',
                '[unmatched]'
            );
            expect(errorSpy).toHaveBeenCalledTimes(1);
            const logged = allLoggedText();
            expect(logged).not.toContain('serialisation exploded');
            expect(logged).not.toContain('hunter2');
            expect(logged).not.toContain('forged line');
            expect(logged).not.toContain('deep-path');
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * JSON.stringify returns undefined - without throwing - for a value it cannot
         * represent, such as an object whose toJSON() returns undefined. That result is
         * treated as a serialization failure rather than handed on: passing a non-string
         * to the bounding helper would throw, and the request would never continue.
         *
         * Because it IS a failure, it is reported like one. The two ways a body can fail to
         * serialize are the same event to anyone reading the log, so this asserts the identical
         * fixed diagnostic the throwing branch produces - a branch that recorded nothing would
         * leave an inability to serialize silent in one case and logged in the other.
         */
        it('treats an undefined serialisation result as unserialisable, reports it and continues', () => {
            const req = createRequest({
                method: 'POST',
                body: {
                    toJSON() {
                        return undefined;
                    }
                }
            });
            const res = createResponse();
            const next = jest.fn();

            expect(() => requestLogger(req, res, next)).not.toThrow();

            expectRequestLogged('POST', '/hello', '[Object - Unable to serialize]', next);
            expectDiagnosticLoggedBeforeRequest();
            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy).toHaveBeenCalledWith(
                'Request body serialization failed:',
                'the body could not be converted to JSON for logging',
                'for path:',
                '/hello'
            );
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

            expectRequestLogged('POST', '/hello', '[Object - Unable to serialize]', next);
            expectDiagnosticLoggedBeforeRequest();
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

            expectRequestLogged('POST', '/hello', '7', next);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });
    });

    describe('sensitive value redaction', () => {
        /**
         * The negative-leakage case for the tutorial's own endpoint: a client puts an
         * access token, a password and an e-mail address in the query string of the
         * one route that exists. None of those values may appear anywhere in the log,
         * and the route itself must still be identifiable.
         */
        it('never logs query values, only that a query string was present', () => {
            const req = createRequest({
                originalUrl: '/hello?access_token=s3cr3t-token&password=hunter2&email=jane.doe@example.com'
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('GET', '/hello?[REDACTED]', '{}', next);

            const logged = allLoggedText();
            expect(logged).not.toContain('s3cr3t-token');
            expect(logged).not.toContain('hunter2');
            expect(logged).not.toContain('jane.doe@example.com');
            expect(logged).not.toContain('access_token');
            expect(logged).toContain('/hello?[REDACTED]');
            expect(next).toHaveBeenCalledTimes(1);
            expectResponseUntouched(res);
        });

        /**
         * A bare '?' with nothing after it still produces the marker, proving the
         * redaction is driven by the delimiter rather than by the content that
         * follows it.
         */
        it('marks an empty query string rather than logging a bare question mark', () => {
            const req = createRequest({ originalUrl: '/hello?' });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('GET', '/hello?[REDACTED]', '{}', next);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
        });

        /**
         * A secret does not have to be in the query to be in the URL, and capping is not
         * redaction: 200 characters of `GET /A3F9K2QXOPAQUE1234567890` is the whole token. The
         * logged path is therefore a classification, so a secret placed anywhere in the target -
         * labelled, unlabelled, before or after a '?' - never reaches the log.
         */
        it('classifies a path carrying a secret rather than capping it', () => {
            const cases = [
                { target: `/hello/${'p'.repeat(400)}`, expected: '[unmatched]', planted: 'ppp' },
                { target: '/A3F9K2QXOPAQUE1234567890', expected: '[unmatched]', planted: 'A3F9K2QXOPAQUE1234567890' },
                { target: '/hello/api-key=key-9999', expected: '[unmatched]', planted: 'key-9999' },
                { target: '/hello/patients/Jane-Doe-1985-07-12', expected: '[unmatched]', planted: 'Jane-Doe' }
            ];

            cases.forEach(({ target, expected, planted }) => {
                infoSpy.mockClear();
                errorSpy.mockClear();
                const next = jest.fn();

                requestLogger(createRequest({ originalUrl: target }), createResponse(), next);

                expect(infoSpy.mock.calls[0][4]).toBe(expected);
                expect(allLoggedText()).not.toContain(planted);
                expect(allLoggedText()).not.toContain('...[truncated]');
                expect(next).toHaveBeenCalledTimes(1);
            });
        });

        /**
         * A long, query-bearing target still reports that a query was present. The route portion
         * is a fixed label, so there is nothing left for truncation to cut the marker off.
         */
        it('keeps the query marker on an oversized query-bearing path', () => {
            const req = createRequest({
                originalUrl: `/hello/${'p'.repeat(400)}?access_token=s3cr3t-token`
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            const loggedPath = infoSpy.mock.calls[0][4];
            expect(loggedPath).toBe('[unmatched]?[REDACTED]');
            expect(allLoggedText()).not.toContain('s3cr3t-token');
            expect(allLoggedText()).not.toContain('ppp');
            expect(next).toHaveBeenCalledTimes(1);
        });

        /**
         * A value containing a newline would otherwise appear as an extra log entry,
         * letting a client write a line of its own choosing into the log. Newlines are
         * collapsed, so one request produces exactly one line.
         */
        it('collapses newlines so a body cannot forge a second log entry', () => {
            const req = createRequest({
                method: 'POST',
                body: 'harmless\n[INFO]: HTTP Request - Method: GET Path: /forged Body: {}'
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            const loggedBody = infoSpy.mock.calls[0][6];
            expect(loggedBody).not.toContain('\n');
            expect(loggedBody).toBe(
                'harmless [INFO]: HTTP Request - Method: GET Path: /forged Body: {}'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        /**
         * The same cap applies to the serialised body, which is unbounded once a body
         * parser is mounted. The truncated value is still valid log output; it is
         * simply not the whole document.
         */
        it('caps an oversized body at 200 characters including the marker', () => {
            const req = createRequest({ method: 'POST', body: 'x'.repeat(500) });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            const loggedBody = infoSpy.mock.calls[0][6];
            expect(loggedBody).toHaveLength(200);
            expect(loggedBody.endsWith('...[truncated]')).toBe(true);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
        });

        /**
         * The serialisation-failure diagnostic quotes the path, so it must quote the
         * redacted one. This is the second logger call in the module and the easiest
         * place for a raw request target to survive unnoticed.
         */
        it('redacts the query in the serialisation-failure diagnostic too', () => {
            const body = {};
            body.self = body;
            const req = createRequest({
                method: 'POST',
                originalUrl: '/hello?api_key=leak-me',
                body
            });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(errorSpy.mock.calls[0][3]).toBe('/hello?[REDACTED]');
            expect(allLoggedText()).not.toContain('leak-me');
            expect(next).toHaveBeenCalledTimes(1);
        });

        /**
         * A request stub without a request target is not something HTTP can produce,
         * but the middleware is a plain function and may be called directly. It logs
         * the stringified absent value rather than throwing, which is what the
         * pre-existing behaviour did, and the request still continues.
         */
        it('logs an absent request target without throwing', () => {
            const req = { method: 'GET' };
            const res = createResponse();
            const next = jest.fn();

            expect(() => requestLogger(req, res, next)).not.toThrow();

            // An absent target is reported as omitted rather than as the text 'undefined',
            // which would read as a route by that name.
            expect(infoSpy.mock.calls[0][4]).toBe('[omitted]');
            expect(allLoggedText()).not.toContain('undefined');
            expect(next).toHaveBeenCalledTimes(1);
        });
    });

    describe('request metadata pass-through and continuation', () => {
        /**
         * The middleware runs before routing, so it sees targets that will not match any route.
         * It reports them as unmatched rather than as received: an unmatched target is precisely
         * the one nobody chose the contents of, and a 404 is no reason to write those contents to
         * the log. The method is recorded because HTTP defines it.
         */
        it('reports an unmatched target as unmatched and records the method', () => {
            const req = createRequest({ method: 'GET', originalUrl: '/nonexistent' });
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expectRequestLogged('GET', '[unmatched]', '{}', next);
            expect(allLoggedText()).not.toContain('nonexistent');
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * The route label reports what Express will actually do with the target, which is to
         * match case-insensitively, to accept the absolute request form, and to accept up to two
         * trailing delimiters but no more. A method HTTP does not define is omitted, since it
         * reaches this middleware as client-supplied text.
         */
        it('records the matched route for every form Express matches, and omits an unknown method', () => {
            // Each expectation below was checked against the running application: a label naming
            // the route appears only where Express answered 200, and '[unmatched]' only where it
            // answered 404. Normalising away any number of trailing slashes, or ignoring the
            // absolute form, would break that correspondence in one direction or the other.
            [['/hello', '/hello'], ['/HELLO', '/hello'], ['/Hello', '/hello'],
                ['/hello/', '/hello'], ['/hello//', '/hello'],
                // Three trailing delimiters is one more than the mount and the leaf allow, so
                // Express answers 404 and the label must not name the route.
                ['/hello///', '[unmatched]'], ['/hello////', '[unmatched]'],
                // Absolute-form targets reach the route, because Express routes on the path.
                ['http://localhost:3000/hello', '/hello'],
                ['HTTP://localhost:3000/hello', '/hello'],
                ['http://localhost:3000/hello//', '/hello'],
                ['http://localhost:3000/hello///', '[unmatched]'],
                ['http://localhost:3000/other', '[unmatched]'],
                // An authority with no path addresses the root.
                ['http://localhost:3000', '[unmatched]'],
                // Userinfo does not change the path.
                ['http://user:pw@localhost:3000/hello', '/hello'],
                // Authority terminators are where a hand-written pattern goes wrong. The parser's
                // host scan stops at each of these, so the path is ';tenant/hello',
                // '%2Ftenant/hello' or '//tenant/hello' - none of which reaches the route, and
                // Express answers 404 for all three.
                ['http://localhost:3000;tenant/hello', '[unmatched]'],
                ['http://localhost:3000%2Ftenant/hello', '[unmatched]'],
                ['http://localhost:3000\\tenant/hello', '[unmatched]'],
                // The boundary case: here the parser turns the backslash into a separator and
                // reports the path as '/hello', so classifying from the parsed path alone would
                // name the route - while the router, which trims the mount prefix from the raw
                // target, is left with '/host\\hello' and never reaches it. Over the wire Node's
                // HTTP parser answers 400 for these and no log line is produced at all, so
                // refusing to name the route costs no real attribution.
                ['http://localhost:3000\\hello', '[unmatched]'],
                ['http://localhost:3000\\hello/', '[unmatched]'],
                ['http://localhost:3000\\hello//', '[unmatched]'],
                ['http://localhost:3000\\hello?a=1', '[unmatched]?[REDACTED]'],
                ['http://localhost:3000\\\\hello', '[unmatched]'],
                // A fragment-bearing target is likewise rejected by Node's HTTP parser before any
                // middleware sees it; this asserts the classifier is safe when called directly,
                // not that Express answered 404 for it.
                ['http://localhost:3000#fragment/hello', '[unmatched]'],
                // Userinfo and an IPv6-literal authority contain no character that ends the host
                // scan, so these do reach the route and must be named. ';' and '%' are ordinary
                // characters in userinfo - the parser resets its host scan at the last '@' - so
                // declining them would withhold an attribution that exists. The running
                // application answers 200 for every one of these.
                ['http://user:pw@localhost:3000/hello', '/hello'],
                ['http://[::1]:3000/hello', '/hello'],
                ['http://user;name@localhost:3000/hello', '/hello'],
                ['http://user%3Aname@localhost:3000/hello', '/hello'],
                ['http://user%40x@localhost:3000/hello', '/hello'],
                ['http://us;er@localhost:3000/hello/', '/hello'],
                ['http://user;name@localhost:3000/hello?a=1', '/hello?[REDACTED]'],
                // The same characters in the HOST are a different matter: there they do move where
                // the host ends, the router answers 404, and the label must say unmatched.
                ['http://user@localhost:3000;tenant/hello', '[unmatched]'],
                // A target the parser rejects outright reaches no route either.
                ['http://[', '[unmatched]'],
                // A target with no path component at all yields no path to classify.
                ['', '[unmatched]'], ['mailto:jane.doe@example.com', '[unmatched]'],
                // Dot segments and encoded or parameterised segments are not normalised by the
                // router, so none of these reaches the route either.
                ['/hello/../hello', '[unmatched]'], ['/hello/./', '[unmatched]'],
                ['/hello%2f', '[unmatched]'], ['/hello;x', '[unmatched]'],
                ['/helloX', '[unmatched]'], ['//hello', '[unmatched]'],
                // The root, and a target of nothing but slashes, normalise to '/' - which is
                // not a route this application registers.
                ['/', '[unmatched]'], ['//', '[unmatched]']].forEach(([target, expected]) => {
                infoSpy.mockClear();
                requestLogger(createRequest({ originalUrl: target }), createResponse(), jest.fn());

                expect(infoSpy.mock.calls[0][4]).toBe(expected);
            });

            infoSpy.mockClear();
            requestLogger(createRequest({ method: 'BREW' }), createResponse(), jest.fn());
            expect(infoSpy.mock.calls[0][2]).toBe('[omitted]');
            expect(allLoggedText()).not.toContain('BREW');
        });

        /**
         * Regression guard for the one thing Express infers from this function's shape.
         *
         * Express reads arity for a single purpose: a function declaring exactly four
         * parameters is error-handling middleware and is skipped for normal requests. Any
         * other arity is ordinary middleware. So the behavioural requirement is "not four",
         * not "exactly three" - a rest-parameter or defaulted-parameter rewrite reports a
         * different length while behaving identically, and pinning the exact number would
         * fail such a refactor for no reason. The three-parameter form the source uses is
         * asserted through behaviour instead: every case above hands the middleware a
         * request, a response and a continuation and checks what it does with them.
         */
        it('is registered as ordinary middleware rather than error middleware', () => {
            expect(typeof requestLogger).toBe('function');
            expect(requestLogger.length).not.toBe(4);
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
            expectRequestLogged('GET', '/hello', '{}', next);
            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });

        /**
         * The middleware completes its whole job synchronously.
         *
         * Both observable effects - the log line and the continuation - are already
         * recorded by the time the call returns, with nothing awaited and no timer
         * advanced. That is the property Express depends on: it hands control to the next
         * layer when next() is called, and takes no interest in what a middleware returns.
         * The return value is deliberately not asserted; it is ignored by the framework,
         * so a source rewrite to `return next();` - a common and behaviour-preserving idiom
         * - must not fail this suite.
         */
        it('logs and continues synchronously, without anything to await', () => {
            const req = createRequest();
            const res = createResponse();
            const next = jest.fn();

            requestLogger(req, res, next);

            expect(infoSpy).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
            expectRequestLogged('GET', '/hello', '{}', next);
            expect(errorSpy).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalledWith();
            expectResponseUntouched(res);
        });
    });
});
