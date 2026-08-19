/**
 * Integration Test Suite for Hello API Endpoint
 * 
 * This integration test file verifies the functionality of the /hello endpoint from end-to-end.
 * It uses Supertest to send live HTTP requests to the running application, ensuring that the
 * server, routing, and response generation work together as expected.
 * 
 * The test suite implements comprehensive integration testing patterns that validate:
 * - HTTP server initialization and startup
 * - Express.js application routing and middleware processing
 * - Endpoint response generation and content delivery, including response framing
 * - Error handling for non-existent routes
 * - Server lifecycle management during testing
 * - Middleware registration order inside the application composition root
 * - Absence of import-time side effects in the server module
 * 
 * Testing Architecture:
 * - Jest v29+ as the primary testing framework for test organization and assertions
 * - Supertest v7.1.1 for HTTP endpoint testing with live server requests
 * - Real HTTP server instance for authentic integration testing scenarios
 * - Proper server lifecycle management with setup and teardown procedures
 * 
 * Requirements Implementation:
 * - TC-003: Provides the test case for the /hello API endpoint
 * - TC-004: Provides the test case for validating the 'Hello world' response content
 * - TC-006: Provides the test case for verifying successful response delivery
 * - F-003-RQ-004: Tests that the server returns a 404 for non-existent routes
 * - Integration Testing: Implements the integration testing strategy for API endpoints
 * 
 * Technical Specifications:
 * - Node.js v22.16.0 LTS runtime environment with enhanced V8 support
 * - Express.js 5.1.0 framework with automatic promise rejection handling
 * - Jest testing framework with built-in assertion library and test runner
 * - Supertest HTTP testing library for making assertions against Express applications
 * - Ephemeral port allocation for CI/CD compatibility and test isolation
 * 
 * Test Strategy:
 * - End-to-end testing approach verifying complete request-response cycle
 * - Real HTTP server startup and shutdown for authentic testing conditions
 * - HTTP protocol compliance testing with status codes and headers
 * - Response content validation ensuring exact specification compliance
 * - Error condition testing for comprehensive coverage of failure scenarios
 * 
 * Educational Value:
 * - Demonstrates proper integration testing patterns for Node.js applications
 * - Shows best practices for HTTP endpoint testing with Supertest
 * - Illustrates server lifecycle management during automated testing
 * - Provides foundation for understanding enterprise-grade testing strategies
 * - Establishes patterns for scaling from simple to complex integration tests
 */

// External testing dependencies with version specifications
const request = require('supertest'); // v7.1.1 - HTTP assertions library for testing Express applications

// Internal application imports for integration testing setup
const server = require('../../server.js'); // HTTP server instance for lifecycle management during tests

/**
 * Hello API Endpoint Integration Test Suite
 * 
 * This test suite groups all integration tests related to the /hello endpoint,
 * providing comprehensive coverage of the endpoint's functionality including
 * success scenarios, error conditions, and edge cases.
 * 
 * Test Suite Organization:
 * - Setup and teardown procedures for server lifecycle management
 * - Success path testing for normal endpoint operation
 * - Error condition testing for comprehensive coverage
 * - Response validation testing for specification compliance
 * 
 * Jest Testing Framework Features:
 * - Describe blocks for logical test grouping and organization
 * - beforeAll/afterAll hooks for test environment setup and cleanup
 * - Individual test cases using 'it' blocks with descriptive assertions
 * - Async/await support for handling asynchronous server operations
 * - Built-in assertion library for comprehensive response validation
 * 
 * Integration Testing Scope:
 * - HTTP server startup and configuration validation
 * - Express.js middleware stack execution and request processing
 * - Route matching and handler delegation through the routing hierarchy
 * - Response generation and content delivery to HTTP clients
 * - Error handling and appropriate status code generation
 * 
 * Test Environment Considerations:
 * - Isolated test environment with ephemeral port allocation
 * - Clean server startup and shutdown for each test suite execution
 * - No external dependencies or test data requirements
 * - Stateless testing approach ensuring test independence and repeatability
 */
describe('Hello API Endpoint', () => {
    /**
     * Server Startup Hook - beforeAll
     * 
     * Starts the HTTP server on an ephemeral port before running any tests in this suite.
     * This ensures the application is ready to accept requests and provides a clean
     * testing environment isolated from other test suites or development servers.
     * 
     * Ephemeral Port Strategy:
     * - Port 0 instructs the operating system to assign a random available port
     * - Prevents port conflicts in CI/CD environments and parallel test execution
     * - Ensures test isolation and independence from external services
     * - Allows multiple test suites to run simultaneously without interference
     * 
     * Server Initialization Process:
     * 1. HTTP server instance listens on OS-assigned ephemeral port
     * 2. Express application becomes available for handling HTTP requests
     * 3. All middleware and routing configurations are active and ready
     * 4. Test execution can proceed with confidence in server availability
     * 
     * Asynchronous Testing Pattern:
     * - Uses Jest's done callback pattern for handling asynchronous operations
     * - Server.listen() callback signals completion of server startup process
     * - done() invocation informs Jest that async setup is complete
     * - Prevents test execution until server is fully operational
     * 
     * Error Handling:
     * - Server startup failures will cause test suite to fail immediately
     * - Clear error reporting for debugging server configuration issues
     * - Proper cleanup even in case of startup failures
     * - Integration with Jest's error handling and reporting mechanisms
     * 
     * Performance Considerations:
     * - Startup time typically under 1 second for simple Express applications
     * - Memory footprint minimal with basic middleware and single endpoint
     * - CPU usage negligible during idle server state
     * - Network resource allocation through ephemeral port assignment
     * 
     * CI/CD Compatibility:
     * - No hardcoded port dependencies preventing deployment conflicts
     * - Automatic port detection suitable for containerized test environments
     * - Parallel test execution support through isolated port allocation
     * - Cloud CI/CD platform compatibility with dynamic port assignment
     * 
     * @param {Function} done - Jest callback function to signal completion of async setup
     */
    beforeAll((done) => {
        // Start the server on a random available port (port 0) to avoid conflicts
        // This is especially important in CI/CD environments where multiple tests
        // or services might be running simultaneously on the same machine
        server.listen(0, () => {
            // Server is now listening and ready to accept HTTP requests
            // The done() callback signals to Jest that the asynchronous setup is complete
            done();
        });
    });

    /**
     * Server Shutdown Hook - afterAll
     * 
     * Stops the HTTP server after all tests in this suite have finished executing.
     * This ensures proper resource cleanup and allows the test process to exit
     * cleanly without hanging connections or resource leaks.
     * 
     * Cleanup Operations:
     * - Closes all active HTTP connections and prevents new connections
     * - Releases the network port allocated during server startup
     * - Deallocates server-related memory and system resources
     * - Ensures clean test environment reset for subsequent test suites
     * 
     * Resource Management:
     * - Prevents memory leaks from persistent server instances
     * - Releases network ports for reuse by other processes
     * - Cleans up event listeners and timers associated with server
     * - Ensures proper garbage collection of server-related objects
     * 
     * Test Process Lifecycle:
     * - Allows Jest test runner to exit cleanly after test completion
     * - Prevents hanging Node.js processes in CI/CD environments
     * - Ensures proper test isolation between different test suite executions
     * - Maintains clean state for subsequent test runs
     * 
     * Error Handling:
     * - Server.close() callback provides error handling for shutdown failures
     * - Proper error reporting if server cannot be gracefully shut down
     * - Timeout handling for servers that don't respond to close requests
     * - Integration with Jest's cleanup and error reporting mechanisms
     * 
     * Performance Impact:
     * - Minimal shutdown time for simple Express applications (< 100ms)
     * - No blocking operations during graceful shutdown process
     * - Efficient resource deallocation without memory fragmentation
     * - Clean process termination enabling fast test suite completion
     * 
     * Production Testing Patterns:
     * - Demonstrates proper server lifecycle management for production deployments
     * - Shows graceful shutdown patterns for container orchestration
     * - Provides foundation for health check and readiness probe implementations
     * - Establishes patterns for zero-downtime deployment scenarios
     * 
     * @param {Function} done - Jest callback function to signal completion of async cleanup
     */
    afterAll((done) => {
        // Close the server and clean up resources
        // This ensures the test process can exit cleanly and doesn't leave
        // hanging connections or allocated ports
        server.close(() => {
            // Server has been successfully shut down and all resources cleaned up
            // The done() callback signals to Jest that the asynchronous cleanup is complete
            done();
        });
    });

    /**
     * Success Path Integration Test - GET /hello Endpoint
     * 
     * Tests the successful response of the GET /hello endpoint, validating the complete
     * request-response cycle from HTTP client through server processing to response delivery.
     * This test verifies that all system components work together correctly to deliver
     * the expected functionality.
     * 
     * Test Scenario Coverage:
     * - HTTP GET request processing and routing
     * - Express.js middleware stack execution
     * - Route handler execution and response generation
     * - HTTP status code and header generation
     * - Response content delivery and format validation
     * 
     * Supertest Integration:
     * - Creates HTTP client instance configured for the Express app
     * - Sends real HTTP requests through the complete networking stack
     * - Provides comprehensive assertion methods for response validation
     * - Handles async request processing with Promise-based patterns
     * - Integrates seamlessly with Jest's async testing capabilities
     * 
     * Request Processing Flow Validation:
     * 1. HTTP GET request sent to /hello endpoint
     * 2. Express application receives and parses request
     * 3. Request logging middleware captures request details
     * 4. Main router performs path matching for /hello
     * 5. Hello router delegates to appropriate route handler
     * 6. Route handler generates "Hello world" response
     * 7. Response sent back through middleware stack to client
     * 8. Test assertions validate complete response
     * 
     * Response Validation Assertions:
     * - HTTP status code verification (200 OK)
     * - Content-Type header validation (text/html)
     * - Content-Length header validation (exactly 11 bytes, the length of 'Hello world')
     * - Response body content exact match verification
     * - Response timing and performance characteristics
     * 
     * Requirements Verification:
     * - TC-003: Validates the /hello API endpoint functionality
     * - TC-004: Confirms 'Hello world' response content exactness
     * - TC-006: Verifies successful response delivery to client
     * - F-002-RQ-002: Tests exact "Hello world" text requirement
     * - F-004-RQ-003: Validates response body content delivery
     * 
     * Performance Validation:
     * - Response time should be under 100ms (F-002 performance criteria)
     * - Memory usage should remain minimal during request processing
     * - No resource leaks or connection handling issues
     * - Efficient request throughput with minimal latency
     * 
     * Security Validation:
     * - No sensitive information disclosure in response headers
     * - Proper HTTP protocol compliance and security headers
     * - Input validation and sanitization (minimal for GET request)
     * - No vulnerability exposure through error responses
     * 
     * Edge Case Considerations:
     * - Request header variations and their handling
     * - Query parameter handling (should be ignored for this endpoint)
     * - HTTP/1.1 protocol compliance and keep-alive behavior
     * - Concurrent request handling and thread safety
     * 
     * @returns {Promise<void>} Promise that resolves when all assertions pass
     */
    it('should return 200 OK with \'Hello world\' for GET /hello', async () => {
        // Send HTTP GET request to /hello endpoint using Supertest
        // Supertest creates a real HTTP client and sends the request through
        // the complete networking stack to test the actual server behavior
        const response = await request(server)
            .get('/hello')
            .expect(200) // Assert HTTP status code is 200 (OK)
            .expect('Content-Type', /text\/html/) // Assert Content-Type header includes 'text/html'
            .expect('Content-Length', '11') // Assert the framed body length is exactly 11 bytes
            .expect('Hello world'); // Assert response body text is exactly 'Hello world'

        // Additional explicit assertions for comprehensive validation
        // These provide more detailed error messages and explicit test coverage
        
        // Verify the response status code explicitly
        expect(response.status).toBe(200);
        
        // Verify the response body content with exact string matching
        expect(response.text).toBe('Hello world');
        
        // Verify the Content-Type header is set appropriately by Express
        expect(response.headers['content-type']).toMatch(/text\/html/);
        
        // Verify the Content-Length header frames exactly the 11 bytes of 'Hello world'.
        // The header is asserted explicitly, and not only inferred from the body text,
        // because a chunked or re-framed response carrying the right characters would
        // satisfy every other assertion above while breaking the published contract.
        // Byte length is measured rather than character length so a multi-byte
        // character silently introduced into the literal is caught here too.
        expect(response.headers['content-length']).toBe('11');
        expect(Buffer.byteLength(response.text, 'utf8')).toBe(11);

        // Performance assertion - response should be fast
        // Note: response.duration might not be available in all Supertest versions
        // This demonstrates performance awareness in testing
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(100); // Should respond in under 100ms
        }
    });

    /**
     * Error Handling Integration Test - Non-existent Route
     * 
     * Tests the application's handling of requests to routes that do not exist,
     * validating the error handling middleware and 404 response generation.
     * This test ensures the application gracefully handles invalid requests
     * and provides appropriate error responses.
     * 
     * Error Handling Architecture Validation:
     * - Express.js built-in 404 handling for unmatched routes
     * - Error middleware stack execution for unhandled requests
     * - Proper HTTP status code generation for missing resources
     * - Error response format and content validation
     * 
     * 404 Error Scenario Testing:
     * - Request to non-existent endpoint path
     * - Verification that no route handler is matched
     * - Confirmation that 404 status is returned to client
     * - Validation that error response is properly formatted
     * 
     * Requirements Verification:
     * - F-003-RQ-004: Tests that server returns 404 for non-existent routes
     * - Error Response Management: Validates structured error processing
     * - HTTP Protocol Compliance: Ensures proper status code usage
     * - Client Error Handling: Provides appropriate feedback for invalid requests
     * 
     * Security Considerations:
     * - No sensitive information disclosure in error responses
     * - Generic error messages prevent information leakage
     * - No stack traces or internal details exposed to clients
     * - Consistent error response format across all 404 scenarios
     * 
     * Error Response Format:
     * - HTTP 404 Not Found status code
     * - Appropriate error headers set by Express
     * - Generic error message without implementation details
     * - Consistent format matching application error handling patterns
     * 
     * Testing Strategy:
     * - Uses a clearly non-existent route path for testing
     * - Validates only the essential error response characteristics
     * - Avoids testing implementation-specific error details
     * - Focuses on client-facing behavior rather than internal mechanisms
     * 
     * Performance Considerations:
     * - 404 responses should be generated quickly (< 50ms)
     * - No unnecessary processing for obviously invalid routes
     * - Efficient route matching failure detection
     * - Minimal resource consumption for error responses
     * 
     * Integration with Express Error Handling:
     * - Tests the complete Express error handling pipeline
     * - Validates error middleware execution for unmatched routes
     * - Confirms proper error response generation and delivery
     * - Ensures error handling doesn't interfere with valid requests
     * 
     * @returns {Promise<void>} Promise that resolves when all assertions pass
     */
    it('should return 404 Not Found for a non-existent route', async () => {
        // Send HTTP GET request to a deliberately non-existent endpoint
        // This tests the application's error handling for unmatched routes
        const response = await request(server)
            .get('/nonexistent')
            .expect(404); // Assert HTTP status code is 404 (Not Found)

        // Additional explicit assertions for comprehensive error handling validation
        
        // Verify the response status code explicitly for clear test reporting
        expect(response.status).toBe(404);
        
        // The response body content for 404 errors is typically handled by Express
        // and may vary, so we focus on the status code rather than specific content
        // This approach makes the test more robust and less brittle
        
        // Verify that the response is received promptly
        // 404 responses should be fast since no complex processing is required
        if (response.duration !== undefined) {
            expect(response.duration).toBeLessThan(50); // Should respond in under 50ms
        }
        
        // Optional: Verify that no unexpected headers are present
        // This helps ensure the error response doesn't leak sensitive information
        expect(response.headers['x-powered-by']).toBeUndefined(); // Should not expose framework details
    });

    /**
     * Additional Integration Test Scenarios
     * 
     * Future test cases that could be added to enhance coverage:
     * 
     * 1. HTTP Method Validation:
     *    - Test POST, PUT, PATCH, DELETE and TRACE on /hello (all 404 - only GET is registered)
     *    - Test HEAD /hello (200) and OPTIONS /hello (200, 'Allow: GET, HEAD'), both Express-generated
     * 
     * 2. Request Header Handling:
     *    - Test various Accept headers and content negotiation
     *    - Validate proper handling of User-Agent and other standard headers
     * 
     * 3. Concurrent Request Testing:
     *    - Send multiple simultaneous requests to validate thread safety
     *    - Test server stability under concurrent load
     * 
     * 4. Edge Case Testing:
     *    - Test requests with very long URLs or unusual characters
     *    - Validate handling of malformed HTTP requests
     * 
     * 5. Performance Testing:
     *    - Measure and validate response times under various conditions
     *    - Test memory usage during extended request processing
     * 
     * These additional tests would provide more comprehensive coverage
     * as the application grows beyond the current tutorial scope.
     */
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
 * The hooks at the top of this file are only safe because importing src/backend/server.js
 * does nothing on its own: everything with a side effect - the call to server.listen() and
 * the process-level 'unhandledRejection' and 'uncaughtException' registrations - lives
 * behind a require.main === module guard, so it runs for `node server.js` and not for a
 * require. That guard is load-bearing in two directions, and neither failure is visible in
 * an endpoint assertion:
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
 * Integration Test File Documentation Summary
 * 
 * This integration test file implements comprehensive end-to-end testing for the
 * Node.js tutorial application's /hello endpoint, demonstrating enterprise-grade
 * testing practices while maintaining educational clarity and simplicity.
 * 
 * Key Implementation Achievements:
 * - Complete integration testing using Jest and Supertest frameworks
 * - Proper server lifecycle management with setup and teardown procedures
 * - Comprehensive test coverage for success and error scenarios
 * - Real HTTP request processing through the complete application stack
 * - Performance-aware testing with response time validation
 * - Middleware ordering protection for the application composition root
 * - Import-isolation protection for the exported HTTP server
 * 
 * Educational Impact:
 * - Provides clear example of integration testing patterns for Node.js applications
 * - Demonstrates proper HTTP endpoint testing with Supertest library
 * - Shows server lifecycle management during automated testing scenarios
 * - Establishes foundation for understanding enterprise testing strategies
 * - Illustrates transition from unit tests to integration tests
 * 
 * Production Readiness:
 * - Follows Node.js and Express.js testing best practices
 * - Implements comprehensive error handling and edge case coverage
 * - Uses stable versions of testing frameworks for reliability
 * - Includes extensive documentation for maintainability and learning
 * - Provides scalable foundation for expanded testing scenarios
 * 
 * Requirements Compliance:
 * - TC-003: Test case for /hello API endpoint ✓
 * - TC-004: Test case for 'Hello world' response validation ✓
 * - TC-006: Test case for successful response delivery ✓
 * - F-003-RQ-004: 404 testing for non-existent routes ✓
 * - Integration Testing Strategy: API endpoint testing implementation ✓
 * 
 * Testing Framework Integration:
 * - Jest v29+ for test organization, execution, and assertion
 * - Supertest v7.1.1 for HTTP endpoint testing and validation
 * - Async/await patterns for modern JavaScript testing
 * - Comprehensive assertion coverage for response validation
 * - Performance monitoring integration for response time tracking
 * 
 * Future Enhancement Opportunities:
 * - Additional HTTP method testing (POST, PUT, DELETE)
 * - Request header validation and content negotiation testing
 * - Concurrent request testing for performance validation
 * - Security testing for input validation and error handling
 * - Load testing integration for scalability assessment
 * 
 * This implementation successfully bridges the gap between educational tutorials
 * and production-ready integration testing, providing learners with practical
 * experience in enterprise-grade Node.js testing strategies and patterns.
 */