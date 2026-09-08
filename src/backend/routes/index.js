// Express.js v5.1.0 - Pinned release with enhanced promise support and automatic error handling
const express = require('express');

// Internal route modules - Import individual route handlers for modular architecture
const helloRouter = require('./hello.js');

/**
 * Main Application Router
 * 
 * This file serves as the central routing hub for the Express application, implementing
 * a modular routing architecture that aggregates and mounts individual route modules
 * on their respective paths. This approach follows Express.js best practices for
 * scalable application design and clear separation of concerns.
 * 
 * Architectural Benefits:
 * - Modular Design: Each endpoint group has its own dedicated router module
 * - Additive growth: adding an endpoint group means editing this aggregator to
 *   require and mount the new module. What stays untouched is the set of
 *   existing route modules and the composition root that mounts this router
 * - Maintainability: Clear separation between routing configuration and business logic
 * - Testability: Individual route modules can be tested in isolation
 * 
 * Express 5.1.0 Features Utilized:
 * - Enhanced promise support with automatic rejection handling
 * - Updated path-to-regexp@8.x for improved security (ReDoS mitigation)
 * - Improved middleware error handling capabilities
 * - Automatic forwarding of rejected promises to error-handling middleware
 * 
 * Requirements Implementation:
 * - F-002: Hello Endpoint Implementation - Integrates hello endpoint router
 * - F-003-RQ-002: Route matching - Matches /hello path and delegates to specific router
 * - Modular Design: Implements separation between main router and endpoint routers
 * - Traceability Matrix: Core dependency of app.js providing application's routing tree
 */

/**
 * Express Router Instance Creation
 * 
 * Creates a new Express Router instance that will serve as the main application
 * router. This router will be mounted in the main Express application (app.js)
 * and will handle all incoming requests by delegating them to appropriate
 * sub-routers based on path matching.
 * 
 * Express 5.x Router Features:
 * - Automatic promise rejection handling for middleware functions
 * - Enhanced error propagation through middleware stack
 * - Improved path-to-regexp integration for secure route matching
 * - Built-in support for async/await patterns in route handlers
 * 
 * Router Configuration:
 * - Case sensitive: false (default Express behavior)
 * - Merge params: false (default, parameters don't merge from parent to child)
 * - Strict routing: false (default, trailing slashes are ignored)
 */
const router = express.Router();

/**
 * Route Module Configuration and Mounting
 * 
 * This section configures and mounts individual route modules onto specific
 * base paths. Each mounted router handles all requests that match its base path
 * and delegates further routing decisions to the mounted router module.
 * 
 * Mounting Strategy:
 * - Base path mounting ensures clear URL namespace separation
 * - Sub-router independence allows for module-specific middleware
 * - Hierarchical routing structure supports complex application architectures
 * - Path prefix delegation enables clean URL design patterns
 */

/**
 * Hello Endpoint Router Mounting
 * 
 * Mounts the hello endpoint router on the '/hello' base path. The mount matches
 * the path '/hello' itself and its slash-delimited descendants only: the
 * character following the prefix must be absent or '/'. GET /hello and
 * GET /hello/test both reach helloRouter, while GET /helloworld and
 * GET /hello-world never match this layer. Only GET /hello answers 200 today:
 * /hello/test is delegated here but matches no route inside helloRouter, which
 * declares only '/', and the two non-matching paths are not delegated at all,
 * so all three answer 404.
 * 
 * Route Delegation Process:
 * 1. This router walks its own layer stack looking for a prefix match
 * 2. The prefix is matched with the Express router defaults recorded above,
 *    and the compiled pattern asserts the '/'-or-end boundary, which is what
 *    excludes paths such as /helloworld
 * 3. The matched prefix is trimmed off before delegation: helloRouter runs
 *    with req.baseUrl set to '/hello' and req.url set to the remainder ('/'
 *    for both /hello and /hello/, '/test' for /hello/test)
 * 4. helloRouter processes the request using its internal route definitions
 * 5. The matched handler writes the response itself with res.send(); this
 *    router performs no further work after delegating
 * 
 * URL Mapping Examples:
 * - GET /hello → Handled by helloRouter's '/' route
 * - GET /hello/ → Handled by helloRouter's '/' route (trailing slash ignored)
 * - GET /hello/test → Would be handled by helloRouter's '/test' route (if defined)
 * 
 * Requirements Fulfillment:
 * - F-002-RQ-001: Defines route handling for /hello path through router mounting
 * - F-003-RQ-002: Matches the '/hello' path prefix and delegates to helloRouter.
 *   Matching follows the Express router defaults recorded in the Router Configuration
 *   notes above: it is case-insensitive and non-strict, so GET /HELLO and GET /hello/
 *   reach this router just as GET /hello does. Exact, case-sensitive matching is
 *   deliberately not implemented — express.Router() is constructed without the
 *   caseSensitive or strict options, and those defaults stand.
 * - Modular Architecture: Separates hello endpoint logic from main routing concerns
 * 
 * Error Handling:
 * - Express 5.x automatically forwards promise rejections to error middleware
 * - Path matching failures result in 404 responses (handled by Express)
 * - Router-level errors are propagated to application error handlers
 * 
 * Performance Characteristics:
 * - Lookup is a linear scan, not a constant-time one: the router walks its
 *   layer stack in registration order until a layer matches, so cost grows
 *   with the number of layers registered. This router holds exactly one
 *   layer today, the '/hello' mount below.
 * - The mount is not free. A matching request is dispatched through this
 *   router's layer and then through helloRouter's own stack, so delegation
 *   costs one extra hop compared with declaring the route here directly.
 * - Registration itself happens once, at module load, and allocates one layer
 *   with its compiled prefix pattern.
 */
router.use('/hello', helloRouter);

/**
 * Future Route Module Mounting Points
 * 
 * This section is reserved for mounting additional route modules as the
 * application grows. Each addition is an edit to this file: the new module
 * has to be required at the top and mounted here, following the same pattern
 * as the hello router mounting above. Existing route modules do not change.
 * 
 * The lines below are illustrations of code a reader would add. None of these
 * routers exists in this project, and this application deliberately ships the
 * single GET /hello endpoint only:
 * router.use('/api/users', userRouter);     // User management endpoints
 * router.use('/api/auth', authRouter);      // Authentication endpoints
 * router.use('/api/data', dataRouter);      // Data processing endpoints
 * router.use('/health', healthRouter);      // Health check endpoints
 * 
 * What This Pattern Does And Does Not Buy:
 * - Each functional area keeps its own URL namespace and its own module
 * - Route modules can be developed and tested independently of one another
 * - The aggregator remains the one place that has to be edited to expose a
 *   new area, which also makes it the one place to read to see what is exposed
 */

/**
 * Router Export Configuration
 * 
 * Exports the configured main router as the default export for consumption
 * by the core application file (app.js). This router contains all the
 * mounted sub-routers and serves as the complete routing tree for the application.
 * 
 * Integration Pattern:
 * - app.js imports this router: const routes = require('./routes')
 * - app.js mounts router: app.use('/', routes) or app.use('/api', routes)
 * - Complete routing hierarchy is established through this mounting
 * 
 * Export Type: Default CommonJS Export
 * - Compatible with both require() and import statements
 * - Follows Node.js module system conventions
 * - Tree-shaking does not apply: a single CommonJS assignment exposes no
 *   named bindings for a bundler to analyse statically, and this project uses
 *   no bundler
 * 
 * Router Lifecycle:
 * 1. Router instance created and configured
 * 2. Sub-routers mounted on their respective paths
 * 3. Router exported for application consumption
 * 4. Application mounts router to complete routing setup
 * 5. Router handles incoming requests through delegation pattern
 * 
 * Dependencies and Integration:
 * - Depends on: Express.js 5.1.0 framework, individual route modules
 * - Consumed by: Main application file (app.js)
 * - Provides: Complete routing tree for HTTP request handling
 * 
 * Security Posture:
 * - This router delegates paths and nothing more. It applies no security
 *   control, and module organization is not a security boundary: mounting a
 *   router does not restrict who may reach the handlers behind it.
 * - Authentication and authorization are not implemented anywhere in this
 *   application. No auth middleware is registered, no credential is read, and
 *   no handler inspects an Authorization header, so every request that reaches
 *   GET /hello is served unauthenticated.
 * - No security middleware is installed or mounted: Helmet, CORS and rate
 *   limiting are all absent. The only response-header control in the system is
 *   app.disable('x-powered-by') in app.js, which is outside this file.
 * - The mount path is the literal string '/hello'. No route parameter and no
 *   user-supplied pattern is compiled here.
 */
module.exports = router;

/**
 * File Documentation Summary
 * 
 * This main routing index file is the routing hub of the Node.js tutorial
 * application: it shows how a single aggregator composes public paths out of
 * endpoint modules that know nothing about where they are mounted.
 * 
 * What This File Actually Contains:
 * - One require of ./hello.js and one mount, router.use('/hello', helloRouter)
 * - A router built by a bare express.Router(), so the default matcher applies:
 *   case-insensitive and non-strict
 * - A default CommonJS export of that router, consumed by app.js
 * - No error handling of its own. Unmatched paths are answered by Express's
 *   own 404, and an error thrown or a promise rejected inside a mounted route
 *   module is forwarded by Express 5 to the four-arity errorHandler that
 *   app.js registers after this router
 * 
 * Educational Value:
 * - Demonstrates proper Express router mounting patterns
 * - Shows modular application architecture principles
 * - Provides foundation for understanding complex routing hierarchies
 * 
 * Limits Worth Stating Plainly:
 * - Dependency versions are declared in src/backend/package.json. npm
 *   packages carry no Node-style LTS designation, so no LTS status is claimed
 *   for them here.
 * - Neither this file nor the application around it is hardened for
 *   production: there is no authentication, authorization, rate limiting,
 *   request validation or security-header middleware anywhere in it.
 * 
 * Requirements Traceability:
 * - F-002: Hello Endpoint Implementation ✓ (Router integration)
 * - F-003-RQ-002: Route matching ✓ (Path delegation to hello router)
 * - Modular Design ✓ (Separation of routing concerns)
 * - app.js Integration ✓ (Router export for application mounting)
 * 
 * Future Enhancement Opportunities:
 * - API versioning through router mounting (/api/v1, /api/v2)
 * - Route-level middleware for cross-cutting concerns
 * - Dynamic route module loading for plugin architectures
 * - Automated route documentation generation
 * - Performance monitoring and analytics integration
 */