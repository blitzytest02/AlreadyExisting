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
 * Three further rules apply to everything it writes, and they are what the neutralisation block
 * below asserts. They exist because every value in the line originates with the client:
 *
 *   1. Only the pathname of `req.originalUrl` is logged. The query string and fragment are cut
 *      off, so a value a caller put in the target - `?password=...` - cannot reach the log.
 *   2. Nothing outside printable ASCII is written literally. Each such character is replaced by
 *      inert `\uXXXX` text, so a logged value cannot forge a second entry, drive a terminal, or
 *      reorder its own display.
 *   3. Every logged value is bounded to 256 characters, with the number of dropped characters
 *      stated, so one request cannot cost an unbounded amount of log.
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

/**
 * The bound the middleware applies to every value it logs, restated here.
 *
 * Restated rather than imported because the middleware exports one function and nothing else -
 * the bound is an internal decision, and a test that reached inside for it would be asserting the
 * implementation instead of the behaviour. Stating the number here means a change to the bound
 * fails these cases, which is the point: the bound is part of the contract, not an accident.
 *
 * @constant {number}
 */
const MAX_LOGGED_VALUE_LENGTH = 256;

/**
 * Asserts that a logged value consists only of printable ASCII.
 *
 * This is the property the neutralisation cases care about, and asserting the property rather
 * than a re-implementation of the escaping keeps the test independent of how the middleware
 * spells the escape. Anything the terminal or a log reader would interpret - a control, a
 * separator, a bidi override - is outside this range and fails here.
 *
 * @param {string} value - a value read back from a logger call
 * @returns {void}
 */
function expectPrintableAscii(value) {
    expect(typeof value).toBe('string');
    expect(value).toMatch(/^[\x20-\x7E]*$/);
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
            // assertions below test what the middleware does with it rather than the V8 text.
            let thrownMessage;
            try {
                JSON.stringify(body);
            } catch (error) {
                thrownMessage = error.message;
            }
            expect(typeof thrownMessage).toBe('string');
            expect(thrownMessage.length).toBeGreaterThan(0);

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('[Object - Unable to serialize]');
            expect(logger.error).toHaveBeenCalledTimes(1);
            expect(logger.error.mock.calls[0]).toHaveLength(4);

            const [prefix, reportedMessage, pathLabel, reportedPath] = logger.error.mock.calls[0];
            expect(prefix).toBe('Request body serialization failed:');
            expect(pathLabel).toBe('for path:');
            expect(reportedPath).toBe('/hello');

            // V8's circular-structure message is several lines long and names the properties it
            // walked, which are the client's own keys. It is therefore subject to the same two
            // rules as any other logged value: neutralised, so the diagnostic stays one line, and
            // bounded, so an object designed to produce a long message cannot produce a long log
            // entry. What survives is the part that identifies the failure.
            expect(thrownMessage).toContain('\n');
            expectPrintableAscii(reportedMessage);
            expect(reportedMessage).toContain(thrownMessage.split('\n')[0]);
            expect(reportedMessage.length).toBeLessThanOrEqual(
                MAX_LOGGED_VALUE_LENGTH + '[truncated 9999 characters]'.length
            );
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

        it('logs the pathname of req.originalUrl, with the query string cut off', () => {
            const req = createRequest({ originalUrl: '/hello?greeting=world' });

            requestLogger(req, res, next);

            // The pathname identifies the route, which is what the log is for. The query string
            // is where a caller puts values, and it is cut off at the '?' rather than filtered
            // parameter by parameter - an allow-list of "safe" parameter names would be a guess
            // about callers this tutorial has not met.
            expect(logger.info.mock.calls[0][4]).toBe('/hello');
        });

        it('keeps a secret out of the log when the target carries one', () => {
            // The concrete case the rule above exists for, asserted with a value that would be
            // damaging to log: a credential in the target is a credential in every copy of the
            // log file, which is the weakness CWE-532 describes.
            const req = createRequest({ originalUrl: '/hello?password=hunter2&token=abc123' });

            requestLogger(req, res, next);

            const logged = logger.info.mock.calls[0].join(' ');
            expect(logger.info.mock.calls[0][4]).toBe('/hello');
            expect(logged).not.toContain('hunter2');
            expect(logged).not.toContain('abc123');
            expect(logged).not.toContain('password');
        });

        it('cuts a fragment off the path as well as a query string', () => {
            // A browser never transmits a fragment, but a hand-written or non-browser client can
            // put one in the target, and it is treated exactly like a query string.
            const req = createRequest({ originalUrl: '/hello#section-two' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][4]).toBe('/hello');
        });

        it('cuts at whichever of query or fragment comes first', () => {
            const req = createRequest({ originalUrl: '/hello#frag?not-a-query=1' });

            requestLogger(req, res, next);

            expect(logger.info.mock.calls[0][4]).toBe('/hello');
        });

        it('logs a path that matches no route exactly as it was received', () => {
            const req = createRequest({ originalUrl: '/nonexistent' });

            requestLogger(req, res, next);

            // The middleware runs before routing, so it has no notion of whether a route
            // matched: an unmatched target is logged in exactly the same way as a matched one.
            // A target with no query and no fragment reaches the log unchanged - the pathname
            // rule removes what a caller added, never anything the route itself needs.
            expect(logger.info.mock.calls[0][4]).toBe('/nonexistent');
        });
    });

    /**
     * Log-integrity: terminal controls, Unicode display controls and unbounded values.
     *
     * A log line is written once and read many times, by an operator's terminal, by a file, and
     * by whatever aggregates it. Every value in this middleware's line came from the client, so
     * each case below takes a class of character a client can send, names what it would do to
     * those readers, and requires that it arrive as inert text instead.
     *
     * These cases assert a property - printable ASCII only - rather than a re-spelling of the
     * middleware's escape, so they hold regardless of how the escape is written and fail if any
     * class of character starts reaching the console literally again.
     *
     * Two notes on reachability, established by running the delivered application, so these cases
     * are read as the guarantee they are rather than as live exploits. No body parser is mounted
     * and none may be added under this plan, so `req.body` is populated only by direct invocation
     * or by a parser someone adds later; and a raw CR/LF in a request target is rejected with 400
     * by Node's HTTP parser before any middleware runs. The neutralisation is what makes the body
     * positions safe for whoever mounts that parser, and what closes the percent-decoded route
     * into the path - `errorHandler` reads `req.query`, which Express decodes, and its own suite
     * asserts the same guarantee there.
     */
    describe('log output neutralisation', () => {
        it('escapes an ANSI escape sequence in a primitive body', () => {
            // ESC [ 2 J clears the screen on a terminal that renders it, so an entry carrying it
            // could erase the operator's scrollback around itself.
            const req = createRequest({ body: '\u001b[2J' });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged).not.toContain('\u001b');
            expect(logged).toContain('\\u001b');
            expect(logged).toContain('[2J');
        });

        it('escapes a C0 control character in a primitive body', () => {
            // A bare CR rewinds the line, letting later text overwrite what was already written.
            const req = createRequest({ body: 'first\rsecond' });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged).toBe('first\\u000dsecond');
        });

        it('escapes a newline, so one logged value cannot become two entries', () => {
            const req = createRequest({ body: 'real\n[INFO]: HTTP Request - forged' });

            requestLogger(req, res, next);

            // The log-forging shape, closed: the value still says what the caller sent, on one
            // line, and cannot be mistaken for a second entry written by the server itself.
            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged.split('\n')).toHaveLength(1);
            expect(logged).toBe('real\\u000a[INFO]: HTTP Request - forged');
        });

        it('escapes Unicode line and paragraph separators', () => {
            const req = createRequest({ body: 'before\u2028after\u2029end' });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged).toBe('before\\u2028after\\u2029end');
        });

        it('escapes a bidirectional override', () => {
            // U+202E reverses the display order of what follows, so the rendered text could read
            // as something other than what was logged - 'safe\u202Etxt.exe' displays as
            // 'safeexe.txt'. Escaped, it displays as what it is.
            const req = createRequest({ body: 'safe\u202Etxt.exe' });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged).toBe('safe\\u202etxt.exe');
        });

        it('escapes Unicode display controls that JSON.stringify leaves in an object body', () => {
            // Serialising a body is only a partial mitigation, which is why the middleware does
            // not rely on it. JSON.stringify escapes every C0 control, ESC included, but passes
            // U+2028, U+2029 and the bidi overrides through unchanged. The escape step runs over
            // its output, so the two together leave nothing interpretable.
            const req = createRequest({
                body: { lf: '\n', esc: '\u001b', ls: '\u2028', rlo: '\u202E' }
            });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged).not.toContain('\u2028');
            expect(logged).not.toContain('\u202E');
            expect(logged).toContain('\\u2028');
            expect(logged).toContain('\\u202e');

            // JSON.stringify's own escapes survive as the text it produced, so the value is still
            // recognisable as the JSON it was.
            expect(logged).toContain('"lf":"\\n"');
        });

        it('escapes a decoded control that reaches the path', () => {
            // `req.originalUrl` normally keeps percent-encoding, so `%1B` stays three characters.
            // A caller or upstream proxy supplying an already-decoded target is the narrower case,
            // and the escape closes it rather than the encoding of the target happening to hold.
            const req = createRequest({ originalUrl: '/hel\u001blo\u202E' });

            requestLogger(req, res, next);

            const logged = logger.info.mock.calls[0][4];
            expectPrintableAscii(logged);
            expect(logged).not.toContain('\u202E');
            expect(logged).not.toContain('\u001b');
        });

        it('leaves percent-encoding in the path as the characters the client sent', () => {
            const req = createRequest({ originalUrl: '/hello%20world?x=%E2%80%AE%1B%5B2J' });

            requestLogger(req, res, next);

            // Nothing is decoded on the way to the log: decoding is what would turn %E2%80%AE
            // into a real override. The query is gone because it is a query, and what remains of
            // the pathname is the percent-encoded text exactly as received.
            const logged = logger.info.mock.calls[0][4];
            expect(logged).toBe('/hello%20world');
            expectPrintableAscii(logged);
        });

        it('bounds a long path and says how much it dropped', () => {
            // The amplification shape: one cheap request, an expensive log line. The pathname is
            // bounded like every other value, and the line states the size of what it dropped so
            // the entry is brief on purpose rather than quietly incomplete.
            const req = createRequest({ originalUrl: `/hello${'a'.repeat(15000)}` });

            requestLogger(req, res, next);

            const logged = logger.info.mock.calls[0][4];
            expectPrintableAscii(logged);
            expect(logged.length).toBeLessThan(300);
            expect(logged.startsWith(`/hello${'a'.repeat(10)}`)).toBe(true);
            expect(logged).toContain(`[truncated ${15006 - MAX_LOGGED_VALUE_LENGTH} characters]`);
        });

        it('bounds a long body and says how much it dropped', () => {
            const req = createRequest({ method: 'POST', body: 'b'.repeat(5000) });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged.length).toBeLessThan(300);
            expect(logged).toContain(`[truncated ${5000 - MAX_LOGGED_VALUE_LENGTH} characters]`);
        });

        it('bounds the escaped length, not the length before escaping', () => {
            // Escaping is what can grow a value - one character becomes six - so a body of
            // controls short enough to pass a pre-escape check would otherwise still produce a
            // long line. The bound is applied to the text that actually reaches the console.
            const req = createRequest({ method: 'POST', body: '\u0007'.repeat(100) });

            requestLogger(req, res, next);

            const logged = loggedBody();
            expectPrintableAscii(logged);
            expect(logged.length).toBeLessThan(300);
            expect(logged).toContain(`[truncated ${600 - MAX_LOGGED_VALUE_LENGTH} characters]`);
        });

        it('leaves a value that is already printable and short exactly as it was', () => {
            // The rules are invisible in normal use: nothing is escaped that does not need to be,
            // and nothing short is truncated. A tutorial's log output still reads like itself.
            const req = createRequest({ method: 'POST', body: 'plain text 123' });

            requestLogger(req, res, next);

            expect(loggedBody()).toBe('plain text 123');
            expect(logger.info.mock.calls[0][4]).toBe('/hello');
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
