// Express.js v5.1.0 - Pinned release with enhanced promise support and automatic error handling
const express = require('express');

const helloRouter = require('./hello.js');

/**
 * Main Application Router
 * 
 * Aggregates the endpoint route modules and mounts each on its public path, so
 * an endpoint module never has to know where it is mounted. This router is the
 * default export consumed by src/backend/app.js.
 * 
 * Requirements Implementation:
 * - F-002: Hello Endpoint Implementation - integrates the hello endpoint router
 * - F-003-RQ-002: Route matching - matches the /hello path and delegates to the
 *   hello router
 */

/**
 * Express Router Instance
 * 
 * Constructed by a bare express.Router(), so the Express matcher defaults
 * apply: case-insensitive, non-strict about a trailing slash, and no merging of
 * route parameters from a parent router.
 */
const router = express.Router();

/**
 * Hello Endpoint Router Mounting
 * 
 * The mount matches the path '/hello' itself and its slash-delimited
 * descendants only: the character following the prefix must be absent or '/'.
 * GET /hello and GET /hello/test both reach helloRouter, while GET /helloworld
 * and GET /hello-world never match this layer. Of those four, only GET /hello
 * answers 200: /hello/test is delegated but matches no route inside
 * helloRouter, which declares only '/', and the two non-matching paths are
 * never delegated, so all three answer 404. The matched prefix is trimmed
 * before delegation, so helloRouter runs with req.baseUrl set to '/hello' and
 * req.url set to the remainder ('/' for both /hello and /hello/).
 * 
 * Requirements Fulfillment:
 * - F-002-RQ-001: Defines route handling for /hello path through router mounting
 * - F-003-RQ-002: Matches the '/hello' path prefix and delegates to helloRouter.
 *   Matching follows the Express router defaults recorded above: it is
 *   case-insensitive and non-strict, so GET /HELLO and GET /hello/ reach this
 *   router just as GET /hello does. Exact, case-sensitive matching is
 *   deliberately not implemented — express.Router() is constructed without the
 *   caseSensitive or strict options, and those defaults stand.
 */
router.use('/hello', helloRouter);

/**
 * Router Export
 * 
 * This router is the default CommonJS export. src/backend/app.js consumes it
 * as `const routes = require('./routes')` and mounts it with
 * `app.use('/', routes)`, which is what makes the composed path GET /hello
 * public.
 */
module.exports = router;

/**
 * File Documentation Summary
 * 
 * What This File Actually Contains:
 * - One require of ./hello.js and one mount, router.use('/hello', helloRouter)
 * - A router built by a bare express.Router(), so the default matcher applies:
 *   case-insensitive and non-strict
 * - A default CommonJS export of that router, consumed by app.js
 * - No error handling of its own. Unmatched paths are answered by Express's
 *   own 404, and an error thrown or a promise rejected inside a mounted route
 *   module is forwarded by Express 5 to the four-argument errorHandler that
 *   app.js registers after this router
 * 
 * This aggregator applies no security control, and mounting a router is not an
 * access boundary: no authentication, authorization, rate limiting, request
 * validation or security-header middleware exists anywhere in this application.
 * 
 * Requirements Traceability:
 * - F-002: Hello Endpoint Implementation ✓ (Router integration)
 * - F-003-RQ-002: Route matching ✓ (Path delegation to hello router)
 */