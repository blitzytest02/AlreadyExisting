const request = require('supertest');

const app = require('../../app.js');

/**
 * Hello Endpoint Unit Test Suite
 * 
 * Covers TC-003 (API Endpoint Test) and TC-004 (Response Content Test) for the
 * `/hello` route: the response the declared route serves, and the status a
 * client receives for a path no router matched.
 */
describe('/hello endpoint', () => {
    /**
     * Asserts status 200 and a response body of exactly "Hello world",
     * covering F-002-RQ-001 (the route handler responds to /hello),
     * F-002-RQ-002 (the exact "Hello world" text), F-002-RQ-003 (the GET
     * method) and F-004-RQ-003 (content delivered in the response body).
     *
     * No latency assertion is made: supertest 7.1.1 leaves
     * response.duration undefined, so response time cannot be asserted from
     * the response object and F-002's target is measured out of band (see
     * the curl timing loop in docs/setup/development.md).
     */
    it('should return \'Hello world\' and a 200 status code', async () => {
        // Supertest builds its own HTTP server around the app, binds it to an
        // OS-assigned ephemeral port and closes it as the request completes -
        // the .expect() assertions below run from that close callback - so no
        // server startup or port management happens in this suite
        const response = await request(app)
            .get('/hello')
            .expect(200)
            .expect('Hello world');
        
        expect(response).toBeDefined();
        expect(response.text).toBe('Hello world');
        expect(response.status).toBe(200);
    });

    /**
     * Asserts the status code, and nothing else: the response body and
     * headers are not inspected, so no property of the error payload is
     * verified here.
     */
    it('should return a 404 status code for non-existent routes', async () => {
        // This exercises Express's default handling of an unmatched path,
        // not this application's own error middleware, and checks the status
        // code a client receives for a route that is not declared
        const response = await request(app)
            .get('/nonexistent')
            .expect(404);
        
        expect(response).toBeDefined();
        expect(response.status).toBe(404);
    });
});

/**
 * File Summary:
 * 
 * Two cases are the whole of the executable coverage here. TC-003 and
 * TC-004 are covered by the first: GET /hello asserts status 200 and a body
 * of exactly "Hello world". The second asserts that GET /nonexistent answers
 * 404, and nothing else about that response.
 */