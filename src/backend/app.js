/**
 * Express Application Composition Root
 *
 * The single place where the application is assembled: this file creates the Express
 * instance, registers the cross-cutting middleware, mounts the routing tree, and hands the
 * finished application to its consumers. It holds no business logic and defines no routes.
 *
 * The separation is deliberate and is the central lesson of this module:
 *
 *   - app.js     builds the application  (what the application IS)
 *   - server.js  runs the application    (how the application is EXPOSED)
 *   - routes/    answer requests         (what the application DOES)
 *
 * Keeping assembly apart from network binding lets one configured application be driven by a
 * real HTTP listener in production and by an in-process test client under test, with no
 * branching: server.js passes it to http.createServer(), the Jest suites to Supertest.
 *
 * Request path:  client -> requestLogger -> routes -> routes/hello.js -> 'Hello world'
 *
 * Scope: exactly one application endpoint is published - GET /hello, returning the literal
 * text 'Hello world'. This file adds nothing to that surface. (F-001, F-002-RQ-001, F-003)
 */

// Express.js v5.2.1 - resolved from the declared ^5.1.0 range. Supplies the application
// factory, the routing engine (path-to-regexp@8.x, hardened against ReDoS) and Express 5's
// automatic forwarding of rejected promises into error-handling middleware.
const express = require('express');

/**
 * Internal Application Modules
 *
 * These three collaborators are the entire dependency surface of this file, and each is read
 * back exactly as the module that owns it publishes it - the shapes are intentionally NOT
 * harmonised:
 *
 *   ./middleware/requestLogger  ->  a bare function        (module.exports = requestLogger)
 *   ./routes                    ->  a bare Express router  (module.exports = router)
 *   ./middleware/errorHandler   ->  an object, one key      (module.exports = { errorHandler })
 *
 * Reading one with the wrong shape yields `undefined`, and handing `undefined` to Express raises
 * a TypeError demanding a middleware function - so each shape is matched to its source here.
 */
const requestLogger = require('./middleware/requestLogger');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

/**
 * The factory returns a request listener that is itself a callable function, carrying the
 * middleware stack and routing table built below. No socket is opened and no port claimed here:
 * binding belongs to server.js alone, letting the integration suite choose an ephemeral port.
 */
const app = express();

/**
 * Framework Fingerprint Suppression
 *
 * Express advertises itself on every response with `X-Powered-By: Express`. Switching the
 * setting off removes a free hint about the server's implementation at no cost, as the header
 * serves no functional purpose for a client. It is a framework setting, not added security
 * machinery. The integration suite asserts the header is absent, so this line is contract.
 */
app.disable('x-powered-by');

/**
 * Path Matching - Express Defaults Kept Deliberately
 *
 * Two routing settings are left at their Express defaults, and the omission is a decision
 * rather than an oversight, so it is recorded here:
 *
 *   'case sensitive routing'  false  ->  /hello, /HELLO and /Hello all reach the route
 *   'strict routing'          false  ->  /hello and /hello/ both reach the route
 *
 * The endpoint being published is one route: `GET /hello`, registered once in routes/hello.js.
 * These settings do not add a second route or a second path - the runtime route table holds a
 * single entry either way; they only widen how liberally an incoming URL is matched against it.
 * Turning either on would be adding a gate that rejects requests the framework accepts, which
 * is the same class of change as answering HEAD or OPTIONS with a custom handler: outside what
 * this tutorial sets out to teach, and outside its scope. Standard framework behaviour is
 * preserved instead, and routes/index.js documents the case-insensitive default alongside the
 * mount it applies to.
 *
 * A stricter reading of the requirement - only the exact lowercase path may answer - is a
 * one-line change here (`app.set('case sensitive routing', true);`) and belongs to whoever owns
 * that requirement. It is written down rather than switched on so the choice stays visible.
 */

/**
 * Middleware Pipeline
 *
 * Express runs middleware in registration order, so the three registrations below are an
 * ordering contract rather than three independent settings:
 *
 *   1. requestLogger  observes every request before any routing decision is taken
 *   2. routes         resolves the request to a handler
 *   3. errorHandler   catches what the earlier stages could not complete
 *
 * Reordering them changes behaviour silently rather than raising an error - hence the notes.
 */

/**
 * Stage 1 - logging ahead of the router, so it reflects traffic rather than success: a request
 * that later 404s or fails is already recorded. On a GET `req.body` is undefined and the logger
 * reports `Body: {}` via its no-body branch - not a reason to configure request body parsing.
 */
app.use(requestLogger);

/**
 * Stage 2 - the route aggregator at the root path. Mounting at '/' is what makes the endpoint
 * resolve to exactly '/hello':
 *
 *     '/' (here)  +  '/hello' (routes/index.js)  +  '/' (routes/hello.js)  =  GET /hello
 *
 * The application could mount this aggregator at either '/' or another prefix; '/' is the
 * correct choice here. Mounting it at '/api' would relocate the endpoint to '/api/hello' and break every
 * consumer of the contract at once - both Jest suites, the container health check, the
 * Kubernetes probes and the tutorial documentation all request '/hello' exactly. The prefix is
 * spelled out although Express treats it as the default, because it alone decides the public URL.
 *
 * No path is registered in this file; the sole route lives in routes/hello.js and this line
 * only makes it reachable.
 */
app.use('/', routes);

/**
 * Stage 3 - error handling, necessarily last. `errorHandler` carries the four-parameter
 * (err, req, res, next) signature that marks a function as error-handling middleware, and a
 * four-parameter function is the only thing Express will route an error to. Registering it
 * before the routes, or wrapping it in a shorter function, disables it without warning.
 *
 * It receives errors passed to next(err), thrown synchronously in a handler, or produced by a
 * rejected promise, which Express 5 forwards automatically. A request matching no route is not
 * an error and never arrives here - Express answers it with its own 404, as the suite asserts.
 */
app.use(errorHandler);

/**
 * The assembled application is published as this module's only value, matching how consumers
 * read it back: server.js as `require('./app')`, the unit suite as `require('../../app.js')`,
 * the integration suite transitively via server.js. Node caches resolved modules, so all share
 * one instance and the middleware stack is assembled exactly once per process.
 */
module.exports = app;
