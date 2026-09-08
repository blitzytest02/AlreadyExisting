/**
 * Express Application Composition Root
 *
 * Creates and configures the Express application instance for the Node.js tutorial
 * application. This module owns framework composition and nothing else: it declares
 * no routes, reads no environment variables and emits no log records of its own.
 * Those responsibilities belong to routes/, config/ and utils/logger.js respectively.
 *
 * Separating composition (this module) from transport (server.js) is what makes the
 * application testable: Supertest can drive the exported app directly, with no bound
 * port, while server.js wraps the same instance in an http.Server for real traffic.
 *
 * Registration Order (significant, not stylistic):
 * 1. requestLogger - observes every request before any handler runs, so requests are
 *    recorded whether they succeed, 404 or fail.
 * 2. routes       - the aggregated router, which mounts the /hello endpoint.
 * 3. errorHandler - registered LAST. Express only routes to a four-argument handler
 *    that is registered after every router, and errorHandler deliberately terminates
 *    the chain instead of calling next(). Moving it earlier silently disables it.
 *
 * Requirements Addressed:
 * - F-001: HTTP Server Initialization (application wiring for the request listener)
 * - F-002: Hello Endpoint Response (makes the /hello route reachable)
 * - F-003: Request Processing (middleware chain composition)
 *
 * @module app
 * @type {import('express').Express}
 */

// Express web framework - provides the application object, routing and response helpers
const express = require('express'); // Version: 5.1.0

// Aggregated application router (default export) - mounts /hello
const routes = require('./routes');

// Per-request logging middleware (default export) - runs before any route handler
const requestLogger = require('./middleware/requestLogger');

// Terminal error-handling middleware (NAMED export) - must be registered last
const { errorHandler } = require('./middleware/errorHandler');

// Instantiate the Express application that both server.js and the test suites consume
const app = express();

// Suppress the X-Powered-By response header so responses do not advertise the
// framework in use. Express sets this header unless it is explicitly disabled.
app.disable('x-powered-by');

// 1. Observability: log method, path and body for every incoming request
app.use(requestLogger);

// 2. Routing: mount the aggregated router at the application root, which exposes
//    GET /hello via the router's own '/hello' mount
app.use('/', routes);

// 3. Error handling: terminal four-arity middleware, registered after all routers
app.use(errorHandler);

/**
 * Export the configured Express application.
 *
 * Consumers:
 * - server.js passes it to http.createServer() as the request listener
 * - tests/unit/hello.test.js and tests/integration/hello.test.js drive it via Supertest
 */
module.exports = app;
