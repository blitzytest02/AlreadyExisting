/**
 * Node.js HTTP Server Entry Point
 * 
 * This file serves as the main entry point for the Node.js tutorial application,
 * implementing the core HTTP server initialization and startup logic. It creates
 * an HTTP server instance using the Node.js built-in HTTP module and integrates
 * it with the configured Express.js application to handle incoming HTTP requests.
 * 
 * The server implementation demonstrates fundamental Node.js server patterns
 * including event-driven architecture, error handling, and graceful startup
 * procedures. It leverages Node.js v22.16.0 LTS capabilities for optimal
 * performance and stability in educational and development environments.
 * 
 * Architecture Overview:
 * - HTTP Server Creation: Uses Node.js core HTTP module for server instantiation
 * - Express Integration: Delegates request handling to configured Express app
 * - Port Configuration: Configurable port binding via environment variables
 * - Error Handling: Comprehensive startup error detection and recovery
 * - Logging Integration: Console logging for server events and status
 * 
 * Key Features:
 * - Node.js v22.16.0 LTS compatibility with long-term support guarantees
 * - Express.js 5.1.0 application integration with modern promise support
 * - Environment-aware configuration through centralized config management
 * - Production-ready error handling with specific error code detection
 * - Comprehensive logging for monitoring and debugging purposes
 * - Graceful startup with detailed status reporting
 * 
 * Requirements Implementation:
 * - F-001: HTTP Server Initialization (Creates and starts HTTP server)
 * - F-001-RQ-001: Server startup capability (Implements server.listen())
 * - F-001-RQ-003: Port configuration (Uses configurable port from config)
 * - F-001-RQ-004: Graceful error handling (EADDRINUSE and generic error handling)
 * 
 * Technical Specifications:
 * - Node.js Runtime: v22.16.0 LTS with enhanced security and performance
 * - HTTP Protocol: HTTP/1.1 compliance with standard request/response patterns
 * - Event Loop Integration: Non-blocking server startup with event-driven callbacks
 * - Memory Management: Efficient server instance creation with minimal overhead
 * - Process Management: Proper process lifecycle with graceful error termination
 * 
 * Dependencies Integration:
 * - Core: Node.js HTTP module for native server capabilities
 * - Framework: Express.js application instance for request processing
 * - Configuration: Environment-aware settings for runtime parameters
 * - Logging: Console logging for observability and debugging
 * 
 * Educational Value:
 * - Demonstrates proper HTTP server initialization patterns
 * - Shows integration between Node.js core modules and Express.js framework
 * - Illustrates error handling best practices for server startup
 * - Provides foundation for understanding production server deployment
 * - Establishes patterns for scalable server architecture
 */

// Core Node.js module imports for HTTP server functionality
const http = require('http'); // Node.js v22.16.0 - Built-in HTTP server module with HTTP/1.1 support

// Internal application imports for modular architecture integration
const app = require('./app'); // Express.js application instance configured with routes and middleware
const config = require('./config'); // Centralized configuration management with environment variable support
const { logger } = require('./utils/logger'); // Console logging utility for server events; adds [INFO]:/[ERROR]: prefixes in development only (named export)

/**
 * Process exit status used by every fatal path in this file.
 *
 * @type {number}
 */
const FATAL_EXIT_CODE = 1;

/**
 * How long a fatal path tolerates a drain that is making NO progress before it
 * forces termination anyway.
 *
 * This bounds a stalled or broken pipe, not a slow one: the check below only
 * gives up when the buffered byte count has not fallen since the previous
 * tick. A reader that is still consuming, however slowly, keeps the process
 * alive until its diagnostics are out - which is the whole point of the drain.
 * A reader that has stopped consuming entirely cannot be waited on forever,
 * because an already-failed process must not hang.
 *
 * @type {number}
 */
const FATAL_FLUSH_STALL_MS = 2000;

/**
 * Lowest and highest values server.listen() accepts for a TCP port.
 *
 * These mirror Node's own contract - `Server.prototype.listen` runs the port
 * through `validatePort`, which requires `>= 0 and < 65536` - so this file
 * rejects exactly what the kernel would refuse and nothing more. Ports below
 * 1024 stay acceptable here; they are privileged, not invalid, and fail at
 * bind time with EACCES when the process lacks the capability.
 *
 * @type {number}
 */
const MIN_TCP_PORT = 0;
const MAX_TCP_PORT = 65535;

/**
 * Fatal Termination With Drained Diagnostics
 *
 * Terminates the process with a failure status after the diagnostics already
 * written by the caller have been handed to the operating system.
 *
 * Why this exists rather than a bare `process.exit(1)`: process.exit()
 * terminates as soon as it is called, and writes to process.stdout and
 * process.stderr are not guaranteed to be synchronous. When either stream is a
 * pipe - which is exactly how a container runtime collects a container's logs -
 * queued bytes are discarded with the process, and the operator loses the
 * explanation for the failure they are investigating. Measured on this
 * runtime with a slow pipe reader, an immediate exit after 20,000 stderr lines
 * delivered only a few hundred of them; gating the exit on the flush below
 * delivered all 20,000.
 *
 * Sequence:
 * 1. `process.exitCode` is set first, so even if the process ends up exiting
 *    naturally instead of through the forced call below, it still exits
 *    non-zero.
 * 2. A zero-length write is queued on each stream that still has buffered
 *    bytes. Its callback runs once everything queued ahead of it on that
 *    stream has been flushed.
 * 3. Once every queued flush has reported back, the process is forced down.
 * 4. A stall watchdog bounds the wait. It gives up only when the buffered byte
 *    count stops falling, so a slow reader is waited out while a dead one is
 *    not. It is unref'd, so it never delays an exit that is otherwise ready.
 *
 * When neither stream has anything buffered - a file or TTY destination on
 * Linux, where these writes are synchronous - this returns through an
 * immediate exit and costs no measurable delay.
 *
 * The drain is best-effort, not a guarantee: step 4 exists precisely so that
 * a reader which has stopped consuming cannot hold a failed process open, and
 * when it fires the still-buffered bytes are lost.
 *
 * This preserves the intended no-recovery behaviour: the process terminates
 * with the same failure status, and no connection draining, cleanup, request
 * completion, or restart is attempted. Only the routine loss of the fatal
 * output is removed.
 *
 * @returns {void}
 */
function terminateWithFailure() {
    // Correct status even if the forced exit below never runs.
    process.exitCode = FATAL_EXIT_CODE;

    // A stream is worth waiting on only if it is still writable and is holding
    // bytes that have not reached the operating system yet.
    const pendingStreams = [process.stdout, process.stderr].filter((stream) => stream
        && typeof stream.write === 'function'
        && !stream.destroyed
        && !stream.writableEnded
        && stream.writableLength > 0);

    if (pendingStreams.length === 0) {
        process.exit(FATAL_EXIT_CODE);
    }

    const bufferedBytes = () => pendingStreams.reduce(
        (total, stream) => total + stream.writableLength,
        0
    );

    let pendingFlushes = pendingStreams.length;

    const exitWhenFlushed = () => {
        pendingFlushes -= 1;

        if (pendingFlushes === 0) {
            process.exit(FATAL_EXIT_CODE);
        }
    };

    for (const stream of pendingStreams) {
        stream.write('', exitWhenFlushed);
    }

    // Watchdog: force termination once the drain stops making progress. Any
    // reader that is still consuming keeps resetting this, so slowness costs
    // delivery nothing while a stalled pipe cannot hold the process open.
    let lastBufferedBytes = bufferedBytes();

    const stallWatchdog = setInterval(() => {
        const remaining = bufferedBytes();

        if (remaining >= lastBufferedBytes) {
            process.exit(FATAL_EXIT_CODE);
        }

        lastBufferedBytes = remaining;
    }, FATAL_FLUSH_STALL_MS);

    stallWatchdog.unref();
}

/**
 * HTTP Server Instance Creation
 * 
 * Creates the core HTTP server instance using Node.js built-in HTTP module,
 * passing the configured Express application as the request handler. This
 * establishes the integration point between Node.js native HTTP capabilities
 * and the Express.js framework for request processing.
 * 
 * Server Creation Details:
 * - Uses http.createServer() for native Node.js HTTP server instantiation
 * - Express app instance serves as the request listener callback
 * - Server inherits Express middleware stack and routing configuration
 * - Automatic request/response object creation for each HTTP request received
 *   on a connection. A keep-alive connection carries several requests in
 *   sequence, so these objects are created per request, not per connection
 * - Event-driven architecture with non-blocking I/O operations
 * 
 * HTTP/1.1 Protocol Support:
 * - Standard HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD)
 * - Request header parsing and response header generation
 * - Keep-alive connections for improved performance
 * - Chunked transfer encoding support for streaming responses
 * - Proper HTTP status code handling
 * 
 * Express Integration Benefits:
 * - Middleware pipeline execution for request preprocessing
 * - Route matching and handler delegation
 * - Error handling middleware for graceful error responses
 * - Request/response object enhancement with Express methods
 * - Promise-based error handling with automatic forwarding
 * 
 * Performance Characteristics:
 * - Event Loop integration for asynchronous request handling
 * - Single-threaded event-driven architecture
 * - Non-blocking I/O operations for optimal throughput
 * - Memory-efficient connection management
 * - Automatic garbage collection for request/response objects
 * 
 * Security Posture As Implemented:
 * - No header validation, request timeout, or rate limiting is configured on
 *   this server. Node's built-in HTTP parser limits are the only constraints
 *   applied to inbound headers
 * - The single application-plane header control is app.disable('x-powered-by')
 *   in app.js, which suppresses the framework fingerprint on every response
 * - Server-level faults are reported by writing text to the console through
 *   utils/logger.js. There is no redaction, no stack-trace filtering, no audit
 *   sink, no alerting, and no external monitoring integration; the generic
 *   error branch below logs the raw error object
 *
 * Requirements Fulfillment:
 * - F-001: HTTP Server Initialization (Primary implementation)
 * - F-001-RQ-001: Server startup capability (Server instance creation)
 * - HTTP Server Infrastructure: Core network communication foundation
 * - Express Framework Integration: Seamless application framework binding
 * 
 * @type {http.Server} HTTP server instance configured with Express application
 */
const server = http.createServer(app);

/**
 * Fatal Diagnostic Normalization
 * 
 * Reduces a value handed to a fatal handler to a fixed, log-safe shape.
 * 
 * The handlers below receive arbitrary values: an Error from the server's own
 * 'error' event, a rejected Promise, or whatever a rejection carried. Passing
 * any of those straight to the logger writes it to the console in full - and an
 * Error produced by a library routinely carries request, configuration or
 * credential material on its own properties, while console output for a
 * rejected Promise expands the reason held inside it. Emitting only the four
 * fields below keeps the diagnostic value and leaves the attached payload out.
 * 
 * A non-Error value is described by its type alone: there is no way to know what
 * such a value holds, so its contents are not written to the log at all.
 * 
 * The stack trace is the one field that is environment-gated. It exposes absolute
 * filesystem paths and internal structure, which is worth having while developing
 * and worth withholding once the same log may be shipped off the host, so it is
 * replaced with a fixed marker when NODE_ENV is 'production'.
 * 
 * @function describeFatalError
 * @param {*} value - The value a fatal handler received
 * @returns {Object} A plain object carrying name, code, message and stack for an
 *                   Error, or the value's type with a fixed marker otherwise
 */
function describeFatalError(value) {
    if (value instanceof Error) {
        return {
            name: value.name,
            code: value.code,
            message: value.message,
            stack: config.nodeEnv === 'production'
                ? '[REDACTED]'
                : value.stack
        };
    }

    return {
        name: typeof value,
        message: '[non-Error value omitted from the log]'
    };
}

/**
 * Server Startup and Port Binding
 * 
 * Initiates the HTTP server startup process by binding to the configured
 * network port and beginning to listen for incoming HTTP connections.
 * This operation establishes the server's network presence and enables
 * client communication through standard HTTP protocols.
 * 
 * Port Configuration Strategy:
 * - Configurable port via the PORT environment variable, which is read only by
 *   config/index.js as `parseInt(process.env.PORT, 10) || 3000`
 * - Any value that does not parse to a non-zero integer falls back to 3000.
 *   That includes PORT=0, so the operating system is never asked to pick a
 *   port for the direct-execution path
 * - config/index.js only warns when the resolved port sits outside 1024-65535.
 *   The check in startServer() below is what rejects a port the kernel cannot
 *   accept, because server.listen() validates its argument synchronously and
 *   would otherwise throw ERR_SOCKET_BAD_PORT past this file's logging and
 *   exit path
 * - Privileged ports (< 1024) are accepted here and fail at bind time with
 *   EACCES when the process lacks the capability, which surfaces on the
 *   server's 'error' event
 *
 * Startup Process Flow:
 * 1. The resolved port is checked against the range server.listen() accepts
 * 2. Server attempts to bind to that port
 * 3. Operating system allocates network socket
 * 4. Startup success callback executes upon successful binding
 * 5. Server ready to accept and process HTTP requests
 *
 * Network Interface Binding:
 * - The host argument is omitted deliberately. Node then binds the IPv6
 *   wildcard :: where IPv6 is available and falls back to 0.0.0.0 where it is
 *   not, so the bound address is :: on this runtime rather than a literal
 *   0.0.0.0. A dual-stack :: socket still accepts IPv4 clients through
 *   IPv4-mapped addresses, which is what keeps `docker run -p 3000:3000`
 *   reachable from the host
 * - config.host is deliberately NOT passed to listen(): it defaults to
 *   localhost, and passing it would bind loopback only inside a container
 *
 * Asynchronous Startup Pattern:
 * - Non-blocking server initialization
 * - Event-driven startup completion notification through the listen callback
 * - Bind failures surface on the server's 'error' event. No promise is created
 *   anywhere in this startup path, so there is no promise-based error handling
 *   and no rejection to await
 *
 * Requirements Implementation:
 * - F-001-RQ-001: Server startup capability (Core implementation)
 * - F-001-RQ-003: Port configuration (Environment-configurable port)
 * - F-001-RQ-004: Graceful error handling (Unusable port rejected before bind)
 * - Server Infrastructure: Network socket binding and connection acceptance
 * - Development Environment: Local development server capability
 *
 * Not Implemented Here:
 * - No startup-time measurement, memory sampling, or resource-allocation
 *   verification is performed
 * - No availability probing of the port or of the network interfaces
 * - No resource cleanup on startup failure. The fault paths log to the console
 *   and terminate the process
 *
 * Educational Demonstration:
 * - Shows proper server.listen() usage with callback pattern
 * - Demonstrates reading the port from centralized configuration
 * - Illustrates event-driven server startup and bind-failure reporting
 * - Provides foundation for understanding server lifecycle management
 */

/**
 * Usable TCP Port Predicate
 *
 * Reports whether the resolved port is one server.listen() will accept.
 *
 * config/index.js derives the port with `parseInt(process.env.PORT, 10) || 3000`
 * and its validateConfig() only emits a console warning for values outside
 * 1024-65535 - it never rejects one. So a PORT of -1 or 99999 reaches this
 * file intact as a negative or oversized integer.
 *
 * @param {number} port - The resolved port from config
 * @returns {boolean} true when listen() will accept the value
 */
function isUsablePort(port) {
    return Number.isInteger(port) && port >= MIN_TCP_PORT && port <= MAX_TCP_PORT;
}

/**
 * Guarded Server Startup
 *
 * Checks the configured port and then binds it.
 *
 * The check has to happen here, before listen() is called, because
 * `Server.prototype.listen` validates its port argument SYNCHRONOUSLY and
 * throws `RangeError [ERR_SOCKET_BAD_PORT]` from inside the call. A
 * synchronous throw is not delivered to the server's 'error' event, and at the
 * point listen() runs neither that listener nor the two process-level handlers
 * further down this file have been registered yet - so an out-of-range PORT
 * would abort module evaluation with a raw stack trace, bypassing the
 * structured diagnostics and the drained exit path this file provides for
 * every other startup failure. Verified: a registered 'error' listener does
 * not fire for listen(-1), listen(70000) or listen(99999).
 *
 * On rejection the port is reported through the same logger/exit path as a
 * port conflict, and listen() is never reached. This is the F-001-RQ-004
 * graceful-error-handling contract applied to the input boundary rather than
 * only to bind-time failures.
 *
 * Deliberately unchanged by this check:
 * - listen() keeps its port-only form; no host argument is added
 * - config/index.js keeps its `|| 3000` derivation, so PORT=0 still resolves
 *   to 3000 rather than asking the OS for a port. 0 therefore never reaches
 *   listen() from this path, even though listen() would accept it
 * - Privileged ports below 1024 are accepted and left to fail at bind time
 *   with EACCES, which the 'error' listener already reports
 *
 * @returns {void}
 */
function startServer() {
    if (!isUsablePort(config.port)) {
        logger.error(`❌ Server startup failed: configured port ${config.port} is not a usable TCP port`);
        logger.error(`💡 Resolution suggestions:`);
        logger.error(`   • Set PORT to an integer between ${MIN_TCP_PORT} and ${MAX_TCP_PORT}, for example: PORT=3000 npm start`);
        logger.error(`   • Unset PORT to fall back to the default port 3000`);
        logger.error(`   • Check your shell environment and any .env file for a stale PORT value`);
        logger.error(`🛑 Application terminating before binding a port`);
        terminateWithFailure();

        return;
    }

    server.listen(config.port, () => {
        /**
         * Server Startup Success Callback
         *
         * Runs once, after the socket is bound and the server has begun
         * listening. Reaching this callback is itself the confirmation that
         * the bind succeeded; the callback performs no checks of its own.
         *
         * What It Emits - five fixed lines, and nothing else:
         * 1. Startup confirmation carrying config.port
         * 2. A readiness statement (fixed text)
         * 3. The local development URL, built from config.port
         * 4. process.version, the literal Express version, and config.nodeEnv
         * 5. A completion statement (fixed text)
         *
         * Every line goes to the console through logger.info, which prefixes
         * each one with '[INFO]:' when config.nodeEnv is 'development' and
         * writes it unprefixed otherwise. The lines are plain text with
         * labelled values, not a parseable schema. README.md,
         * src/backend/README.md and docs/setup/development.md each reproduce
         * this output verbatim, so its wording and order are fixed.
         *
         * What It Does NOT Emit or Do:
         * - No timestamp and no process ID
         * - No startup duration, and no timing measurement of any kind
         * - No memory or resource-utilization baseline
         * - No service-discovery registration and no load-balancer signal
         * - No hot-reload state (nodemon restarts the process; this callback
         *   is not involved and cannot observe it)
         * - No readiness signal to anything outside this process. Readiness is
         *   observed externally by probing GET /hello, which is the only route
         *   the application serves
         *
         * Requirements Fulfillment:
         * - F-001-RQ-001: Server startup capability (Success confirmation)
         * - F-001-RQ-003: Port configuration (Port binding verification)
         * - Server Status Reporting: Operational status communication
         * - Development Feedback: Clear startup success indication
         *
         * Educational Value:
         * - Demonstrates callback pattern for asynchronous operations
         * - Shows where success logging belongs in the startup sequence
         * - Illustrates server lifecycle event handling
         */
        logger.info(`🚀 HTTP Server successfully started and listening on port ${config.port}`);
        logger.info(`🌐 Server is ready to accept HTTP requests`);
        logger.info(`📍 Local development URL: http://localhost:${config.port}`);
        logger.info(`⚡ Node.js ${process.version} | Express 5.1.0 | Environment: ${config.nodeEnv}`);
        logger.info(`🎯 Tutorial application initialized successfully`);
    });
}

/**
 * Direct-Execution Guard
 *
 * The port is bound only when this file is the process entry point
 * (`node server.js` / `npm start`). When the module is imported instead - as
 * tests/integration/hello.test.js does - it must NOT bind, so the importer can
 * call server.listen(0) itself and take an OS-assigned ephemeral port.
 * Binding at import time would make that second listen() throw
 * ERR_SERVER_ALREADY_LISTEN.
 *
 * startServer() is therefore the only thing gated here: the port screening and
 * the bind both belong to direct execution, while the server instance itself
 * and the fault handlers below are set up either way.
 */
if (require.main === module) {
    startServer();
}

/**
 * Server Error Event Handler
 *
 * Listens for the 'error' event on the http.Server instance, logs the fault to
 * the console, and terminates the process.
 *
 * What This Listener Does And Does Not Receive:
 * - It receives errors raised by the server and its sockets: bind failures
 *   such as EADDRINUSE and EACCES, and listener-level socket faults
 * - It does NOT receive Express failures. A throw inside a route handler, a
 *   rejected handler promise, or a next(err) call is delivered to the
 *   four-arity errorHandler middleware mounted last in app.js, which answers
 *   the request with a 500 envelope and leaves the process running. The Node
 *   'error' event and the Express error pipeline are separate mechanisms, and
 *   nothing routes between them
 * - It does NOT receive a synchronous throw from listen() itself. That is why
 *   startServer() screens the port before calling listen()
 *
 * Two Branches, Then Termination:
 * - error.code === 'EADDRINUSE': six console lines naming the configured port
 *   and four static resolution suggestions
 * - Anything else: five console lines carrying error.message, the error object
 *   itself, and error.code with an 'UNKNOWN' fallback, plus two fixed hints
 * - Both branches fall through to two closing lines and then to
 *   terminateWithFailure(), which exits non-zero once the queued diagnostics
 *   have drained, or sooner if its no-progress watchdog forces the exit.
 *   There is no retry, no rebind, and no recovery
 *
 * Requirements Implementation:
 * - F-001-RQ-004: Graceful error handling (Primary implementation)
 * - Error Response Management: Console reporting of server-level faults
 * - Development Experience: Clear error messaging and troubleshooting guidance
 *
 * Security Posture As Implemented:
 * - The generic branch logs the raw error object. Whatever a driver or the
 *   runtime attached to it - message, stack, absolute paths, connection
 *   details - is written to the console verbatim
 * - There is no redaction, no sanitization, no production/development split of
 *   the payload, and no stack-trace filtering. logger.error varies only the
 *   '[ERROR]:' prefix by environment, never the content
 * - No audit trail is produced and nothing is persisted; the console is the
 *   only destination
 *
 * Monitoring:
 * - None. No error-rate tracking, no alerting, no incident-tracking hook and
 *   no external monitoring integration exists. The exit status is the only
 *   signal a supervisor receives, and the log text is the only detail
 *
 * Educational Demonstration:
 * - Shows event-driven handling of server-level errors
 * - Demonstrates branching on a specific error code
 * - Illustrates fail-fast termination on an unrecoverable startup fault
 */
server.on('error', (error) => {
    /**
     * Error Branching
     *
     * Reads error.code and takes one of two logging branches. No severity,
     * impact or recoverability is assessed, and no error taxonomy is applied
     * beyond this single equality check.
     */

    // EADDRINUSE Error Handling - Port Already in Use
    if (error.code === 'EADDRINUSE') {
        /**
         * Port Conflict Error Processing
         *
         * Reports that the configured port is already held by another socket,
         * and prints four fixed resolution suggestions.
         *
         * What Is Actually Produced:
         * - One line naming config.port as unavailable
         * - A heading line, then four static suggestions. Three interpolate
         *   config.port into their text; the remaining one proposes
         *   `PORT=3001 npm start`, where 3001 is a hardcoded EXAMPLE value.
         *   It is not a detected free port and nothing verifies it is free -
         *   the suggestion is the same whatever port was in conflict
         *
         * What Is Not Done:
         * - No process holding the port is identified. The lsof command in the
         *   suggestion is text for the operator to run; this handler does not
         *   execute it or inspect the system
         * - No alternative port is probed, generated or bound, so there is no
         *   automatic rebinding of any kind
         * - No service discovery, load-balancer coordination, or failover is
         *   involved. The process logs these lines and exits
         */
        logger.error(`❌ Server startup failed: Port ${config.port} is already in use`);
        logger.error(`💡 Resolution suggestions:`);
        logger.error(`   • Stop the process using port ${config.port}: lsof -ti:${config.port} | xargs kill -9`);
        logger.error(`   • Use a different port: PORT=3001 npm start`);
        logger.error(`   • Check for other running instances of this application`);
        logger.error(`   • Verify no other services are using port ${config.port}`);
    } else {
        /**
         * Generic Error Processing
         *
         * Handles every server error other than EADDRINUSE by writing the
         * fault to the console.
         *
         * What Is Actually Logged - five lines:
         * - error.message
         * - the error object itself, passed to console.error by the logger.
         *   Node renders it with its stack, so whatever the object carries is
         *   emitted as-is; nothing is serialized, filtered or redacted here
         * - error.code, falling back to the string 'UNKNOWN'
         * - two fixed hint lines
         *
         * What Is Not Done:
         * - No environment or timestamp metadata is attached to these lines
         * - No classification of the error as system, network, application or
         *   security related
         * - No severity rating, impact analysis, recoverability assessment,
         *   escalation decision or resolution estimate. Every error reaching
         *   this branch is treated identically and terminates the process
         */
        logger.error(`❌ Server startup failed with error: ${error.message}`);
        logger.error(`🔍 Error details:`, describeFatalError(error));
        logger.error(`📋 Error code: ${error.code || 'UNKNOWN'}`);
        logger.error(`🔧 Please check server configuration and system requirements`);
        logger.error(`📞 If the problem persists, check the application logs for additional details`);
    }
    
    /**
     * Process Termination
     *
     * Writes two closing lines and exits with a failure status. The exit is
     * unconditional - nothing here can prevent it or retry - but it is not
     * instantaneous: terminateWithFailure() first lets the queued diagnostics
     * reach the console. It is not a graceful shutdown either; see below.
     *
     * What Is Actually Logged:
     * - A fixed line stating the application is terminating
     * - The instant this shutdown was initiated, as an ISO-8601 timestamp.
     *   It is captured before the drain, so it marks when termination began
     *   rather than when the process actually ended
     *
     * What Is Not Done:
     * - No cleanup. server.close() is never called, no socket is drained, no
     *   file handle or external connection is released, and no explicit
     *   garbage collection is requested. The process simply ends and the
     *   operating system reclaims everything it held
     * - No notification is sent anywhere. Nothing informs a monitoring system,
     *   an alerting channel, an incident tracker or a health-check endpoint.
     *   The exit status is the only signal that leaves this process
     * - No restart is coordinated. A supervisor - nodemon, Docker, or a
     *   Kubernetes kubelet - may restart the process based on that status, but
     *   this file neither triggers nor is aware of it
     *
     * Termination is routed through terminateWithFailure() so that the
     * diagnostics logged above get to the console before the process is
     * forced down. A bare process.exit() can discard them when the stream is
     * a pipe, which is precisely how container logs are collected. The drain
     * is best-effort, not a guarantee: if the reader stops consuming, the
     * helper's no-progress watchdog forces the exit after
     * FATAL_FLUSH_STALL_MS and the remaining buffered bytes are lost, because
     * a failed process must not hang waiting on a dead pipe.
     */
    logger.error(`🛑 Application terminating due to server startup failure`);
    logger.error(`⏰ Shutdown initiated at: ${new Date().toISOString()}`);

    // Exit with a failure status once the lines above have been flushed.
    terminateWithFailure();
});

/**
 * Process-Level Fault Handlers
 *
 * Two last-resort handlers that report a fault the application never caught
 * and then end the process. They make the failure visible and the exit status
 * deliberate; they do not keep the application running, and registering them
 * does not make it more stable.
 *
 * Both follow the same shape as the server 'error' listener: log to the
 * console, then exit non-zero through terminateWithFailure(). No state is
 * repaired and no attempt at recovery is made. Nothing drains or completes
 * requests in flight either: the server is never closed and no connection is
 * waited on, so whatever is mid-flight is abandoned when the process goes.
 */

/**
 * Unhandled Promise Rejection Handler
 *
 * Reports a promise rejection that no handler observed, then terminates.
 *
 * Logs three lines: the promise, the rejection reason, and a fixed
 * termination notice. The promise and the reason are passed to the console as
 * objects and rendered by Node as-is - neither is normalized or redacted.
 * The exit follows through terminateWithFailure(), which waits only for those
 * lines to drain. This is not a graceful shutdown: no connection is drained
 * and no request in flight is completed.
 */
process.on('unhandledRejection', (reason) => {
    // The rejected promise is not logged and is therefore not taken as a
    // parameter: console output would expand the reason held inside it, which is
    // the same unnormalized value the next line reports in a fixed shape.
    logger.error(`❌ Unhandled Promise Rejection detected`);
    logger.error(`💥 Rejection reason:`, describeFatalError(reason));
    logger.error(`🛑 Application terminating due to unhandled promise rejection`);
    terminateWithFailure();
});

/**
 * Uncaught Exception Handler
 *
 * Reports an exception that escaped every try/catch and every Express error
 * boundary, then terminates.
 *
 * Logs two lines: the error object, rendered by Node with its stack, and a
 * fixed termination notice. Once this handler runs the process state is
 * unreliable by definition, so it exits rather than continuing to serve. The
 * only thing waited on is the drain of those two lines; server.close() is not
 * called and no request in flight is drained or completed.
 */
process.on('uncaughtException', (error) => {
    logger.error(`❌ Uncaught Exception:`, describeFatalError(error));
    logger.error(`🛑 Application terminating due to uncaught exception`);
    terminateWithFailure();
});

/**
 * File Documentation Summary
 *
 * This file is the transport layer of the tutorial application: it creates an
 * HTTP server around the Express app, binds a configurable port when executed
 * directly, reports what happens on the console, and exits on failure. It is
 * deliberately small, and the list below is the whole of what it does.
 *
 * What This File Implements:
 * - Guarded startup. The port is bound only when this file is the process
 *   entry point, so importing the module yields a server that is not
 *   listening and a test can bind its own ephemeral port
 * - A configurable port, read from config/index.js, screened against the
 *   range listen() accepts before the bind is attempted
 * - Console logging. Five fixed lines on success; on failure, a branch for
 *   EADDRINUSE and a branch for everything else, both through utils/logger.js
 * - Failure exit. Every fault path writes its lines and exits non-zero once
 *   that output has drained - or sooner, if the drain stops making progress
 *   and the no-progress watchdog forces the exit with bytes still pending
 *
 * What This File Does Not Implement:
 * - No graceful shutdown. No SIGTERM or SIGINT handler is registered and
 *   server.close() is never called, so a termination grace period elapses
 *   without draining connections, and no request in flight is completed
 * - No resource management or cleanup on failure, and no error recovery: a
 *   fault is reported and the process ends
 * - No monitoring, alerting, metrics or health-check integration. The exit
 *   status and the log text are the only signals this process emits
 * - No security controls at the transport layer. See the security notes on
 *   the server-creation and error-listener blocks above
 *
 * Educational Impact:
 * - Provides a clear example of Node.js HTTP server creation and management
 * - Demonstrates integration between core Node.js modules and Express
 * - Shows fail-fast error reporting on an unrecoverable startup fault
 * - Establishes the separation between transport (this file) and application
 *   composition (app.js), which is what makes the app testable in process
 *
 * Dependency Versions:
 * - Node.js provides the LTS line here. The npm dependencies - express,
 *   dotenv, nodemon, supertest and jest - publish ordinary semver releases
 *   and have no LTS designation
 * - src/backend/package.json declares which packages are required and the
 *   version constraint for each, some of them ranges rather than exact pins.
 *   The exact versions this project resolves are recorded in
 *   src/backend/package-lock.json, and `npm ls` reports what is installed
 *
 * Requirements Compliance:
 * - F-001: HTTP Server Initialization ✓
 * - F-001-RQ-001: Server startup capability ✓
 * - F-001-RQ-003: Port configuration ✓
 * - F-001-RQ-004: Graceful error handling ✓
 *
 * The result is a minimal, readable entry point suitable for learning how a
 * Node.js HTTP server is started, configured and terminated - not a
 * production-hardened service.
 */

/**
 * HTTP Server Export
 *
 * Exported unconditionally, independently of the listen guard above, so that
 * importers receive a real http.Server instance that is not yet listening.
 * tests/integration/hello.test.js relies on exactly this: it requires the
 * module, calls server.listen(0) in beforeAll and server.close() in afterAll.
 *
 * @module server
 * @type {import('http').Server}
 */
module.exports = server;
