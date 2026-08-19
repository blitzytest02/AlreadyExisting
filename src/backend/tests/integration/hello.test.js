/**
 * Integration tests for the /hello endpoint
 *
 * Requests here traverse the exported http.Server on a real socket, not the Express application
 * in isolation, so what is under test is the whole path a client takes: the listener, the
 * middleware stack, the two-hop route mount and the response framing.
 *
 * Five suites, in the order they appear below, each asserting something the others cannot:
 * - the endpoint contract over the wire (status, content type, framed length, body)
 * - the ORDER of the three registrations in app.js, which no endpoint assertion can observe
 * - that importing server.js binds no port and registers no process-level handler, which is what
 *   makes the hooks below safe to write at all. The import is not free of side effects; those two
 *   specific guarantees are what the hooks depend on
 * - which request targets Express resolves to the one registered route, and which it does not
 * - what each HTTP method receives on that route: the two the framework answers for the single GET
 *   registration, and the ones that match nothing
 */

const request = require('supertest');

// The http.Server itself, so this file owns the listener through listen()/close(). Requiring it
// also pulls in app.js, which is why no separate app import is needed.
const server = require('../../server.js');

describe('Hello API Endpoint', () => {
    /**
     * Claims a listener on port 0, so the operating system picks a free port. The configured port
     * (3000) is deliberately not used: it may already belong to a development server or to a
     * parallel run, and this suite has no reason to compete for it. Supertest reads the assigned
     * port off the server, so nothing here needs to know which one it got.
     *
     * done() is called from inside the listen callback rather than after it, because listen()
     * returns before the socket is bound and a request issued in between would be refused.
     *
     * @param {Function} done - Jest callback signalling that the listener is up
     */
    beforeAll((done) => {
        server.listen(0, () => {
            done();
        });
    });

    /**
     * Releases the port and lets the Jest worker exit: an open listener is a live handle, and a
     * suite that leaves one behind hangs the run rather than failing it. close() is asynchronous,
     * so done() is called from its callback.
     *
     * @param {Function} done - Jest callback signalling that the listener is closed
     */
    afterAll((done) => {
        server.close(() => {
            done();
        });
    });

    /**
     * The published success contract: 200, `Content-Type: text/html; charset=utf-8`,
     * `Content-Length: 11`, body `Hello world`.
     *
     * Each of those is load-bearing for a consumer - the two Jest suites, the container health
     * check, the Kubernetes probes and the tutorial documentation all read this response - so the
     * status, the length and the body are asserted here rather than inferred from one another.
     *
     * The content type is the exception, and the assertion is deliberately weaker than the contract
     * it accompanies: /text\/html/ matches the media type as a substring and pins nothing else, so a
     * response carrying no charset, or `charset=iso-8859-1`, would satisfy it just as `charset=utf-8`
     * does. What is verified here is therefore that the response is HTML, not that the charset is
     * the documented one. Pinning the full header is a change to the assertion, not to this comment.
     *
     * @returns {Promise<void>}
     */
    it('should return 200 OK with \'Hello world\' for GET /hello', async () => {
        // request(server) - the assertions traverse the exported listener on its ephemeral port,
        // not an application object wrapped in a second one.
        const response = await request(server)
            .get('/hello')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .expect('Content-Length', '11')
            .expect('Hello world');

        // The same four assertions repeated on the resolved response, so a failure reports the
        // value it saw rather than only the expectation that broke.
        expect(response.status).toBe(200);

        expect(response.text).toBe('Hello world');

        expect(response.headers['content-type']).toMatch(/text\/html/);

        // The Content-Length header frames exactly the 11 bytes of 'Hello world'.
        // The header is asserted explicitly, and not only inferred from the body text,
        // because a chunked or re-framed response carrying the right characters would
        // satisfy every other assertion above while breaking the published contract.
        // Byte length is measured rather than character length so a multi-byte
        // character silently introduced into the literal is caught here too.
        expect(response.headers['content-length']).toBe('11');
        expect(Buffer.byteLength(response.text, 'utf8')).toBe(11);

        // The installed Supertest never sets response.duration - neither supertest 7.1.1 nor the
        // superagent it bundles defines that property anywhere - so the guard below never opens and
        // the comparison inside it never runs. No timing requirement is in force here. The block is
        // retained from the original suite rather than deleted, and the guard is what makes the
        // absent property harmless.
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(100);
        }
    });

    /**
     * A path with no registered route answers 404 - and that 404 comes from Express itself, not
     * from this application. Nothing here reaches the error middleware: an unmatched request is
     * not an error, so errorHandler is never offered it and the response body is the framework's
     * own default page. Only the status and the absent framework header are asserted for that
     * reason; the body is not this application's contract to keep.
     *
     * @returns {Promise<void>}
     */
    it('should return 404 Not Found for a non-existent route', async () => {
        const response = await request(server)
            .get('/nonexistent')
            .expect(404);

        expect(response.status).toBe(404);

        // Inert for the same reason as in the success case above: response.duration is never set,
        // so this guard never opens and no timing requirement is asserted here either.
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(50);
        }

        // app.js disables x-powered-by, and this asserts the setting holds on a response Express
        // generates by itself rather than only on one a route handler produced.
        expect(response.headers['x-powered-by']).toBeUndefined();
    });

});

/**
 * Application Composition Integration Test Suite
 *
 * The suite above proves that the assembled application answers GET /hello correctly.
 * That is not the same as proving the application is assembled correctly: coverage
 * measures routes/ and middleware/ only, so src/backend/app.js contributes no coverage
 * number at all, and a request that returns 'Hello world' does so whether or not the
 * request logger was ever mounted and whether or not the error handler can be reached.
 * The three cases below close that gap by asserting the one property app.js owns and
 * nothing else can: the ORDER of its three registrations.
 *
 *     app.use(requestLogger)   ->   app.use('/', routes)   ->   app.use(errorHandler)
 *
 * Each registration is proved by an outcome that changes if it moves:
 * - Mount the logger after the router and it never runs for a matched route, because the
 *   route handler ends the response and never calls next().
 * - Mount the error handler before the router and an error forwarded by the router walks
 *   past it to Express's default handler, so the published 500 envelope disappears.
 *
 * Technique (and why it needs no production change): each case re-assembles app.js inside
 * a sandboxed module registry via jest.isolateModules, with jest.doMock standing test
 * doubles in for the collaborators app.js requires. The doubles exist only inside that
 * sandbox for the duration of one case - the real application keeps exactly one registered
 * route, GET /hello, and no route, alias or method handler is added anywhere.
 *
 * The route aggregator is the double that makes the error path reachable at all: the real
 * application has no failing route to exercise, and adding one purely to be tested would
 * change the published surface. Standing in for it is what lets a forwarded error be
 * observed without inventing an endpoint.
 */
describe('Application Composition and Middleware Ordering', () => {
    /**
     * Discards the doubles registered by a case.
     *
     * jest.dontMock removes the explicit mock registrations and jest.resetModules empties
     * the registry, so the next case re-requires the genuine modules. Jest's clearMocks
     * setting does not do this - it clears recorded calls, not module registrations - and
     * without this teardown a double registered here would be served to any later require
     * in this file.
     */
    afterEach(() => {
        jest.dontMock('../../middleware/requestLogger');
        jest.dontMock('../../routes');
        jest.dontMock('../../middleware/errorHandler');
        jest.dontMock('../../utils/logger');
        jest.resetModules();
    });

    /**
     * Re-assembles app.js with an order-recording double in place of each collaborator.
     *
     * Every double appends its own name to a shared array before doing its work, so the
     * array read after a request is the exact sequence of stages that request traversed.
     * The error-handling double keeps the four-parameter signature Express uses to
     * recognise error middleware; a shorter signature would silently make it ordinary
     * middleware and the assertions would then be measuring the wrong thing.
     *
     * @param {Function} routeBehaviour - what the route aggregator double does once
     *     reached: respond to end the cycle, or call next(err) to forward an error
     * @returns {{composedApp: Function, stages: string[]}} The sandboxed application and
     *     the array that records which stages ran, in order
     */
    const composeWithRecordingDoubles = (routeBehaviour) => {
        const stages = [];
        let composedApp;

        jest.isolateModules(() => {
            jest.doMock('../../middleware/requestLogger', () => (req, res, next) => {
                stages.push('requestLogger');
                next();
            });

            jest.doMock('../../routes', () => (req, res, next) => {
                stages.push('routes');
                routeBehaviour(req, res, next);
            });

            jest.doMock('../../middleware/errorHandler', () => ({
                errorHandler: (err, req, res, next) => {
                    stages.push('errorHandler');
                    res.status(500).json({ error: 'Internal Server Error' });
                }
            }));

            composedApp = require('../../app.js');
        });

        return { composedApp, stages };
    };

    /**
     * The success path: the request logger observes the request BEFORE the router resolves
     * it, and the error handler stays out of the way.
     *
     * The recorded order is the whole assertion. A logger mounted after the router - or not
     * mounted at all - yields ['routes'], because the route double ends the response and
     * never calls next(), so the logger is never reached. The error handler must not appear:
     * it is error middleware, and a request that completes normally is not an error.
     */
    it('runs the request logger before the router and leaves the error handler idle', async () => {
        const { composedApp, stages } = composeWithRecordingDoubles((req, res) => {
            res.status(200).send('Hello world');
        });

        const response = await request(composedApp)
            .get('/hello')
            .expect(200);

        expect(response.text).toBe('Hello world');
        expect(stages).toEqual(['requestLogger', 'routes']);
    });

    /**
     * The forwarded-error path: an error handed to next(err) by the router reaches the
     * error handler, and reaches it last.
     *
     * This is the case that catches a reordered error handler. Registered before the router,
     * it is never offered the error - Express only searches for error middleware registered
     * AFTER the point the error was raised - so the recorded order would lack the third
     * stage and Express's own HTML error page would be served instead of the 500 envelope.
     */
    it('routes an error forwarded by the router to the error handler last', async () => {
        const { composedApp, stages } = composeWithRecordingDoubles((req, res, next) => {
            next(new Error('composition probe failure'));
        });

        const response = await request(composedApp)
            .get('/hello')
            .expect(500);

        expect(stages).toEqual(['requestLogger', 'routes', 'errorHandler']);
        expect(response.body.error).toBe('Internal Server Error');
    });

    /**
     * The same forwarded-error path, assembled from the REAL middleware modules.
     *
     * Only two things are replaced here: the route aggregator, so an error can be forwarded
     * without adding a production route, and the logger module, so the diagnostics are
     * observable and the test log stays readable. requestLogger.js and errorHandler.js are
     * the genuine articles, which makes this the end-to-end statement of the error contract:
     * a forwarded error leaves the application as HTTP 500 carrying the published four-key
     * envelope, with the framework fingerprint still suppressed.
     *
     * Asserting the status over the wire is stronger than asserting res.status(500) was
     * called: had the handler sent its body before setting the status, Node would have
     * already flushed 200 and this assertion - and only this assertion - would fail.
     *
     * One logger mock intercepts both middleware modules even though they spell the import
     * differently ('../utils/logger.js' and '../utils/logger'): both specifiers resolve to
     * the same file, and module mocks are keyed by resolved path.
     */
    it('assembles the real middleware so a forwarded error becomes the published 500 envelope', async () => {
        const info = jest.fn();
        const error = jest.fn();
        let composedApp;

        jest.isolateModules(() => {
            jest.doMock('../../utils/logger', () => ({ logger: { info, error } }));
            jest.doMock('../../routes', () => (req, res, next) => {
                next(new Error('composition probe failure'));
            });

            composedApp = require('../../app.js');
        });

        const response = await request(composedApp)
            .get('/hello')
            .expect(500)
            .expect('Content-Type', /application\/json/);

        expect(response.body).toEqual({
            error: 'Internal Server Error',
            status: 500,
            timestamp: expect.any(String),
            path: '/hello'
        });
        expect(response.headers['x-powered-by']).toBeUndefined();

        // The real request logger recorded the request before the real error handler
        // recorded the failure, which is the mounted order restated in terms of the two
        // modules' own observable output.
        expect(info).toHaveBeenCalledTimes(1);
        expect(error).toHaveBeenCalledTimes(1);
        expect(info.mock.invocationCallOrder[0]).toBeLessThan(error.mock.invocationCallOrder[0]);
    });
});

/**
 * Server Module Import Isolation Test Suite
 *
 * The hooks at the top of this file are safe because of two specific guarantees, not because
 * importing src/backend/server.js is free of side effects. It is not: the import runs config's
 * validation and startup summary, builds the HTTP server, and attaches one server-level 'error'
 * listener. What the require.main === module guard does guarantee is narrower and is exactly what
 * these hooks depend on - the import binds no port, and registers no process-level handler. Both
 * the server.listen() call and the 'unhandledRejection'/'uncaughtException' registrations sit
 * behind that guard, so they run for `node server.js` and not for a require. The guard is
 * load-bearing in two directions, and neither failure is visible in an endpoint assertion:
 *
 * - A listen() call on the import path would claim the configured port (3000) as this file
 *   loads, and the beforeAll listen(0) would then be a second bind on an already-listening
 *   server.
 * - A process-level handler on the import path would install a handler that calls
 *   process.exit(1) inside the Jest worker, so any unrelated rejection anywhere in the run
 *   would kill the worker rather than fail a test.
 *
 * The case below measures both by re-importing the module in a sandboxed registry and
 * comparing the process listener counts across that import. A sandbox is what makes the
 * measurement possible at all: this file's own import happened before any test ran, so
 * there is no longer a "before" to compare against.
 *
 * Scope note: only process-wide effects and port binding are asserted. Listeners the module
 * attaches to the server object itself are not counted, because a server-scoped listener is
 * inert until something tries to listen and how many exist is an implementation choice, not
 * part of the contract this case exists to protect.
 */
describe('Server Module Import Isolation', () => {
    /**
     * Empties the sandbox registry so the freshly evaluated copy of server.js - and the
     * second http.Server instance it created - are not retained after this case.
     */
    afterEach(() => {
        jest.resetModules();
    });

    it('binds no port and installs no process handlers when it is required', () => {
        const rejectionListenersBefore = process.listenerCount('unhandledRejection');
        const exceptionListenersBefore = process.listenerCount('uncaughtException');

        let importedServer;
        jest.isolateModules(() => {
            importedServer = require('../../server.js');
        });

        // The module's value is the http.Server itself, which is what lets this file own
        // the lifecycle through listen()/close() rather than importing a factory.
        expect(typeof importedServer.listen).toBe('function');
        expect(typeof importedServer.close).toBe('function');

        // Nothing bound a port on the way in.
        expect(importedServer.listening).toBe(false);

        // No process-wide behaviour was installed: the counts either side of the import are
        // equal, so the require added nothing that could terminate this worker.
        expect(process.listenerCount('unhandledRejection')).toBe(rejectionListenersBefore);
        expect(process.listenerCount('uncaughtException')).toBe(exceptionListenersBefore);
    });
});

/**
 * Route Equivalence Contract
 *
 * These cases record which request targets Express actually treats as the single registered
 * `/hello` route, and which it does not. They assert framework behaviour rather than any code
 * this project authored, and they exist because that behaviour is surprisingly uneven and is a
 * prerequisite for anything that has to name the route in output.
 *
 * Two Express defaults produce the results below:
 *
 *   `caseSensitive` is off, so `/HELLO` and `/HeLLo` reach the same handler as `/hello`.
 *   `strict` is off, so a single trailing slash is optional.
 *
 * The double-slash case is the counter-intuitive one, and it follows from the two-level mount in
 * routes/index.js. The aggregator mounts the child router with `use('/hello')`, which consumes
 * that prefix and leaves the remainder of the path for the child; the child registers `get('/')`,
 * whose non-strict matcher accepts both `''` and `'/'`. So `/hello//` leaves `'//'`, which reduces
 * to the child's optional trailing slash and matches -- while `/hello///` leaves one delimiter too
 * many and falls through to the 404 handler.
 *
 * Why this is written down: any component that reports the route it handled -- a log line, an
 * audit record, an error envelope -- has to decide what to emit for each of these targets. Echoing
 * the caller's own spelling is what lets a request choose its own label. A component that instead
 * emits a fixed identifier has to know exactly which spellings are the same route, and getting the
 * `/hello//` versus `/hello///` boundary wrong produces records that misdescribe what was served.
 * These assertions are that boundary, executable, so a later change cannot move it unnoticed.
 *
 * If any case here starts failing, Express's routing defaults have changed and every consumer of
 * this contract needs revisiting -- the tests are the alarm, not the specification of our own code.
 */
describe('Route Equivalence Contract', () => {
    beforeAll((done) => {
        server.listen(0, () => done());
    });

    afterAll((done) => {
        server.close(() => done());
    });

    // Every target Express resolves to the one registered route. Each must serve the exact
    // tutorial response, because each is genuinely the same endpoint.
    const equivalentTargets = [
        ['/hello', 'the canonical form'],
        ['/HELLO', 'upper case, because caseSensitive is off by default'],
        ['/Hello', 'mixed case, same reason'],
        ['/hello/', 'one trailing slash, optional because strict is off'],
        ['/Hello/', 'case and trailing slash together'],
        ['/hello//', 'two delimiters: use() consumes the prefix, the child matcher takes the rest'],
        ['/hello?x=1', 'a query string is not part of the path Express matches'],
        ['/HeLLo?x=1', 'case and query string together']
    ];

    test.each(equivalentTargets)(
        'serves %s (%s) as the registered route',
        async (target) => {
            const response = await request(server).get(target);

            expect(response.status).toBe(200);
            expect(response.text).toBe('Hello world');
            expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
        }
    );

    // Targets that look related but are NOT the registered route. A classifier that treated any
    // of these as `/hello` would be claiming to have served something it did not.
    const nonEquivalentTargets = [
        ['/hello///', 'three delimiters leave one more than the child matcher accepts'],
        ['/hello////', 'and four likewise'],
        ['/hello%2F', 'an encoded slash is a literal path character, not a separator'],
        ['//hello', 'a leading empty segment does not match the mount prefix'],
        ['/hello/extra', 'a deeper path has no registered handler']
    ];

    test.each(nonEquivalentTargets)(
        'does not serve %s (%s)',
        async (target) => {
            const response = await request(server).get(target);

            expect(response.status).toBe(404);
            expect(response.text).not.toBe('Hello world');
        }
    );

    // The boundary itself, asserted directly rather than inferred from the two lists above, since
    // this single pair is the case most likely to be implemented incorrectly.
    test('places the equivalence boundary between two and three delimiters', async () => {
        const twoDelimiters = await request(server).get('/hello//');
        const threeDelimiters = await request(server).get('/hello///');

        expect(twoDelimiters.status).toBe(200);
        expect(twoDelimiters.text).toBe('Hello world');

        expect(threeDelimiters.status).toBe(404);

        // Stated as an inequality too, so the pair cannot drift into agreeing with each other
        // while both remain individually plausible.
        expect(twoDelimiters.status).not.toBe(threeDelimiters.status);
    });

    // Case folding is a routing default, not something this project configured, and a classifier
    // must fold the same way. Recorded explicitly because a naive equality check against the
    // string '/hello' would reject all of these while Express serves every one.
    test('folds case when matching, so canonicalisation cannot be a plain equality check', async () => {
        const spellings = ['/hello', '/Hello', '/HELLO', '/hElLo'];

        const statuses = await Promise.all(
            spellings.map(async (target) => (await request(server).get(target)).status)
        );

        expect(statuses).toEqual([200, 200, 200, 200]);
        expect(spellings.filter((spelling) => spelling === '/hello')).toHaveLength(1);
    });
});

/**
 * Method Semantics Contract
 *
 * One route handler is registered - GET on the mounted /hello route - and no method-specific
 * handler stands beside it, so what a client gets for every other method follows from that single
 * registration plus the framework's own defaults. Four documents state those answers (README.md,
 * docs/api/hello.md, docs/architecture/overview.md and routes/hello.js's own header), and until
 * these cases existed nothing executable owned any of it: the behaviour could have changed under
 * the documentation without a single test failing.
 *
 * The container health check is a consumer of this path but not of the HEAD case specifically. Its
 * `wget --no-verbose --tries=1 --spider` was run against the image's own BusyBox 1.37.0 and issues
 * a GET, not a HEAD - so the probe rides on the same response the first suite asserts, and outside
 * this suite the HEAD behaviour is asserted by nothing but the documentation.
 *
 * What the framework does, and why:
 *
 *   HEAD /hello    - 200 with the headers the GET would carry, including Content-Length: 11, and
 *                    no body. The router dispatches HEAD to the registered GET handler rather than
 *                    to a handler of its own, so that handler runs and res.send() computes the
 *                    GET-equivalent headers; res.send then sees req.method === 'HEAD' and ends the
 *                    response without the body chunk, so Express suppresses the body itself rather
 *                    than handing it to Node (express 5.2.1, lib/response.js).
 *   OPTIONS /hello - 200 with `Allow: GET, HEAD`, built by the router from the methods the route
 *                    registers. There is no CORS middleware here; the header is the router
 *                    describing itself.
 *   POST, PUT, PATCH, DELETE, TRACE /hello - 404, because no route/method pair matches, exactly as
 *                    for a path that does not exist. This application contains no method gate and
 *                    answers 405 nowhere; asserting the 404 is what keeps that true.
 *
 * No handler is added for any method here, and the layers each case exercises are not the same.
 * Every request below passes through requestLogger, which app.js mounts ahead of the router, so all
 * of them - the OPTIONS and unmatched-method cases included - are logged by application code before
 * routing. What differs is how much further each one travels: HEAD reaches the registered GET
 * handler, OPTIONS is answered by the router itself and the unmatched methods by Express's default
 * final handler without any application route handler running, and the closing GET case is that
 * handler answering normally. These cases record all of that as it stands rather than asking for
 * anything new.
 */
describe('Method Semantics Contract', () => {
    beforeAll((done) => {
        server.listen(0, () => done());
    });

    afterAll((done) => {
        server.close(() => done());
    });

    it('answers HEAD /hello with the GET headers and an empty body', async () => {
        const response = await request(server)
            .head('/hello')
            .expect(200)
            .expect('Content-Type', 'text/html; charset=utf-8')
            .expect('Content-Length', '11');

        expect(response.status).toBe(200);

        // Content-Length still frames the 11 bytes a GET would return while no bytes arrive: that
        // combination is what makes this a HEAD response rather than a truncated GET. It is pinned
        // here because the documentation is otherwise its only owner - the container health check
        // probes with GET, as the header of this suite records.
        expect(response.headers['content-length']).toBe('11');
        expect(response.text || '').toBe('');
    });

    it('answers OPTIONS /hello with 200 and Allow: GET, HEAD', async () => {
        const response = await request(server)
            .options('/hello')
            .expect(200)
            .expect('Allow', 'GET, HEAD');

        expect(response.status).toBe(200);

        // Asserted with its exact separator, because a consumer reading this header splits on the
        // comma-space the router emits, and because the two method names are the whole point: a
        // third name appearing here would mean a second method had been registered on the route.
        expect(response.headers['allow']).toBe('GET, HEAD');
    });

    // Every explicit method the documentation describes as unmatched. TRACE is included because
    // the documentation names it and because it is the method a reader is most likely to assume
    // the framework treats specially.
    const unmatchedMethods = ['post', 'put', 'patch', 'delete', 'trace'];

    test.each(unmatchedMethods)(
        'answers %s /hello with a plain 404, since no route/method pair matches',
        async (method) => {
            const response = await request(server)[method]('/hello');

            expect(response.status).toBe(404);

            // The body is asserted too, so a response that somehow reached the handler while
            // reporting 404 could not pass as a rejection.
            expect(response.text).not.toBe('Hello world');
        }
    );

    // The registered method, re-asserted inside this suite as the control for the five cases
    // above: the 404s only mean "this method is not registered" if the same path with GET still
    // succeeds. Without it, an application that had lost the route entirely would satisfy every
    // expectation above.
    it('still answers GET /hello with 200, which is what makes those 404s method-specific', async () => {
        const response = await request(server).get('/hello');

        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello world');
    });
});
