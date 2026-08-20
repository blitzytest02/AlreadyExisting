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
 * On an error forwarded to it, the handler writes one diagnostic log entry of nine fields - ten
 * in development, where the error's stack is added - sets status 500, marks the response
 * `X-Content-Type-Options: nosniff`, and sends a generic four-key JSON envelope. It deliberately
 * never calls `next()`: it is the terminal middleware, and the response is already sent by the
 * time it returns.
 *
 * The nosniff header is contract too, and for a specific reason: the envelope's `path` field
 * hands the caller's own target back verbatim, so a target carrying raw markup ends up inside a
 * JSON body. The header is what stops a content-sniffing client deciding that body is HTML. It
 * is asserted by name, by value, by call count and by ordering, because a header set after the
 * body has been written would be too late to have any effect.
 *
 * Four properties of the diagnostic are contract rather than detail, and are asserted as such:
 *
 *   requestHeaders   copied from the allow-list ['host', 'content-type', 'accept'] rather than
 *                    from `req.headers` wholesale, so a credential the client sent in an
 *                    `Authorization` header or a `Cookie` is not written to the log (CWE-532)
 *   requestPath      the PATHNAME of the target, not the target. The query string is where a
 *                    caller's values live - `?password=...` - and Express hands this handler the
 *                    DECODED form of them in `req.query`, so recording it would put both a live
 *                    secret and a genuine control character in a log file. What is kept instead is
 *                    `requestQueryParameterCount`: that a query was present, and how large
 *   every value      escaped to printable ASCII and bounded to 256 characters, so no caller can
 *                    forge a log entry, drive the terminal reading the log, or make one request
 *                    cost an unbounded amount of it
 *   errorStack       present only when `config.nodeEnv === 'development'`, because every frame
 *                    in it names an absolute filesystem path
 *
 * The response envelope is deliberately NOT subject to the pathname rule: its `path` field hands
 * the caller its own target back verbatim, because that is what lets the caller correlate the
 * failure with the request it sent, and the caller already has the value. The log and the envelope
 * therefore disagree about `path` on purpose, and the fallback cases below assert both halves of
 * that in the same breath.
 *
 * Its branching expressions have two sides each, and both sides of each are covered here:
 *
 *   requestPath  req.originalUrl || req.url, then with and without a query or fragment to cut
 *   clientIP     req.ip || req.connection.remoteAddress
 *   path         req.originalUrl || req.url          (the response field)
 *   errorStack   development or not
 *   headers      present or absent, allow-listed name present or absent
 *   params       present or absent
 *   query        present or absent
 *   bound        value short enough to keep, or long enough to truncate
 *
 * Note on the environment these cases run in: Jest sets `NODE_ENV=test` and `dotenv` does not
 * override a variable the environment already carries, so `config.nodeEnv` is `'test'` here and
 * the stack is omitted by default. The development branch is reached with
 * `jest.replaceProperty`, which `jest.restoreAllMocks()` in `afterEach` puts back.
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

// The configuration object the handler reads `nodeEnv` from. It is the same singleton the
// handler requires, so replacing the property here is what the handler sees.
const config = require('../../config');

/**
 * Every key the diagnostic log entry carries outside development, in no particular order.
 *
 * Asserting the exact key set - not merely that these are present - is what makes an added
 * field a test failure. That matters for a diagnostic: a field silently gaining request
 * content is precisely the change this assertion exists to catch. `userAgent` is absent by
 * design; the handler no longer reads it, because a value the client chose is not needed to
 * reproduce a server-side failure. `requestQuery` is absent for the same reason and a stronger
 * one - it held the decoded values of the caller's query string - and the count that replaced it
 * carries what a reproduction actually needs from it.
 *
 * @constant {string[]}
 */
const DIAGNOSTIC_KEYS = [
    'errorMessage',
    'errorName',
    'requestPath',
    'requestMethod',
    'requestHeaders',
    'requestParams',
    'requestQueryParameterCount',
    'timestamp',
    'clientIP'
];

/**
 * The one field development adds, whose absence elsewhere is the point of the gate.
 *
 * @constant {string}
 */
const DEVELOPMENT_ONLY_KEY = 'errorStack';

/**
 * The request headers the diagnostic is allowed to record. Kept here as a literal rather than
 * imported from the middleware, so a change to the allow-list has to be made deliberately in
 * two places instead of silently agreeing with itself.
 *
 * @constant {string[]}
 */
const ALLOWED_HEADERS = ['host', 'content-type', 'accept'];

/**
 * ISO-8601 shape with milliseconds and a `Z` suffix, which is what `Date#toISOString`
 * produces. Timestamps are asserted by shape, never by value.
 *
 * @constant {RegExp}
 */
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * The bound the handler applies to every value it records, restated here.
 *
 * Restated rather than imported for the same reason the allow-list above is: the handler exports
 * one function, the bound is an internal decision, and a test that reached inside for it would be
 * asserting the implementation rather than the contract. Stating the number here means changing
 * the bound has to be done deliberately in both places.
 *
 * @constant {number}
 */
const MAX_LOGGED_VALUE_LENGTH = 256;

/**
 * Asserts that a recorded value consists only of printable ASCII.
 *
 * The property, not a re-spelling of the handler's escape, so these cases hold however the escape
 * is written and fail if any class of interpretable character starts reaching the log again.
 *
 * @param {string} value - a value read back from the diagnostic
 * @returns {void}
 */
function expectPrintableAscii(value) {
    expect(typeof value).toBe('string');
    expect(value).toMatch(/^[\x20-\x7E]*$/);
}

/**
 * Builds a fresh mock request.
 *
 * `connection` is always present so that the `clientIP` fallback can be selected simply by
 * leaving `ip` out. `get` is present although the handler no longer calls it: it is a spy, and
 * a case below asserts it was never invoked - which is how this suite records that no
 * header-derived value reaches the diagnostic by a second route.
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
 * Builds a fresh mock response with chainable `status`, `set` and `json` spies.
 *
 * The handler calls them as three separate statements, so chaining is not strictly required -
 * but returning `this` matches how Express actually behaves and costs nothing, and it means
 * this mock would still work if the calls were ever chained.
 *
 * `send` and `end` are present although the handler calls neither: they are spies precisely so
 * that a case can assert the body was written by `json` alone. Every spy records its invocation
 * order, which is what lets the header cases assert `set` ran before `json` flushed the headers.
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

        it('sends exactly one JSON body and writes it by no other means', () => {
            errorHandler(err, req, res, next);

            expect(res.json).toHaveBeenCalledTimes(1);
            expect(res.send).not.toHaveBeenCalled();
            expect(res.end).not.toHaveBeenCalled();
        });

        it('marks the response nosniff, and sets no other header', () => {
            errorHandler(err, req, res, next);

            // The value matters as much as the name: 'nosniff' is the only directive the header
            // defines, and a client ignores anything else. Both are pinned, so a typo in either
            // fails here rather than in a browser.
            expect(res.set).toHaveBeenCalledTimes(1);
            expect(res.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        });

        it('sets the nosniff header before the body is written', () => {
            errorHandler(err, req, res, next);

            // Ordering is the whole point of a response header: res.json flushes the headers
            // with the body, so a header set afterwards never reaches the client at all.
            expect(res.set.mock.invocationCallOrder[0])
                .toBeLessThan(res.json.mock.invocationCallOrder[0]);
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

        it('records exactly the nine documented fields outside development', () => {
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(Object.keys(diagnostic)).toHaveLength(9);
            expect(Object.keys(diagnostic).sort()).toEqual(DIAGNOSTIC_KEYS.slice().sort());
        });

        it('adds the stack, and only the stack, in development', () => {
            jest.replaceProperty(config, 'nodeEnv', 'development');

            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(Object.keys(diagnostic)).toHaveLength(10);
            expect(Object.keys(diagnostic).sort())
                .toEqual(DIAGNOSTIC_KEYS.concat(DEVELOPMENT_ONLY_KEY).sort());
            expect(diagnostic[DEVELOPMENT_ONLY_KEY]).toBe(err.stack);
            expect(typeof diagnostic[DEVELOPMENT_ONLY_KEY]).toBe('string');
        });

        it('withholds the stack outside development, so no absolute path is logged', () => {
            // 'test' is what Jest sets, and 'production' is what a deployment sets. Neither is
            // 'development', and the check is an equality rather than a negation, so both take
            // the same branch - asserted here rather than assumed.
            for (const environment of ['test', 'production', 'staging', '']) {
                jest.replaceProperty(config, 'nodeEnv', environment);
                logger.error.mockClear();

                errorHandler(err, req, res, next);

                const diagnostic = loggedDiagnostic();

                expect(Object.keys(diagnostic)).not.toContain(DEVELOPMENT_ONLY_KEY);
                expect(diagnostic[DEVELOPMENT_ONLY_KEY]).toBeUndefined();
                expect(JSON.stringify(diagnostic)).not.toContain('errorHandler.test.js');
            }
        });

        it('records the error message and name from the forwarded error', () => {
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.errorMessage).toBe('something went wrong');
            expect(diagnostic.errorName).toBe('Error');
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

        it('passes the request method through, copies the params, and counts the query', () => {
            const params = { id: '7' };
            const query = { greeting: 'world', page: '2' };
            const request = createRequest({
                method: 'POST',
                params: params,
                query: query
            });

            errorHandler(err, request, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.requestMethod).toBe('POST');

            // Route parameters are named by the application, so they are recorded - but as a copy
            // with neutralised values, never as a live view of `req.params`.
            expect(diagnostic.requestParams).toEqual({ id: '7' });
            expect(diagnostic.requestParams).not.toBe(params);

            // The query's values are the caller's, so only their number is recorded.
            expect(diagnostic.requestQueryParameterCount).toBe(2);
            expect(JSON.stringify(diagnostic)).not.toContain('greeting');
            expect(JSON.stringify(diagnostic)).not.toContain('world');
        });

        it('records a zero query count when the target carried no query string', () => {
            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestQueryParameterCount).toBe(0);
        });

        it('records a zero query count when req.query is absent altogether', () => {
            // Express always populates `req.query`, so this is the defensive side of the branch:
            // a handler whose job is to answer when something has already gone wrong must not be
            // the thing that throws.
            const request = createRequest({ query: undefined });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestQueryParameterCount).toBe(0);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledTimes(1);
        });

        it('records an empty params object when the request carries no params at all', () => {
            const request = createRequest({ params: undefined });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestParams).toEqual({});
            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('neutralises both halves of a route parameter', () => {
            // A wildcard route elsewhere can name a parameter from the target, and its value comes
            // from the caller either way, so name and value are treated alike.
            const request = createRequest({
                params: { 'we\u202Eird': 'va\u001blue' }
            });

            errorHandler(err, request, res, next);

            const recorded = loggedDiagnostic().requestParams;
            const [name] = Object.keys(recorded);

            expectPrintableAscii(name);
            expectPrintableAscii(recorded[name]);
            expect(JSON.stringify(recorded)).not.toContain('\u202E');
            expect(JSON.stringify(recorded)).not.toContain('\u001b');
        });

        it('stamps the diagnostic with a round-trippable ISO-8601 timestamp', () => {
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.timestamp).toMatch(ISO_8601);
            expect(new Date(diagnostic.timestamp).toISOString()).toBe(diagnostic.timestamp);
        });

        it('records only the allow-listed headers, so a credential the client sent stays out', () => {
            const request = createRequest({
                headers: {
                    host: 'localhost:3000',
                    'content-type': 'application/json',
                    accept: '*/*',
                    authorization: 'Bearer test-token-AAAA1111',
                    cookie: 'session=test-session-BBBB2222',
                    'x-api-key': 'test-api-key-CCCC3333',
                    'user-agent': 'jest-test-agent',
                    'x-invented-by-the-client': 'test-header-DDDD4444'
                }
            });

            errorHandler(err, request, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.requestHeaders).toEqual({
                host: 'localhost:3000',
                'content-type': 'application/json',
                accept: '*/*'
            });
            expect(Object.keys(diagnostic.requestHeaders)).toEqual(ALLOWED_HEADERS);

            // The whole entry, not just that one field: a credential must not reach the log
            // through any field, however the diagnostic is later reshaped.
            const serialised = JSON.stringify(diagnostic);
            for (const secret of [
                'Bearer test-token-AAAA1111',
                'test-token-AAAA1111',
                'test-session-BBBB2222',
                'test-api-key-CCCC3333',
                'test-header-DDDD4444',
                'authorization',
                'x-api-key',
                'user-agent'
            ]) {
                expect(serialised).not.toContain(secret);
            }
        });

        it('omits an allow-listed header the request did not send', () => {
            // Only `host` is present, so the other two are absent rather than undefined - the
            // logged object shows what the request carried, not what it might have carried.
            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestHeaders).toEqual({ host: 'localhost:3000' });
        });

        it('records an empty header object when the request carries no headers at all', () => {
            // Express always assembles `req.headers`, so this is the defensive side of the
            // branch: whatever else happens, the handler must still answer.
            const request = createRequest({ headers: undefined });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestHeaders).toEqual({});
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledTimes(1);
        });

        it('copies the headers rather than holding a reference to req.headers', () => {
            errorHandler(err, req, res, next);

            const recorded = loggedDiagnostic().requestHeaders;

            expect(recorded).not.toBe(req.headers);

            // A header arriving after the diagnostic was written cannot appear in it.
            req.headers.authorization = 'Bearer added-after-the-fact';
            expect(loggedDiagnostic().requestHeaders).not.toHaveProperty('authorization');
            expect(recorded).toEqual({ host: 'localhost:3000' });
        });

        it('never reads req.get, so no header value enters the diagnostic by another route', () => {
            errorHandler(err, req, res, next);

            expect(req.get).not.toHaveBeenCalled();
            expect(Object.keys(loggedDiagnostic())).not.toContain('userAgent');
        });
    });

    /**
     * The three two-sided expressions. Each is covered from both sides, and the
     * originalUrl-present case deliberately gives `url` a DIFFERENT value so that a silent
     * swap of the two would fail rather than pass unnoticed.
     */
    describe('request fallback branches', () => {
        it('prefers originalUrl over url, logging its pathname and echoing it whole', () => {
            const request = createRequest({
                originalUrl: '/hello?greeting=world',
                url: '/rewritten-by-middleware'
            });

            errorHandler(err, request, res, next);

            // Both read `req.originalUrl || req.url`, and they part company after that: the log
            // keeps the part that identifies the route, and the envelope hands the caller back the
            // target it sent. Asserted together because separately each looks like an oversight.
            expect(loggedDiagnostic().requestPath).toBe('/hello');
            expect(sentPayload(res).path).toBe('/hello?greeting=world');
        });

        it('falls back to url in both the log and the response when originalUrl is absent', () => {
            const request = createRequest({ originalUrl: undefined, url: '/hello' });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestPath).toBe('/hello');
            expect(sentPayload(res).path).toBe('/hello');
        });

        it('logs the pathname of the fallback url too, not the whole fallback target', () => {
            // The cut is applied after the fallback, not to `originalUrl` alone, so a rewritten
            // `req.url` carrying a query is treated exactly like an original one.
            const request = createRequest({
                originalUrl: undefined,
                url: '/hello?password=hunter2'
            });

            errorHandler(err, request, res, next);

            expect(loggedDiagnostic().requestPath).toBe('/hello');
            expect(JSON.stringify(loggedDiagnostic())).not.toContain('hunter2');
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
     * Log-integrity: the decoded query, header values, and everything else the caller supplies.
     *
     * This handler is where the control-character problem was reachable, and the reason is worth
     * keeping: `requestLogger` reads `req.originalUrl`, which keeps percent-encoding intact, so
     * `%1B` stays three characters there. This handler used to read `req.query`, and Express's
     * query parser percent-DECODES, so a target of `?x=%E2%80%AE%1B%5B2J` arrived as genuine
     * U+202E and ESC. Verified against a live Express app: that target yields `req.query.x` with
     * codepoints U+202E U+001B U+005B U+0032 U+004A, while `req.originalUrl` for the identical
     * request stays `"/t?x=%E2%80%AE%1B%5B2J"`.
     *
     * Two rules close it. The decoded query is not recorded at all - only how many parameters it
     * held - and every value that IS recorded is escaped to printable ASCII and bounded. The cases
     * below assert both: that the caller's values are absent, and that what remains is inert.
     *
     * Reaching this handler needs an application error to be forwarded, and no route in this
     * tutorial raises one, so this was latent rather than open. It is asserted here so that the
     * guarantee is machine-checked for whoever adds the first route that can fail.
     */
    describe('log output neutralisation', () => {
        it('does not record a decoded query value, bidi override or otherwise', () => {
            // What Express hands the handler after decoding ?x=%E2%80%AE, not the raw target.
            const req = createRequest({ query: { x: '\u202Etxt.exe' } });

            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();
            const serialised = JSON.stringify(diagnostic);

            expect(diagnostic).not.toHaveProperty('requestQuery');
            expect(diagnostic.requestQueryParameterCount).toBe(1);
            expect(serialised).not.toContain('txt.exe');
            expect(serialised).not.toContain('\u202E');
        });

        it('does not record a decoded ANSI escape sequence from a query value', () => {
            const req = createRequest({ query: { x: '\u001b[2J' } });

            errorHandler(err, req, res, next);

            expect(JSON.stringify(loggedDiagnostic())).not.toContain('\u001b');
            expect(loggedDiagnostic().requestQueryParameterCount).toBe(1);
        });

        it('does not record decoded C0 controls from a query value', () => {
            const req = createRequest({ query: { x: 'first\r\nforged' } });

            errorHandler(err, req, res, next);

            // The log-forging shape - one entry that renders as two - closed by the value never
            // being recorded. It arrives via the decoded query rather than the target: Node's HTTP
            // parser rejects a raw CRLF in a target with 400 before any middleware runs.
            const serialised = JSON.stringify(loggedDiagnostic());
            expect(serialised).not.toContain('forged');
            expect(serialised).not.toContain('\r');
            expect(serialised).not.toContain('\n');
        });

        it('does not record Unicode separators from a query value', () => {
            const req = createRequest({ query: { x: 'before\u2028after\u2029end' } });

            errorHandler(err, req, res, next);

            const serialised = JSON.stringify(loggedDiagnostic());
            expect(serialised).not.toContain('\u2028');
            expect(serialised).not.toContain('\u2029');
        });

        it('counts query parameters without recording any of their names or values', () => {
            const req = createRequest({
                query: { password: 'hunter2', token: 'abc123', redirect: '/somewhere' }
            });

            errorHandler(err, req, res, next);

            const serialised = JSON.stringify(loggedDiagnostic());
            expect(loggedDiagnostic().requestQueryParameterCount).toBe(3);
            for (const absent of ['password', 'hunter2', 'token', 'abc123', 'somewhere']) {
                expect(serialised).not.toContain(absent);
            }
        });

        it('escapes an allow-listed header value containing controls', () => {
            // `accept` is allow-listed, so its value is recorded - and neutralised on the way in.
            // The allow-list bounds WHICH headers are recorded; it says nothing about what a
            // client can put inside one.
            const req = createRequest({ headers: { accept: 'value\u202Ereversed' } });

            errorHandler(err, req, res, next);

            const recorded = loggedDiagnostic().requestHeaders.accept;
            expectPrintableAscii(recorded);
            expect(recorded).toBe('value\\u202ereversed');
        });

        it('bounds an allow-listed header value and says how much it dropped', () => {
            // One cheap request, an unbounded log line, is the amplification shape. A header is
            // the easiest place to send a large value, so the bound is asserted there.
            const req = createRequest({ headers: { accept: 'a'.repeat(20000) } });

            errorHandler(err, req, res, next);

            const recorded = loggedDiagnostic().requestHeaders.accept;
            expectPrintableAscii(recorded);
            expect(recorded.length).toBeLessThan(300);
            expect(recorded).toContain(`[truncated ${20000 - MAX_LOGGED_VALUE_LENGTH} characters]`);
        });

        it('bounds the recorded pathname as well', () => {
            const req = createRequest({ originalUrl: `/hello${'a'.repeat(15000)}?x=1` });

            errorHandler(err, req, res, next);

            const recorded = loggedDiagnostic().requestPath;
            expectPrintableAscii(recorded);
            expect(recorded.length).toBeLessThan(300);
            expect(recorded).toContain(`[truncated ${15006 - MAX_LOGGED_VALUE_LENGTH} characters]`);
        });

        it('escapes a decoded control that reaches the pathname', () => {
            // A caller or upstream proxy supplying an already-decoded target, which is the one
            // route by which a control can reach the path at all.
            const req = createRequest({ originalUrl: '/hel\u001blo\u202E?x=1' });

            errorHandler(err, req, res, next);

            expectPrintableAscii(loggedDiagnostic().requestPath);
            expect(JSON.stringify(loggedDiagnostic())).not.toContain('\u001b');
        });

        it('drops a non-allow-listed header carrying controls', () => {
            // The narrower blast radius the allow-list buys: a header nobody listed cannot
            // distort a log line, because it is not in the line at all.
            const req = createRequest({ headers: { 'x-note': 'value\u001b[2J\u202Ereversed' } });

            errorHandler(err, req, res, next);

            expect(loggedDiagnostic().requestHeaders).toEqual({});
            expect(JSON.stringify(loggedDiagnostic())).not.toContain('x-note');
        });

        it('escapes an error message containing controls', () => {
            // The message is attacker-influenced whenever a handler interpolates request data into
            // the error it throws, which is a common shape in real applications - so the message
            // is treated as text from the caller rather than text from the server.
            const controlError = new Error('failed for \u001b[2J\u202Ereversed');

            errorHandler(controlError, req, res, next);

            const recorded = loggedDiagnostic().errorMessage;
            expectPrintableAscii(recorded);
            expect(recorded).toBe('failed for \\u001b[2J\\u202ereversed');
        });

        it('bounds an error message that interpolated a large client value', () => {
            const controlError = new Error(`rejected input: ${'x'.repeat(9000)}`);

            errorHandler(controlError, req, res, next);

            const recorded = loggedDiagnostic().errorMessage;
            expect(recorded.startsWith('rejected input: xxx')).toBe(true);
            expect(recorded).toContain('[truncated ');
            expect(recorded.length).toBeLessThan(300);
        });

        it('leaves an ordinary diagnostic entirely unchanged', () => {
            // The rules are invisible in normal use. This is the shape of the entry a developer
            // actually reads, and none of it is escaped, dropped or truncated.
            errorHandler(err, req, res, next);

            const diagnostic = loggedDiagnostic();

            expect(diagnostic.errorMessage).toBe('something went wrong');
            expect(diagnostic.errorName).toBe('Error');
            expect(diagnostic.requestPath).toBe('/hello');
            expect(diagnostic.requestMethod).toBe('GET');
            expect(diagnostic.requestHeaders).toEqual({ host: 'localhost:3000' });
            expect(diagnostic.requestParams).toEqual({});
            expect(diagnostic.requestQueryParameterCount).toBe(0);
            expect(diagnostic.clientIP).toBe('203.0.113.24');
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

        it('echoes a markup-bearing target verbatim but marks the response nosniff', () => {
            // The reflection and its guard, asserted together, because separately each looks like
            // a different decision than it is. The target is echoed unchanged - `path` exists to
            // correlate a failure with the request that caused it, and an encoded form would no
            // longer be the caller's own target - so what makes the echo safe is the response
            // being unsniffable rather than the value being neutralised. A raw target like this
            // one reaches the handler when a caller writes it directly to the socket; a browser
            // would percent-encode it first.
            const req = createRequest({ originalUrl: '/boom?x=<script>alert(1)</script>' });

            errorHandler(err, req, res, next);

            expect(sentPayload(res).path).toBe('/boom?x=<script>alert(1)</script>');
            expect(res.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
            expect(res.set.mock.invocationCallOrder[0])
                .toBeLessThan(res.json.mock.invocationCallOrder[0]);
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
