/**
 * Request Logger Middleware Unit Test Suite
 *
 * Exercises `src/backend/middleware/requestLogger.js` DIRECTLY with mock `req`, `res` and
 * `next` objects. There is no Supertest here, no Express application and no route: the
 * middleware is a plain three-argument function, so calling it with literals is both the
 * simplest and the most precise way to reach every one of its branches.
 *
 * Why this suite exists
 * ---------------------
 * `src/backend/jest.config.js` collects coverage from `routes/**` and `middleware/**` only,
 * and gates all four metrics - branches, functions, lines and statements - at 90%. It also
 * sets `collectCoverage: true`, so those thresholds gate plain `npm test`, not just
 * `npm run test:coverage`. This suite and its sibling `errorHandler.test.js` are what carry
 * the two middleware modules over that gate.
 *
 * What the middleware does (the contract asserted below)
 * -----------------------------------------------------
 * It reads three values from the request - `req.method`, `req.originalUrl` and `req.body` -
 * normalises the body to a string, writes exactly one `logger.info` line, and calls `next()`.
 * It is a pure observer: it never reads or writes the response, and it never forwards an
 * error. The body normalisation is the only part with branches:
 *
 *   no body (undefined or null)  ->  '{}'
 *   typeof body === 'object'     ->  JSON.stringify(body), or on failure the fixed string
 *                                    '[Object - Unable to serialize]' plus an error log
 *   any other type               ->  String(body)
 *
 * Isolation notes
 * ---------------
 * `utils/logger.js` exports a plain object literal whose `info` and `error` properties are
 * ordinary arrow functions, so `jest.spyOn` replaces them directly - no module factory is
 * needed. Each spy is given an empty implementation so the real `console` output does not
 * flood the run, and `jest.restoreAllMocks()` puts the originals back after every case
 * (`clearMocks: true` in the Jest config clears recorded CALLS only, never implementations).
 *
 * Importing the logger also loads `config/index.js`, which prints a development
 * configuration summary. That output during a test run is expected and is not suppressed
 * here: `config/index.js` is a reference module this task does not modify.
 */

// The middleware under test. requestLogger.js ends with `module.exports = requestLogger;`,
// so this is a DEFAULT export - a bare function, not an object with a key.
const requestLogger = require('../../middleware/requestLogger');

// The logging sink the middleware writes through. utils/logger.js ends with
// `module.exports = { logger };`, so this one IS a named export. The two shapes differ on
// purpose and are read back exactly as each module publishes them.
const { logger } = require('../../utils/logger');

/**
 * Builds a fresh mock request.
 *
 * `method` and `originalUrl` are always present because the middleware reads both
 * unconditionally, and `req.originalUrl` has no `req.url` fallback - omitting it would log
 * `undefined` rather than exercise anything. Pass `body` through the overrides to select a
 * normalisation branch; omit it entirely for the no-body case.
 *
 * @param {Object} [overrides] - properties to add to or replace on the request
 * @returns {Object} a mock Express request
 */
function createRequest(overrides) {
    return Object.assign({
        method: 'GET',
        originalUrl: '/hello'
    }, overrides);
}

/**
 * Builds a fresh mock response whose every method is a spy.
 *
 * Nothing here should ever be called: the assertion that all of these stay untouched is how
 * this suite proves the middleware is a non-destructive observer rather than a participant
 * in the response.
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
 * Asserts that the middleware left the response object completely alone.
 *
 * @param {Object} res - the mock response handed to the middleware
 * @returns {void}
 */
function expectResponseUntouched(res) {
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
    expect(res.set).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
}

/**
 * Reads back the single value logged in the `Body:` position of the one `logger.info` call.
 *
 * The call is variadic and positional - `'HTTP Request -'`, `'Method:'`, method, `'Path:'`,
 * path, `'Body:'`, body - so the body is argument index 6. Reading it by index keeps each
 * body assertion to one line while still failing if the argument order ever changes, because
 * the full-argument assertion in the logging-contract block pins the order itself.
 *
 * @returns {*} whatever was passed in the body position
 */
function loggedBody() {
    return logger.info.mock.calls[0][6];
}

describe('requestLogger middleware', () => {
    let res;
    let next;

    beforeEach(() => {
        // Silence both levels for the duration of the case. The empty implementations are
        // what keep the real console out of the test output without touching any source file.
        jest.spyOn(logger, 'info').mockImplementation(() => {});
        jest.spyOn(logger, 'error').mockImplementation(() => {});

        res = createResponse();
        next = jest.fn();
    });

    afterEach(() => {
        // clearMocks clears calls but leaves the mock implementation in place, so an explicit
        // restore is required or a silenced logger would leak into every later case.
        jest.restoreAllMocks();
    });

    /**
     * The body normalisation branches.
     *
     * The guard is `if (req.body !== undefined && req.body !== null)`, and the two operands
     * of that `&&` are separate branches: an undefined body makes the first operand false and
     * short-circuits, so ONLY a null body can exercise the second. Both cases are therefore
     * mandatory - covering one and not the other silently forfeits branch coverage against
     * the 90% gate while still reading like complete coverage.
     */
    describe('request body normalisation', () => {
        it('logs empty object notation when the request carries no body', () => {
            const req = createRequest();

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('{}');
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('logs empty object notation when the request body is null', () => {
            const req = createRequest({ body: null });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('{}');
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('serialises an object body with JSON.stringify', () => {
            // Neutral field names and values: the case exists to exercise the object branch,
            // and a fixture that looked like personal data or a credential would suggest this
            // suite endorses putting such a value where it will be serialised into a log.
            const body = { greeting: 'hello', repeat: 2, nested: { ok: true } };
            const req = createRequest({ method: 'POST', body: body });

            requestLogger(req, res, next);

            // Compared against the computed value rather than a hand-typed string, so the
            // assertion cannot drift from what JSON.stringify actually produces.
            expect(loggedBody()).toBe(JSON.stringify(body));
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('serialises an array body with JSON.stringify', () => {
            const body = [1, 'two', { three: true }];
            const req = createRequest({ method: 'POST', body: body });

            requestLogger(req, res, next);

            // An array is `typeof 'object'`, so it takes the same branch as a plain object.
            expect(loggedBody()).toBe(JSON.stringify(body));
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('converts a string body with String()', () => {
            const req = createRequest({ method: 'POST', body: 'raw text' });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('raw text');
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('converts a numeric body with String()', () => {
            const req = createRequest({ method: 'POST', body: 42 });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('42');
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('converts a boolean body with String()', () => {
            const req = createRequest({ method: 'POST', body: true });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('true');
            expect(logger.error).not.toHaveBeenCalled();
        });

        it('converts a bigint body with String() rather than treating it as an object', () => {
            const req = createRequest({ method: 'POST', body: BigInt(7) });

            requestLogger(req, res, next);

            // `typeof BigInt(7)` is 'bigint', not 'object', so this reaches the String()
            // branch and never touches JSON.stringify - which would have thrown.
            expect(loggedBody()).toBe('7');
            expect(logger.error).not.toHaveBeenCalled();
        });
    });

    /**
     * The serialisation-failure branch.
     *
     * `JSON.stringify` throws for a circular structure, for a `toJSON` that throws, and for a
     * BigInt held inside an object. All three land in the same catch, which substitutes a
     * fixed placeholder and records one diagnostic - and, critically, still falls through to
     * `next()`, because that call sits outside the try/catch.
     */
    describe('serialisation failure handling', () => {
        it('substitutes a fixed placeholder and logs a diagnostic for a circular body', () => {
            const body = {};
            body.self = body;
            const req = createRequest({ method: 'POST', originalUrl: '/hello', body: body });

            // Capture the engine's own message instead of hard-coding its wording, so the
            // assertion below tests the pass-through rather than the V8 error text.
            let expectedMessage;
            try {
                JSON.stringify(body);
            } catch (error) {
                expectedMessage = error.message;
            }
            expect(typeof expectedMessage).toBe('string');
            expect(expectedMessage.length).toBeGreaterThan(0);

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('[Object - Unable to serialize]');
            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.error).toHaveBeenCalledWith(
                'Request body serialization failed:',
                expectedMessage,
                'for path:',
                '/hello'
            );
            expect(logger.error.mock.calls[0]).toHaveLength(4);
        });

        it('reports the thrown message when a toJSON implementation fails', () => {
            const body = {
                toJSON() {
                    throw new Error('toJSON refused');
                }
            };
            const req = createRequest({ method: 'PUT', originalUrl: '/hello', body: body });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('[Object - Unable to serialize]');
            expect(logger.error).toHaveBeenCalledWith(
                'Request body serialization failed:',
                'toJSON refused',
                'for path:',
                '/hello'
            );
        });

        it('substitutes the placeholder when an object contains a bigint', () => {
            const req = createRequest({ method: 'POST', body: { big: BigInt(1) } });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('[Object - Unable to serialize]');
            expect(logger.error).toHaveBeenCalledTimes(1);
        });

        it('still logs the request line and continues after a serialisation failure', () => {
            const body = {};
            body.self = body;
            const req = createRequest({ method: 'POST', body: body });

            requestLogger(req, res, next);

            // The failure is diagnosed, not fatal: the request line is still written and the
            // pipeline still advances, because next() sits outside the try/catch.
            expect(logger.info).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
            expectResponseUntouched(res);
        });
    });

    /**
     * The shape of the log line itself.
     *
     * The call is seven positional arguments, and its order is the log format. Asserting the
     * arguments AND their count catches a dropped or added one, either of which would change
     * every downstream log line while leaving a looser assertion green.
     */
    describe('log line contract', () => {
        it('writes exactly one info line carrying seven positional arguments', () => {
            const req = createRequest();

            requestLogger(req, res, next);

            expect(logger.info).toHaveBeenCalledTimes(1);
            expect(logger.info).toHaveBeenCalledWith(
                'HTTP Request -',
                'Method:', 'GET',
                'Path:', '/hello',
                'Body:', '{}'
            );
            expect(logger.info.mock.calls[0]).toHaveLength(7);
        });

        it('passes the request method through unchanged', () => {
            const req = createRequest({ method: 'DELETE' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][2]).toBe('DELETE');
        });

        it('logs req.originalUrl, including any query string, as the path', () => {
            const req = createRequest({ originalUrl: '/hello?greeting=world' });

            requestLogger(req, res, next);

            // originalUrl is read with no fallback and no rewriting, so whatever the request
            // carried - query string included - is what appears in the Path position.
            expect(logger.info.mock.calls[0][4]).toBe('/hello?greeting=world');
        });

        it('logs a path that matches no route exactly as it was received', () => {
            const req = createRequest({ originalUrl: '/nonexistent' });

            requestLogger(req, res, next);

            // The middleware runs before routing, so it has no notion of whether a route
            // matched: an unmatched target is logged in exactly the same way as a matched one.
            expect(logger.info.mock.calls[0][4]).toBe('/nonexistent');
        });
    });

    /**
     * Log-integrity characterisation for terminal and Unicode display controls.
     *
     * The middleware applies no encoding: every value is handed to the logger, which forwards it
     * to console unchanged. These cases pin that as it stands rather than assert that it is
     * desirable, in the same spirit as the missing-address case in the errorHandler suite. Each
     * one names the control class and the concrete consequence, so whoever is authorised to add
     * an encoder has an exact contract to invert - when encoding lands, every expectation here
     * must be changed to require the neutralised form, and a failure here means encoding was
     * added without the tests being updated to match.
     *
     * Two mitigating facts about the delivered application, both established by running it and
     * recorded so these cases are not mistaken for live exploits. First, no body parser is
     * mounted and none may be added under this plan, so `req.body` is never populated by a
     * network request and the body positions below are reachable only by direct invocation or by
     * a parser someone adds later. Second, a raw CR/LF in a request target is rejected with 400
     * by Node's HTTP parser before any middleware runs, and `req.originalUrl` preserves
     * percent-encoding, so the path position cannot carry a decoded control either. The decoded
     * query values that `errorHandler` logs are a separate matter and are pinned in that suite.
     */
    describe('control character handling (characterisation, not endorsement)', () => {
        it('forwards an ANSI escape sequence in a primitive body without encoding it', () => {
            // ESC [ 2 J clears the screen on a terminal that renders it, so an entry carrying it
            // can erase the operator's scrollback around itself.
            const req = createRequest({ body: '\u001b[2J' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][6]).toBe('\u001b[2J');
        });

        it('forwards a C0 control character in a primitive body without encoding it', () => {
            // A bare CR rewinds the line, letting later text overwrite what was already written.
            const req = createRequest({ body: 'first\rsecond' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][6]).toBe('first\rsecond');
        });

        it('forwards a newline in a primitive body, so one entry can span two lines', () => {
            const req = createRequest({ body: 'real\n[INFO]: HTTP Request - forged' });

            requestLogger(req, res, next);

            // This is the log-forging shape itself: a single logged value producing what reads as
            // a second, independent entry. Unreachable over HTTP today for the reasons above.
            expect(logger.info.mock.calls[0][6]).toBe('real\n[INFO]: HTTP Request - forged');
            expect(logger.info.mock.calls[0][6].split('\n')).toHaveLength(2);
        });

        it('forwards Unicode line and paragraph separators without encoding them', () => {
            const req = createRequest({ body: 'before\u2028after\u2029end' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][6]).toBe('before\u2028after\u2029end');
        });

        it('forwards a bidirectional override without encoding it', () => {
            // U+202E reverses the display order of what follows, so the rendered text can read
            // as something other than what was logged.
            const req = createRequest({ body: 'safe\u202Etxt.exe' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][6]).toBe('safe\u202Etxt.exe');
        });

        it('escapes C0 controls in a serialised object body but not Unicode display controls', () => {
            // Serialising a body is only a partial mitigation, and the boundary is worth pinning
            // because it is easy to assume JSON.stringify sanitises. It escapes every C0 control,
            // ESC included, so those cannot reach the terminal as controls. It does not escape
            // U+2028, U+2029 or the bidi overrides, which survive into the log verbatim - so an
            // object body is safer than a primitive one against terminal escapes and no safer at
            // all against display reordering.
            const req = createRequest({
                body: { lf: '\n', esc: '\u001b', ls: '\u2028', rlo: '\u202E' }
            });

            requestLogger(req, res, next);

            const logged = logger.info.mock.calls[0][6];

            // C0 controls arrive as their two-character or \uXXXX escapes, never as the control.
            expect(logged).toContain('\\n');
            expect(logged).not.toContain('\n');
            expect(logged).toContain('\\u001b');
            expect(logged).not.toContain('\u001b');

            // Unicode display controls are passed through as themselves.
            expect(logged).toContain('\u2028');
            expect(logged).toContain('\u202E');
        });

        it('preserves percent-encoding in the path, so the path cannot carry a decoded control', () => {
            const req = createRequest({ originalUrl: '/hello?x=%E2%80%AE%1B%5B2J' });

            requestLogger(req, res, next);

            // req.originalUrl is the raw target. Express decodes into req.query, which this
            // middleware never reads, so %E2%80%AE stays nine characters and never becomes U+202E.
            const logged = logger.info.mock.calls[0][4];
            expect(logged).toBe('/hello?x=%E2%80%AE%1B%5B2J');
            expect(logged).not.toContain('\u202E');
            expect(logged).not.toContain('\u001b');
        });
    });

    /**
     * Continuation and observer behaviour - the two properties that make this middleware safe
     * to mount ahead of every route.
     */
    describe('continuation and response isolation', () => {
        it('calls next exactly once with no arguments', () => {
            const req = createRequest();

            requestLogger(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            // No argument at all: a value here would be read by Express as an error and would
            // divert the request straight to the error handler.
            expect(next).toHaveBeenCalledWith();
        });

        it('never touches the response object', () => {
            const req = createRequest({ method: 'POST', body: { any: 'body' } });

            requestLogger(req, res, next);

            expectResponseUntouched(res);
        });

        it('reads only method, path and body, so no header can reach the request log', () => {
            // The middleware touches exactly three request properties. Passing headers that
            // would be damaging to log proves the point positively rather than by inspection:
            // if a future change ever widened what is read, this case fails immediately.
            const req = createRequest({
                headers: {
                    authorization: 'Bearer must-not-be-logged',
                    cookie: 'session=must-not-be-logged',
                    'x-api-key': 'must-not-be-logged'
                },
                get: jest.fn(() => 'must-not-be-logged')
            });

            requestLogger(req, res, next);

            const logged = logger.info.mock.calls[0].join(' ');
            expect(logged).not.toContain('must-not-be-logged');
            expect(logged).toBe('HTTP Request - Method: GET Path: /hello Body: {}');
            // req.get is never consulted either, so no header is read by any route.
            expect(req.get).not.toHaveBeenCalled();
        });

        it('is registered as ordinary middleware, taking three arguments', () => {
            // Express decides what a function IS from its arity: three parameters make this
            // ordinary middleware, and a fourth would silently reclassify it as an error
            // handler that never runs for a normal request.
            expect(requestLogger).toHaveLength(3);
        });

        it('runs synchronously, returning undefined with nothing to await', () => {
            const req = createRequest();

            const result = requestLogger(req, res, next);

            expect(result).toBeUndefined();
            expect(logger.info).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('reports no diagnostic for a clean request run after a failing one', () => {
            const circular = {};
            circular.self = circular;

            requestLogger(createRequest({ method: 'POST', body: circular }), res, next);
            expect(logger.error).toHaveBeenCalledTimes(1);

            // A second, independent invocation in the same case: the middleware holds no
            // state between calls, so the clean request must add an info line and no
            // diagnostic of its own.
            const cleanRes = createResponse();
            const cleanNext = jest.fn();
            requestLogger(createRequest(), cleanRes, cleanNext);

            expect(logger.info).toHaveBeenCalledTimes(2);
            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.info.mock.calls[1][6]).toBe('{}');
            expect(cleanNext).toHaveBeenCalledTimes(1);
            expectResponseUntouched(cleanRes);
        });
    });
});
