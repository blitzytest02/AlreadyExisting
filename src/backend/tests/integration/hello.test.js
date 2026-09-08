/**
 * Integration Test Suite for Hello API Endpoint
 * 
 * This file exercises the /hello endpoint over real HTTP through two
 * INDEPENDENT checks that share no server instance:
 *
 * 1. A server lifecycle check. beforeAll calls listen(0) on the http.Server
 *    exported by server.js and afterAll closes it. That proves the module can
 *    be imported without binding a port, can take an OS-assigned one on demand
 *    and releases it again. This server receives none of the requests below.
 * 2. HTTP request assertions against the exported Express app. request(app)
 *    hands the app - a plain function - to Supertest, which wraps it in an
 *    http.createServer(app) of its own and binds a separate ephemeral port for
 *    the request. The two servers hold different ports at the same time.
 * 
 * Requirements Implementation:
 * - TC-003: Provides the test case for the /hello API endpoint
 * - TC-004: Provides the test case for validating the 'Hello world' response
 *   content
 * - TC-006: Provides the test case for verifying successful response delivery
 * - F-003-RQ-004: Tests that the server returns a 404 for non-existent routes
 */

const request = require('supertest');

const app = require('../../app.js');
const server = require('../../server.js');

describe('Hello API Endpoint', () => {
    /**
     * Server Startup Hook - beforeAll
     * 
     * Opens the http.Server exported by server.js on an ephemeral port, once,
     * before the two cases run. A successful bind proves two things: server.js
     * can be imported without binding, because it guards its own
     * server.listen(config.port) with `require.main === module`, and the
     * exported object is a real, not-yet-listening http.Server, so this bind is
     * the first one and cannot raise ERR_SERVER_ALREADY_LISTEN.
     * 
     * This hook registers no 'error' listener. A bind failure such as
     * EADDRINUSE is delivered instead to the listener server.js installs on the
     * same server object, which logs the failure and then exits the process, so
     * a startup failure surfaces as a dead Jest worker rather than as a reported
     * hook failure.
     * 
     * @param {Function} done - Jest callback function to signal completion of async setup
     */
    beforeAll((done) => {
        // Bind the imported server to an OS-assigned free port (port 0) so this
        // hook cannot collide with a development server or another Jest worker
        server.listen(0, () => {
            // The listener is bound; the suite's requests do not go to it
            done();
        });
    });

    /**
     * Server Shutdown Hook - afterAll
     * 
     * Closes the listener beforeAll opened, releasing its port so the Jest
     * worker does not finish with an open handle - in CI a hanging worker is
     * what stalls the run. The port itself is not the risk: it was OS-assigned,
     * so a later listen(0) elsewhere simply takes a different free port. What
     * does fail is calling listen(0) again on this same still-listening server,
     * which raises ERR_SERVER_ALREADY_LISTEN.
     * 
     * The Supertest servers are not this hook's concern: each is created and
     * torn down inside its own request. This hook handles no signals, and
     * neither this file nor the application registers a SIGTERM or SIGINT
     * handler, so nothing here shows the drain-on-signal behaviour a container
     * runtime would trigger.
     * 
     * @param {Function} done - Jest callback function to signal completion of async cleanup
     */
    afterAll((done) => {
        // Close the listener opened in beforeAll so its port is released and the
        // Jest worker can exit without an open handle. The callback declares no
        // error parameter, so a close failure would surface as a hook timeout
        // rather than as a reported error
        server.close(() => {
            done();
        });
    });

    /**
     * Success Path Integration Test - GET /hello Endpoint
     * 
     * Sends one real HTTP GET to /hello over loopback, into a server Supertest
     * owns rather than the one the hooks opened, so what this case exercises is
     * the composed Express application: its middleware chain, its routing, and
     * the response that res.send('Hello world') produces.
     * 
     * Asserted here: status 200, a text/html Content-Type and a body of exactly
     * 'Hello world' - each once in the Supertest chain and once on the resolved
     * response. Not asserted: timing. F-002 sets a sub-100ms budget and the
     * guard below names it, but supertest 7.2.2 leaves response.duration
     * undefined, so the guard's condition is false and the assertion inside it
     * never runs; latency is measured outside this suite by timing requests
     * against a running process. This case makes no security assertion.
     * 
     * Requirements Verification:
     * - TC-003: Validates the /hello API endpoint functionality
     * - TC-004: Confirms 'Hello world' response content exactness
     * - TC-006: Verifies successful response delivery to client
     * - F-002-RQ-002: Tests exact "Hello world" text requirement
     * - F-004-RQ-003: Validates response body content delivery
     * 
     * @returns {Promise<void>} Promise that resolves when all assertions pass
     */
    it('should return 200 OK with \'Hello world\' for GET /hello', async () => {
        // Supertest wraps the exported app in an http.Server of its own, binds
        // it to an ephemeral port and issues a real request over loopback; the
        // server the hooks opened is not the target
        const response = await request(app)
            .get('/hello')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .expect('Hello world');

        expect(response.status).toBe(200);
        
        expect(response.text).toBe('Hello world');
        
        expect(response.headers['content-type']).toMatch(/text\/html/);
        
        // Inert timing guard, kept deliberately: supertest 7.2.2 never sets
        // response.duration, so the condition below is always false and the
        // assertion never executes. It records the intended budget, not a
        // measurement - nothing here evidences response time
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(100);
        }
    });

    /**
     * Error Handling Integration Test - Non-existent Route
     * 
     * Sends a GET to a path no router matches. What answers it is Express's own
     * built-in final handler, reached because the router stack ran out of
     * matches - NOT errorHandler, the four-argument middleware app.js registers
     * last. Express hands an error to a four-argument handler only when a
     * handler throws or calls next(err), and an unmatched route does neither, so
     * errorHandler never runs here and its JSON envelope is never produced; that
     * middleware is covered by tests/unit/errorHandler.test.js, which invokes it
     * directly. The application registers no custom 404 handler either.
     *
     * Asserted here: status 404 (F-003-RQ-004), and the absence of the
     * X-Powered-By header. The response body is never inspected - Express's
     * default 404 page echoes the request method and path back to the client, so
     * this case is not evidence that error output withholds request or
     * implementation detail. No timing figure is recorded, for the same
     * response.duration reason as the success case. It is the last case in the
     * file and no request follows it, so it is also not evidence that the
     * application still serves traffic after a 404.
     * 
     * @returns {Promise<void>} Promise that resolves when all assertions pass
     */
    it('should return 404 Not Found for a non-existent route', async () => {
        // This exercises Express's built-in handling for an unmatched route,
        // not the application's own errorHandler middleware
        const response = await request(app)
            .get('/nonexistent')
            .expect(404);

        expect(response.status).toBe(404);
        
        // The 404 body is Express's own HTML error page rather than a contract
        // this application defines, so it is deliberately not asserted: the
        // framework may change that page between releases
        
        // Inert timing guard again: response.duration is undefined under
        // supertest 7.2.2, so the assertion below never executes
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(50);
        }
        
        // Assert the default framework banner is absent: app.js disables
        // x-powered-by globally, so no response carries Express's default
        // X-Powered-By header. That reduces casual fingerprinting rather than
        // hiding the framework, which the default 404 body above still reveals.
        // It is the only security-related assertion in the file - the body is
        // not inspected and no other header is checked.
        expect(response.headers['x-powered-by']).toBeUndefined();
    });
});

/**
 * Integration Test File Documentation Summary
 * 
 * Two cases plus a server open/close check in the hooks:
 * - GET /hello asserted on status, Content-Type and exact body (TC-003,
 *   TC-004, TC-006, F-002-RQ-002, F-004-RQ-003)
 * - GET /nonexistent asserted on status and the absence of X-Powered-By
 *   (F-003-RQ-004)
 * - beforeAll/afterAll open the imported server on an ephemeral port and close
 *   it, independently of those two cases
 *
 * Each request runs against a server Supertest creates around the exported app.
 * Both timing guards are inert by design, because supertest 7.2.2 does not
 * populate response.duration, so this file evidences no latency figure.
 */