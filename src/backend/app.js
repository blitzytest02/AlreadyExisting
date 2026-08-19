/**
 * Express Application Composition Root
 *
 * Assembles the application: creates the Express instance, registers the cross-cutting
 * middleware and mounts the routing tree. It holds no business logic and registers no route.
 *
 * No socket is opened here. Binding belongs to server.js, which passes this application to
 * http.createServer(), and that separation is what lets the integration suite drive the same
 * assembled application on an ephemeral port.
 *
 * The published surface is one route, GET /hello, returning the literal text 'Hello world'.
 * This file adds nothing to it.
 */

const express = require('express');

// Each collaborator is read back in the shape its own module publishes, and the shapes are
// intentionally not harmonised: requestLogger and the route aggregator are bare default exports,
// while errorHandler is a named key. Reading one with the wrong shape yields undefined, and
// app.use(undefined) throws a TypeError demanding a middleware function.
const requestLogger = require('./middleware/requestLogger');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

/**
 * Express advertises `X-Powered-By: Express` on every response, which serves no purpose for a
 * client. Switching the setting off is a framework setting rather than added security
 * machinery - and the integration suite asserts the header is absent, so this line is contract.
 */
app.disable('x-powered-by');

/**
 * Express runs middleware in registration order, so the three registrations below are an ordering
 * contract - requestLogger, then routes, then errorHandler - rather than three independent
 * settings. Reordering them changes behaviour silently rather than raising an error.
 */

/**
 * Stage 1 - logging ahead of the router, so the log reflects traffic rather than success: a
 * request that later 404s is already recorded.
 *
 * What this registration records is one line per request carrying three values: the method
 * (`req.method`), the path (`req.originalUrl`) and the body. A GET to the endpoint therefore
 * prints `HTTP Request - Method: GET Path: /hello Body: {}`. Nothing about the response is
 * logged - the middleware never reads or writes it - so there is no status code, no duration
 * and no correlation identifier in the output.
 *
 * The path is the request target as sent, copied verbatim, and the body is whatever `req.body`
 * holds, serialized or stringified with nothing redacted and no bound on its length. No body
 * parser is mounted here, so `req.body` is undefined for every request and the logged value is
 * always `{}` - which is not a reason to add one, since a parser is what would start putting
 * client-supplied content into the log.
 */
app.use(requestLogger);

/**
 * Stage 2 - the route aggregator at the root path. Mounting at '/' is what makes the endpoint
 * resolve to exactly '/hello':
 *
 *     '/' (here)  +  '/hello' (routes/index.js)  +  '/' (routes/hello.js)  =  GET /hello
 *
 * The prefix is spelled out although Express treats it as the default, because it alone decides
 * the public URL: at '/api' the endpoint would become '/api/hello' and every consumer of the
 * contract - both Jest suites, the container health check, the Kubernetes probes and the
 * tutorial documentation - requests '/hello' exactly.
 */
app.use('/', routes);

/**
 * Stage 3 - error handling, necessarily last. `errorHandler` carries the four-parameter
 * (err, req, res, next) signature that marks a function as error-handling middleware, and a
 * four-parameter function is the only thing Express routes an error to. Registering it before
 * the routes, or wrapping it in a shorter function, disables it without warning.
 *
 * It receives errors passed to next(err), thrown synchronously in a handler, or produced by a
 * rejected promise, which Express 5 forwards automatically. A request matching no route is not
 * an error and never arrives here - Express answers it with its own 404.
 *
 * The two sides of this registration are deliberately asymmetric. The diagnostic it writes to
 * the server console is detailed - the error's message, stack and name alongside the request
 * URL, method, headers, params and query, an ISO timestamp, the User-Agent and the client
 * address - because that entry exists for whoever has to reproduce the failure. What the client
 * receives is the four-field envelope `{ error, status, timestamp, path }`, which says nothing
 * about how the server is built: `error` is the fixed string 'Internal Server Error'. Only
 * `path` carries request data - it is `req.originalUrl || req.url`, so the caller is handed back
 * the target it sent, query string included, which is what lets it correlate the failure.
 */
app.use(errorHandler);

module.exports = app;
