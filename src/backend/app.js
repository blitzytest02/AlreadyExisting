/**
 * Express Application Composition Root
 *
 * Owns framework composition and nothing else: no routes, no configuration
 * reads, no log records of its own. Keeping composition separate from
 * transport (server.js) is what lets Supertest drive the exported app with no
 * bound port, while server.js wraps the same instance in an http.Server.
 *
 * Requirements Addressed:
 * - F-001: HTTP Server Initialization (application wiring for the request
 *   listener)
 * - F-002: Hello Endpoint Response (makes the /hello route reachable)
 * - F-003: Request Processing (middleware chain composition)
 *
 * @module app
 * @type {Function}
 */

'use strict';

const express = require('express');

// Aggregated application router (default export) - mounts /hello
const routes = require('./routes');

// Per-request logging middleware (default export) - runs before any handler
const requestLogger = require('./middleware/requestLogger');

// Terminal error-handling middleware (NAMED export) - must be registered last
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Remove the X-Powered-By header Express sets by default - the only
// response-header control here. It strips the framework banner from every
// response and reduces casual fingerprinting; it does not prevent
// identification, which Express's own default 404 page still reveals.
app.disable('x-powered-by');

// 1. Observability: requestLogger records the method, path and req.body of
//    every request, then calls next(). No body parser runs, so body is '{}'.
app.use(requestLogger);

// 2. Routing: mount the aggregated router at the application root, which
//    exposes GET /hello via the router's own '/hello' mount
app.use('/', routes);

// 3. Error handling: errorHandler must stay last. Express hands an error to a
//    four-argument handler only when it is registered after every router, and
//    this one ends the chain itself: it sends the 500 envelope and passes the
//    error to no application middleware, because none is registered behind
//    it. A response that has already started is the one case it cannot
//    answer, and there Express's own final handler closes the connection.
app.use(errorHandler);

module.exports = app;
