// Express.js v5.1.0 - Pinned release with enhanced promise support and automatic error handling
const express = require('express');

/**
 * Express Router serving the /hello endpoint (F-002-RQ-001). The route
 * aggregator mounts this router at the /hello path.
 */
const router = express.Router();

/**
 * GET /hello Endpoint Handler
 *
 * @route GET /
 *
 * Response contract:
 * - Status 200 with the body exactly "Hello world" (F-002-RQ-002, F-004-RQ-003)
 * - Content-Type: text/html; charset=utf-8, which res.send derives from a string
 * - Response Time Target: < 100ms (F-002 performance criteria)
 *
 * Only GET is declared (F-002-RQ-001, F-002-RQ-003). Express derives two
 * further methods from that single declaration: HEAD returns 200 with headers
 * only, as HTTP semantics require, and OPTIONS returns 200 with an
 * "Allow: GET, HEAD" header. POST, PUT and DELETE match no route and are
 * answered by Express's default handler with 404. The container health check
 * probes this path with wget --spider (infrastructure/docker/Dockerfile), and
 * BusyBox wget issues that probe as a GET, so it exercises the declared route
 * rather than the derived HEAD. HEAD is nonetheless derived by Express from
 * that single GET declaration, is required by HTTP semantics, and must not be
 * suppressed.
 */
router.get('/', (req, res) => {
    // Send the exact "Hello world" response as specified in F-002-RQ-002
    // This fulfills F-004-RQ-003 by delivering the content in the response body
    res.send('Hello world');
});

/**
 * Router Export
 *
 * This router is the default CommonJS export. The route aggregator
 * src/backend/routes/index.js mounts it at /hello, and src/backend/app.js
 * mounts that aggregator at '/', which is what makes GET /hello public.
 */
module.exports = router;