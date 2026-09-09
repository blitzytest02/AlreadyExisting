/**
 * Node.js HTTP Server Entry Point
 *
 * Transport layer of the application: it creates an HTTP server around the
 * Express application composed in app.js, binds the configured port when this
 * file is the process entry point, reports startup and faults on the console,
 * and exits non-zero on any fault. Application composition belongs to app.js
 * and settings to config/index.js; this file owns the socket and the process
 * lifecycle only.
 *
 * Requirements Implementation:
 * - F-001: HTTP Server Initialization
 * - F-001-RQ-001: Server startup capability (server.listen())
 * - F-001-RQ-003: Port configuration (port resolved by config/index.js)
 * - F-001-RQ-004: Graceful error handling (EADDRINUSE and generic faults each
 *   have their own branch, and every fatal path ends in process.exit(1))
 */

const http = require('http');

const app = require('./app');
const config = require('./config');
const { logger } = require('./utils/logger'); // Console logging utility for server events; adds [INFO]:/[ERROR]: prefixes in development only (named export)

/**
 * HTTP Server Instance Creation
 *
 * Wraps the Express application composed in app.js in a Node HTTP server, with
 * the application itself as the request listener, so every request reaches
 * Express through this instance and inherits its middleware chain and routing.
 * Request and response objects are created per request, so a keep-alive
 * connection carrying several requests in sequence produces several pairs.
 *
 * Security Posture As Implemented:
 * - The single application-plane header control is app.disable('x-powered-by')
 *   in app.js, which suppresses the framework fingerprint on every response
 * - No header validation, request-size limit or rate limiting is configured
 *   here, and none of Node's own limits is tuned. What bounds an inbound
 *   request is therefore the runtime's defaults, which are active rather than
 *   absent: a 300 s request timeout, a 60 s headers timeout, a 5 s keep-alive
 *   timeout and a 16 KB header cap. `server.timeout` stays 0, so an idle
 *   socket is bounded by the keep-alive timeout rather than by a socket
 *   timeout
 * - Fault detail reaches the console as the value itself: each fault handler
 *   below hands the error - or, for a rejection, the promise and the reason -
 *   straight to utils/logger.js, which forwards its arguments to console.error
 *   unchanged. Its message, code, stack and any other property it carries are
 *   therefore written out, in every environment; nothing is redacted, filtered
 *   or truncated, and NODE_ENV changes only the '[ERROR]:' prefix. That is
 *   pre-existing behaviour this change deliberately keeps, and
 *   docs/architecture/overview.md records it the same way
 * - There is no audit sink, no alerting and no external monitoring
 *   integration. The exit status and this console output are the only signals
 *   that leave the process
 *
 * Requirements Fulfillment:
 * - F-001: HTTP Server Initialization (Primary implementation)
 * - F-001-RQ-001: Server startup capability (Server instance creation)
 *
 * @type {http.Server} HTTP server instance configured with Express application
 */
const server = http.createServer(app);

/**
 * Server Startup and Port Binding
 *
 * Port resolution, and the two quirks of it that matter here:
 * - config/index.js is the only reader of PORT and derives it as
 *   `parseInt(process.env.PORT, 10) || 3000`, so any value that does not parse
 *   to a non-zero integer falls back to 3000 - PORT=0 included, which means
 *   the operating system is never asked to pick a port on this path
 * - config/index.js only warns when the resolved port sits outside 1024-65535,
 *   and nothing here screens the value either: whatever config resolves to is
 *   handed to listen() as it stands. A privileged port under 1024 is accepted
 *   and left to fail at bind time with EACCES, which surfaces on the server's
 *   'error' event; a value outside the range listen() itself accepts is
 *   refused by Node's own synchronous port validation, which throws out of the
 *   call instead of emitting 'error'
 *
 * Network interface binding:
 * - The host argument is omitted deliberately. Node then binds the IPv6
 *   wildcard :: where IPv6 is available and falls back to 0.0.0.0 where it is
 *   not. A dual-stack :: socket still accepts IPv4 clients through
 *   IPv4-mapped addresses, which is what keeps `docker run -p 3000:3000`
 *   reachable from the host
 * - config.host is deliberately NOT passed to listen(): it defaults to
 *   localhost, and passing it would bind loopback only inside a container
 *
 * Bind failures surface on the server's 'error' event. No promise is created
 * anywhere in this startup path, so there is no rejection to await.
 *
 * Requirements Implementation:
 * - F-001-RQ-001: Server startup capability (Core implementation)
 * - F-001-RQ-003: Port configuration (Environment-configurable port)
 */

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
 * The listen() call below is therefore the only thing gated here: the bind
 * belongs to direct execution, while the server instance itself, the export at
 * the end of the file and the fault handlers below are set up either way.
 */
if (require.main === module) {
    server.listen(config.port, () => {
        /**
         * Server Startup Success Callback
         *
         * Runs once, after the socket is bound. Reaching this callback is
         * itself the confirmation that the bind succeeded; it performs no
         * checks of its own.
         *
         * It emits five fixed lines and nothing else, through logger.info,
         * which prefixes each with '[INFO]:' when config.nodeEnv is
         * 'development' and writes it unprefixed otherwise. README.md,
         * src/backend/README.md and docs/setup/development.md each reproduce
         * this output verbatim, so its wording and order are fixed.
         *
         * No timestamp, process id, startup duration, resource baseline or
         * external readiness signal is emitted, and nodemon restarts are
         * neither observed nor reported here. Readiness is established
         * externally by probing GET /hello, the only route the application
         * serves.
         *
         * Requirements Fulfillment:
         * - F-001-RQ-001: Server startup capability (Success confirmation)
         * - F-001-RQ-003: Port configuration (Port binding verification)
         */
        logger.info(`🚀 HTTP Server successfully started and listening on port ${config.port}`);
        logger.info(`🌐 Server is ready to accept HTTP requests`);
        logger.info(`📍 Local development URL: http://localhost:${config.port}`);
        logger.info(`⚡ Node.js ${process.version} | Express 5.1.0 | Environment: ${config.nodeEnv}`);
        logger.info(`🎯 Tutorial application initialized successfully`);
    });
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
 *   the request and leaves the process running. The Node 'error' event and the
 *   Express error pipeline are separate mechanisms, and nothing routes between
 *   them
 * - It does NOT receive a synchronous throw from listen() itself.
 *   `Server.prototype.listen` validates its port argument synchronously and
 *   throws `RangeError [ERR_SOCKET_BAD_PORT]` out of the call for a value
 *   outside 0-65535, which aborts module evaluation rather than reaching this
 *   listener
 *
 * Two Branches, Then Termination:
 * - error.code === 'EADDRINUSE': six console lines - one naming the configured
 *   port, a heading, and four static resolution suggestions. The alternative
 *   port they propose is a hardcoded example; nothing probes it, and no
 *   process holding the port is identified, so no rebinding is attempted
 * - Anything else: five console lines - error.message, the error object
 *   itself, error.code with an 'UNKNOWN' fallback, and two fixed hints
 * - Both branches fall through to two closing lines and then to
 *   process.exit(1), which ends the process at once. There is no retry, no
 *   rebind and no recovery
 *
 * Security Posture As Implemented:
 * - The generic branch hands the error object to the logger, which forwards it
 *   to console.error, so its message, code, stack and every other property it
 *   carries are written out. Nothing is redacted, filtered or truncated, and
 *   this is identical in development and in production
 * - No audit trail is produced and nothing is persisted; the console is the
 *   only destination. logger.error varies only the '[ERROR]:' prefix by
 *   environment, never the content
 *
 * Monitoring:
 * - None. No error-rate tracking, no alerting, no incident-tracking hook and
 *   no external monitoring integration exists. The exit status is the only
 *   signal a supervisor receives, and the log text is the only detail
 *
 * Requirements Implementation:
 * - F-001-RQ-004: Graceful error handling (Primary implementation)
 */
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
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
         * Handles every server error other than EADDRINUSE.
         *
         * Five lines in total: error.message, the error object itself - which
         * console.error renders with its stack and its own properties, in
         * every environment - error.code with an 'UNKNOWN' fallback, then two
         * fixed hints.
         *
         * No timestamp or environment metadata is attached, and no
         * classification, severity or recoverability is assessed: every error
         * reaching this branch is treated identically and terminates the
         * process.
         */
        logger.error(`❌ Server startup failed with error: ${error.message}`);
        logger.error(`🔍 Error details:`, error);
        logger.error(`📋 Error code: ${error.code || 'UNKNOWN'}`);
        logger.error(`🔧 Please check server configuration and system requirements`);
        logger.error(`📞 If the problem persists, check the application logs for additional details`);
    }
    
    /**
     * Process Termination
     *
     * Writes two closing lines - a fixed notice, and the instant termination
     * was initiated as an ISO-8601 timestamp - and then calls process.exit(1).
     *
     * The exit is unconditional and immediate: nothing here can prevent it or
     * retry, and process.exit() ends the process as soon as it is called. Any
     * console output still queued on a stream whose writes are asynchronous -
     * a pipe, which is how a container runtime collects logs - can be lost
     * with it, and nothing here waits for that output to drain.
     *
     * This is not a shutdown of any kind. The listener is not closed and no
     * socket is destroyed, no request in flight is completed or drained, no
     * file handle or external connection is released, and nothing is notified:
     * no monitoring system, alerting channel, incident tracker or health-check
     * endpoint learns of this, and the exit status is the only signal that
     * leaves the process. A supervisor - nodemon, Docker or a kubelet - may
     * restart the process from that status, but this file neither triggers nor
     * observes the restart.
     */
    logger.error(`🛑 Application terminating due to server startup failure`);
    logger.error(`⏰ Shutdown initiated at: ${new Date().toISOString()}`);

    process.exit(1);
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
 * console, then call process.exit(1). No state is repaired and no attempt at
 * recovery is made. Nothing in flight is completed either: the listener is
 * left open and its sockets are left alone, the process simply ends, and
 * whatever was mid-request is abandoned rather than drained. Output still
 * queued on an asynchronous stream can be lost with the process.
 */

/**
 * Unhandled Promise Rejection Handler
 *
 * Reports a promise rejection that no handler observed, then terminates.
 *
 * Logs three lines: a notice carrying the rejected promise itself, then one
 * carrying the rejection reason, then a fixed termination notice. Both the
 * promise and the reason are handed to the logger as they are, so
 * console.error renders them in full - a promise expands to the reason it
 * holds - in every environment. The exit is then immediate. This is not a
 * graceful shutdown: no request in flight is completed.
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`❌ Unhandled Promise Rejection at:`, promise);
    logger.error(`💥 Rejection reason:`, reason);
    logger.error(`🛑 Application terminating due to unhandled promise rejection`);
    process.exit(1);
});

/**
 * Uncaught Exception Handler
 *
 * Reports an exception that escaped every try/catch and every Express error
 * boundary, then terminates.
 *
 * Logs two lines: the exception itself, which console.error renders with its
 * stack and its own properties in every environment, and a fixed termination
 * notice. The exit is then immediate: once this handler runs the process state
 * is unreliable by definition, so nothing is repaired, the listener is not
 * closed and no request in flight is completed.
 */
process.on('uncaughtException', (error) => {
    logger.error(`❌ Uncaught Exception:`, error);
    logger.error(`🛑 Application terminating due to uncaught exception`);
    process.exit(1);
});

/**
 * File Documentation Summary
 *
 * What this file implements:
 * - Guarded startup. The port is bound only when this file is the process
 *   entry point, so importing the module yields a server that is not listening
 *   and a test can bind its own ephemeral port
 * - A configurable port, read from config/index.js and passed to listen() as
 *   it stands, with no screening of its own
 * - Console logging through utils/logger.js: five fixed lines on success; on
 *   failure, a branch for EADDRINUSE and a branch for everything else, the
 *   second of which logs the error object itself, unfiltered
 * - Immediate failure exit. Every fault path writes its lines and then calls
 *   process.exit(1), which can discard output still queued on an asynchronous
 *   stream
 *
 * What this file does not implement:
 * - No graceful shutdown. No SIGTERM or SIGINT handler is registered, so a
 *   termination grace period elapses without this process reacting, and no
 *   request in flight is ever completed. The fatal paths neither close the
 *   listener nor destroy its sockets: no code path in this file calls
 *   server.close(), which only the integration suite does, on the exported
 *   instance it bound itself
 * - No error recovery, and no resource management or cleanup at all: a fault
 *   is reported and the process ends
 * - No monitoring, alerting, metrics or health-check integration. The exit
 *   status and the log text are the only signals this process emits
 * - No security controls at the transport layer. See the security notes on
 *   the server-creation and error-listener blocks above
 *
 * Requirements Compliance:
 * - F-001: HTTP Server Initialization
 * - F-001-RQ-001: Server startup capability
 * - F-001-RQ-003: Port configuration
 * - F-001-RQ-004: Graceful error handling
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
