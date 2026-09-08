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
 * - F-001-RQ-004: Graceful error handling (the port is screened before the
 *   bind, EADDRINUSE and generic faults each have a branch, and every fatal
 *   path terminates under a bound)
 */

const http = require('http');

const app = require('./app');
const config = require('./config');
const { logger } = require('./utils/logger'); // Console logging utility for server events; adds [INFO]:/[ERROR]: prefixes in development only (named export)

const FATAL_EXIT_CODE = 1;

/**
 * How long a fatal path tolerates a drain that shows NO progress before it
 * forces termination anyway.
 *
 * Progress here means the buffered byte count falling between two ticks, which
 * is all the check below can observe - not the pace of whatever is reading.
 * A destination that reports its progress incrementally is waited out while it
 * keeps delivering; one that reports it in a single step, as a Linux pipe with
 * a single queued write does, looks stalled and is cut off at the first tick
 * that sees no change. Erring in that direction is deliberate: an
 * already-failed process must not hang, and its diagnostics are worth waiting
 * on only while they are visibly moving.
 *
 * @type {number}
 */
const FATAL_FLUSH_STALL_MS = 2000;

/**
 * Hard upper bound on a fatal path, from the moment the drain starts to the
 * forced exit, applied whether or not the drain shows progress.
 *
 * The stall bound above answers a destination that has stopped; this one
 * answers a destination that keeps reporting progress but too slowly to
 * finish. Without it that case has no bound at all, because every observed
 * step forward - however small - resets the stall check, and the lifetime of a
 * process that has already failed would be decided by whatever is reading its
 * logs. After an uncaught exception that process is in an undefined state, so
 * what remains of its life has to be capped by something it does not share
 * with its reader. On a Linux pipe the stall bound is usually reached first;
 * this one is the backstop that does not depend on how a stream reports
 * progress.
 *
 * @type {number}
 */
const FATAL_TERMINATION_DEADLINE_MS = 5000;

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
 * explanation for the failure they are investigating. Gating the exit on the
 * flush below is what lets those queued bytes reach the reader; an immediate
 * exit does not.
 *
 * Sequence:
 * 1. `process.exitCode` is set first, so even if the process ends up exiting
 *    naturally instead of through the forced call below, it still exits
 *    non-zero.
 * 2. The listener is closed and the sockets on it are destroyed, so nothing is
 *    accepted or answered while the rest of this runs. The drain below is
 *    asynchronous, and a process that has already failed must not keep serving
 *    requests for as long as its logs take to flush.
 * 3. A zero-length write is queued on each stream that still has buffered
 *    bytes. Its callback runs once everything queued ahead of it on that
 *    stream has been flushed, and the process is forced down once every queued
 *    flush has reported back.
 * 4. Two bounds cap that wait and the earlier one wins: the stall watchdog,
 *    which gives up when the buffered byte count stops falling, and
 *    FATAL_TERMINATION_DEADLINE_MS, which applies regardless of progress. Both
 *    are unref'd, so neither delays an exit that is otherwise ready.
 *
 * When neither stream has anything buffered - a file or TTY destination on
 * Linux, where these writes are synchronous - this returns through an
 * immediate exit and costs no measurable delay.
 *
 * The drain is best-effort by design. Step 4 is what stops a reader which
 * consumes slowly, or not at all, from holding a failed process open, and when
 * either bound fires the still-buffered bytes are lost.
 *
 * This preserves the intended no-recovery behaviour: the process terminates
 * with the same failure status, and no request in flight is completed, no
 * connection is drained, and no restart is attempted. Only the routine loss of
 * the fatal output is removed.
 *
 * @returns {void}
 */
function terminateWithFailure() {
    process.exitCode = FATAL_EXIT_CODE;

    // Stop serving before the asynchronous drain below, not after it.
    stopAcceptingConnections();

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

    // Watchdog: force termination once the buffered byte count stops falling.
    // A destination that reports incremental progress keeps resetting this; one
    // that has stalled cannot hold the process open.
    let lastBufferedBytes = bufferedBytes();

    const stallWatchdog = setInterval(() => {
        const remaining = bufferedBytes();

        if (remaining >= lastBufferedBytes) {
            process.exit(FATAL_EXIT_CODE);
        }

        lastBufferedBytes = remaining;
    }, FATAL_FLUSH_STALL_MS);

    stallWatchdog.unref();

    // Total deadline: observed progress resets the watchdog above, so this is
    // the bound a destination that keeps reporting progress cannot extend.
    const terminationDeadline = setTimeout(() => {
        process.exit(FATAL_EXIT_CODE);
    }, FATAL_TERMINATION_DEADLINE_MS);

    terminationDeadline.unref();
}

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
 * - Fault detail reaches the console through utils/logger.js only after
 *   describeFatalError() has reduced the value to name, code, message and a
 *   stack that is withheld when NODE_ENV is 'production'. name, code and
 *   message are the originating value's own text and are not rewritten, so
 *   detail a library puts in a message is still logged; every other property
 *   the value carried is dropped
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
 * Stop Accepting Requests
 *
 * Closes the listener and destroys the connections still open on it.
 *
 * Every fatal path calls this before draining its diagnostics, because that
 * drain is asynchronous: leaving the listener open would keep the process
 * answering requests for as long as its logs take to flush, and after an
 * uncaught exception the process state is unreliable by definition.
 *
 * close() only stops new connections from being accepted - an established
 * keep-alive socket outlives it and could carry another request - so the open
 * sockets are destroyed as well. That is a hard stop and not a graceful drain:
 * nothing in flight is completed. closeAllConnections() landed in Node 18.2.0
 * while package.json admits >= 18.0.0, hence the capability check.
 *
 * A failure here must never prevent the exit that follows, so the attempt is
 * contained and reported rather than propagated: a throw inside the
 * uncaughtException handler would abort the process on Node's own terms and
 * discard the deliberate exit status. Nothing is closed on the paths where the
 * server never listened, which is why the listening state is checked first.
 *
 * @returns {void}
 */
function stopAcceptingConnections() {
    try {
        if (server.listening) {
            server.close();
        }

        if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
        }
    } catch (closeFailure) {
        logger.error(`⚠️ Could not stop accepting connections while terminating: ${closeFailure.message}`);
    }
}

/**
 * Fatal Diagnostic Normalization
 *
 * Reduces a value handed to a fatal handler to a fixed, log-safe shape.
 *
 * The handlers below receive arbitrary values, and passing one straight to the
 * logger writes it to the console in full - an Error produced by a library
 * routinely carries request, configuration or credential material on its own
 * properties, and console output for a rejected Promise expands the reason held
 * inside it. Emitting only the fields below keeps the diagnostic value and
 * leaves the attached payload out. A non-Error value is described by its type
 * alone, because there is no way to know what such a value holds.
 *
 * name, code and message are the value's own text and are not rewritten. The
 * stack is the one environment-gated field: it exposes absolute filesystem
 * paths and internal structure, which is worth having while developing and
 * worth withholding once the same log may be shipped off the host, so it is
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
 * Port resolution, and the two quirks of it that matter here:
 * - config/index.js is the only reader of PORT and derives it as
 *   `parseInt(process.env.PORT, 10) || 3000`, so any value that does not parse
 *   to a non-zero integer falls back to 3000 - PORT=0 included, which means
 *   the operating system is never asked to pick a port on this path
 * - config/index.js only warns when the resolved port sits outside 1024-65535,
 *   so startServer() below is what rejects a port the kernel cannot accept.
 *   Privileged ports under 1024 are accepted and left to fail at bind time
 *   with EACCES, which surfaces on the server's 'error' event
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
 * - F-001-RQ-004: Graceful error handling (Unusable port rejected before bind)
 */

function isUsablePort(port) {
    return Number.isInteger(port) && port >= MIN_TCP_PORT && port <= MAX_TCP_PORT;
}

/**
 * Guarded Server Startup
 *
 * Screens the configured port and then binds it.
 *
 * The screen has to happen here, before listen() is called, because
 * `Server.prototype.listen` validates its port argument SYNCHRONOUSLY and
 * throws `RangeError [ERR_SOCKET_BAD_PORT]` from inside the call. A
 * synchronous throw is not delivered to the server's 'error' event, and at the
 * point listen() runs neither that listener nor the two process-level handlers
 * further down this file have been registered yet - so an out-of-range PORT
 * would abort module evaluation with a raw stack trace, bypassing the
 * structured diagnostics and the bounded exit path this file provides for
 * every other startup failure. Verified: a registered 'error' listener does
 * not fire for listen(-1), listen(70000) or listen(99999).
 *
 * On rejection the port is reported through the same logger and exit path as a
 * port conflict, and listen() is never reached. This is the F-001-RQ-004
 * graceful-error-handling contract applied to the input boundary rather than
 * only to bind-time failures.
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
        logger.info(`⚡ Node.js ${process.version} | Express 5.2.1 | Environment: ${config.nodeEnv}`);
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
 *   the request and leaves the process running. The Node 'error' event and the
 *   Express error pipeline are separate mechanisms, and nothing routes between
 *   them
 * - It does NOT receive a synchronous throw from listen() itself. That is why
 *   startServer() screens the port before calling listen()
 *
 * Two Branches, Then Termination:
 * - error.code === 'EADDRINUSE': six console lines - one naming the configured
 *   port, a heading, and four static resolution suggestions. The alternative
 *   port they propose is a hardcoded example; nothing probes it, and no
 *   process holding the port is identified, so no rebinding is attempted
 * - Anything else: five console lines - error.message, the normalized record
 *   describeFatalError() builds from the error, error.code with an 'UNKNOWN'
 *   fallback, and two fixed hints
 * - Both branches fall through to two closing lines and then to
 *   terminateWithFailure(), which stops accepting connections and exits
 *   non-zero once the queued diagnostics have drained, or sooner if one of its
 *   two bounds fires. There is no retry, no rebind and no recovery
 *
 * Security Posture As Implemented:
 * - Neither branch logs the error object itself. The generic branch writes
 *   error.message and error.code as the error carries them, plus
 *   describeFatalError()'s four-field record, so no other property held by the
 *   error or its cause chain reaches the console
 * - The stack inside that record is the one environment-gated field: it is
 *   replaced with '[REDACTED]' when NODE_ENV is 'production' and written in
 *   full otherwise. message and code are not redacted in either environment,
 *   so detail a library puts in a message is still disclosed
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
         * Five lines in total: error.message, the normalized record from
         * describeFatalError() - name, code, message, and a stack that reads
         * '[REDACTED]' in production - error.code with an 'UNKNOWN' fallback,
         * then two fixed hints. The error object itself is never handed to the
         * logger, so nothing else it carries is rendered.
         *
         * No timestamp or environment metadata is attached, and no
         * classification, severity or recoverability is assessed: every error
         * reaching this branch is treated identically and terminates the
         * process.
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
     * Writes two closing lines - a fixed notice, and the instant termination
     * was initiated as an ISO-8601 timestamp, captured before the drain so it
     * marks when termination began rather than when the process ended - and
     * then exits with a failure status.
     *
     * The exit is unconditional: nothing here can prevent it or retry. It is
     * routed through terminateWithFailure() so the diagnostics above reach the
     * console, because a bare process.exit() can discard them when the stream
     * is a pipe, which is precisely how container logs are collected. That
     * wait is bounded twice over, by the no-progress watchdog and by the total
     * deadline, and bytes still buffered when a bound fires are lost - a
     * failed process must not hang on its reader.
     *
     * This is not a graceful shutdown. terminateWithFailure() closes the
     * listener and destroys the sockets on it, which stops anything further
     * being served, but no request in flight is completed or drained, no file
     * handle or external connection is released explicitly, and nothing is
     * notified: no monitoring system, alerting channel, incident tracker or
     * health-check endpoint learns of this, and the exit status is the only
     * signal that leaves the process. A supervisor - nodemon, Docker or a
     * kubelet - may restart the process from that status, but this file
     * neither triggers nor observes the restart.
     */
    logger.error(`🛑 Application terminating due to server startup failure`);
    logger.error(`⏰ Shutdown initiated at: ${new Date().toISOString()}`);

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
 * repaired and no attempt at recovery is made. Nothing in flight is completed
 * either: terminateWithFailure() closes the listener and destroys its sockets
 * so that nothing further is served, and whatever was mid-request is abandoned
 * rather than drained.
 */

/**
 * Unhandled Promise Rejection Handler
 *
 * Reports a promise rejection that no handler observed, then terminates.
 *
 * Logs three lines: a fixed notice, the rejection reason reduced by
 * describeFatalError() to name, code, message and a production-gated stack,
 * and a fixed termination notice. The exit follows through
 * terminateWithFailure(), which stops accepting connections and then waits
 * only for those lines to drain, under both of its bounds. This is not a
 * graceful shutdown: no request in flight is completed.
 */
process.on('unhandledRejection', (reason) => {
    // The rejected promise is not taken as a parameter because it is not
    // logged: console output for a promise expands the reason held inside it,
    // which is the raw form of the value the next line reports normalized.
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
 * Logs two lines: the normalized record describeFatalError() builds from the
 * exception - the exception object itself is never handed to the logger, so
 * its stack is withheld in production and nothing else it carries is rendered
 * - and a fixed termination notice. Once this handler runs the process state
 * is unreliable by definition, which is why terminateWithFailure() closes the
 * listener and destroys its sockets before draining: the process stops serving
 * at once, and what remains of its life is capped by the total deadline rather
 * than by whatever is reading its logs. No request in flight is completed.
 */
process.on('uncaughtException', (error) => {
    logger.error(`❌ Uncaught Exception:`, describeFatalError(error));
    logger.error(`🛑 Application terminating due to uncaught exception`);
    terminateWithFailure();
});

/**
 * File Documentation Summary
 *
 * What this file implements:
 * - Guarded startup. The port is bound only when this file is the process
 *   entry point, so importing the module yields a server that is not listening
 *   and a test can bind its own ephemeral port
 * - A configurable port, read from config/index.js and screened against the
 *   range listen() accepts before the bind is attempted
 * - Console logging through utils/logger.js: five fixed lines on success; on
 *   failure, a branch for EADDRINUSE and a branch for everything else, both
 *   reporting diagnostics normalized by describeFatalError()
 * - Bounded failure exit. Every fault path stops accepting connections, writes
 *   its lines, and exits non-zero once that output has drained or once one of
 *   the two bounds in terminateWithFailure() fires
 *
 * What this file does not implement:
 * - No graceful shutdown. No SIGTERM or SIGINT handler is registered, so a
 *   termination grace period elapses without this process reacting, and no
 *   request in flight is ever completed. The listener close on the fatal paths
 *   is a hard stop, not a drain
 * - No error recovery, and no resource management or cleanup beyond that
 *   close: a fault is reported and the process ends
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
