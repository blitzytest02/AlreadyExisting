/**
 * HTTP Server Entry Point
 *
 * Creates the HTTP server for the Express application assembled in app.js and, when this file is
 * the program entry point, binds it to the configured port.
 *
 * Two responsibilities are deliberately kept apart: app.js decides what the application answers,
 * this file decides whether a socket is open at all. That split is what lets the integration
 * suite import the server and own its lifecycle instead of racing a listener it did not start.
 */

const http = require('http');

const app = require('./app');
const config = require('./config');
// The logger module exports an object - `module.exports = { logger }` - so the named form is
// required here. Read as a default it would yield that wrapper object, whose `.error` is
// undefined, and the first startup failure would throw instead of being reported.
const { logger } = require('./utils/logger');
// The framework version reported at startup is read from the installed package's own manifest
// rather than written as a literal, because a literal cannot stay true: package.json declares
// `express: ^5.1.0`, so an install is free to resolve any 5.x release - 5.2.1 for the committed
// lockfile - and a hardcoded token starts naming a version that is not the one running the first
// time the range resolves to something newer. Node resolves this subpath from the same
// node_modules copy of Express that app.js loaded on the line above, so the two cannot disagree,
// and an Express that could not be resolved at all would already have failed there. This is
// metadata for a log line only: nothing here reads it to make a decision.
const { version: expressVersion } = require('express/package.json');

/**
 * An Express application is itself a request listener, so it is handed to http.createServer
 * rather than started with app.listen(). The server object that results is the thing a test can
 * drive: the integration suite calls listen(0) and close() on this exact instance.
 *
 * @type {http.Server}
 */
const server = http.createServer(app);


/**
 * Reports a startup failure and ends the process, in one shape however the failure arrived.
 *
 * This is a named function rather than an inline listener body because listen() fails in two
 * different ways and both deserve the same treatment. A bind failure - EADDRINUSE above all -
 * arrives asynchronously as the server's 'error' event, which a try/catch around listen() would
 * never see. An argument failure does not wait for a socket: listen() validates its port first
 * and throws synchronously for a value outside 0-65535 (ERR_SOCKET_BAD_PORT), and
 * config/index.js only warns about such a value rather than rejecting it. So `PORT=70000
 * npm start` reaches this function through the catch below while a taken port reaches it through
 * the event, and a learner sees the same report either way instead of a raw stack trace for one
 * of the two.
 *
 * The two named branches are the two failures a learner actually meets - a port already held and
 * a port that is not a port - and they are the two with a concrete remedy to offer. Neither
 * branch logs the error object itself: the useful facts are already in the message, and printing
 * the object would print its stack, which for an invalid port means nine node-internal frames
 * and this file's absolute path where a few lines of guidance are what actually help.
 *
 * Anything else is reported with the fields the error carries, object included. Note what that
 * means: the whole error object reaches the console in that last branch, stack and all. That is
 * defensible here and only here - a startup failure is the operator's own, raised before any
 * request exists - and it is not the standard the request path is held to. There the request
 * logger still copies the target and the body out verbatim, while the error middleware records
 * headers from an allow-list and withholds the stack outside development. What each of them
 * writes is set out for a learner in src/backend/README.md under "Known Limitations of the
 * Tutorial Middleware".
 *
 * Every branch ends in process.exit(1). A server that cannot bind has nothing left to do, and a
 * non-zero exit is what nodemon, npm and a container runtime read as failure.
 *
 * @param {Error} error - The failure that prevented the server from listening. `error.code`
 *                        selects the branch; EADDRINUSE and ERR_SOCKET_BAD_PORT are named and
 *                        anything else falls through to the generic report.
 * @returns {void} Does not return: the process exits with code 1.
 */
function reportStartupFailure(error) {
    if (error.code === 'EADDRINUSE') {
        // The suggested port is derived from the one that failed rather than hardcoded, so the
        // advice matches the conflict a learner is actually looking at. Stepping down at the top
        // of the range keeps the printed value a legal port for the one input where stepping up
        // would not be.
        const alternatePort = config.port < 65535 ? config.port + 1 : config.port - 1;

        logger.error(`❌ Server startup failed: Port ${config.port} is already in use`);
        logger.error(`💡 Resolution suggestions:`);
        logger.error(`   • Start on a free port instead: PORT=${alternatePort} npm start`);
        logger.error(`   • Or release port ${config.port}: press Ctrl+C in the terminal that started the process holding it`);
        logger.error(`   • If that terminal is gone, find the owning PID with whichever port inspector this machine has - ss, lsof or fuser on Linux and macOS, netstat on Windows - and signal only that PID`);
        logger.error(`   • Check for other running instances of this application`);
        logger.error(`   • Verify no other services are using port ${config.port}`);
    } else if (error.code === 'ERR_SOCKET_BAD_PORT') {
        logger.error(`❌ Server startup failed: ${config.port} is not a usable port number`);
        logger.error(`💡 Resolution suggestions:`);
        logger.error(`   • Set PORT to a whole number from 1024 to 65535, then start again`);
        logger.error(`   • Or start on the documented default: PORT=3000 npm start`);
        logger.error(`   • Check src/backend/.env - the PORT value recorded there is used whenever the shell sets none`);
    } else {
        logger.error(`❌ Server startup failed with error: ${error.message}`);
        logger.error(`🔍 Error details:`, error);
        logger.error(`📋 Error code: ${error.code || 'UNKNOWN'}`);
        logger.error(`🔧 Please check server configuration and system requirements`);
        logger.error(`📞 If the problem persists, check the application logs for additional details`);
    }

    logger.error(`🛑 Application terminating due to server startup failure`);
    logger.error(`⏰ Shutdown initiated at: ${new Date().toISOString()}`);

    process.exit(1);
}

/**
 * The asynchronous half of the pair. This registration stays outside the direct-execution block
 * below on purpose: it is attached to the server object rather than to the process, so it remains
 * inert until something calls listen(), including a test that calls it. One listener is attached
 * here and the integration suite records that count as an implementation choice rather than a
 * contract.
 */
server.on('error', reportStartupFailure);

/**
 * HTTP Server Export
 *
 * Publishes the server instance so a test can own its lifecycle: the integration suite
 * requires this module, calls server.listen(0) to claim an ephemeral port, issues its
 * assertions and calls server.close(). The export is declared before the direct-execution
 * block below so the module presents the same shape however it was loaded.
 *
 * @type {http.Server}
 */
module.exports = server;

/**
 * Direct Execution Guard
 *
 * The statements inside this block run only when this file is the program entry point
 * (`node server.js`, which is what `npm start` and the container CMD invoke). Importing the
 * module instead - as the integration suite does - must not bind a port and must not install
 * process-wide handlers: binding would collide with the suite's own ephemeral listener, and
 * the process.exit(1) handlers below could terminate the Jest worker.
 *
 * The server-level 'error' listener above stays outside this block deliberately: it is
 * attached to the server object rather than to the process, so it stays inert until
 * something actually tries to listen.
 */
if (require.main === module) {
    /**
     * Process-level last resorts. Both handlers report and then exit(1), which is why their
     * registration belongs inside this guard rather than at module scope: a require must not
     * install a handler that can terminate a Jest worker over a rejection raised anywhere else
     * in the run. The integration suite asserts that this file adds no such listener on import.
     *
     * They are registered before the listen() call rather than after it, because a handler that
     * is installed afterwards is not installed yet at the moment listen() validates its port and
     * throws. Ordering them first means nothing between the start of this block and the end of
     * the process is unguarded. The try/catch below still handles that particular throw itself,
     * because it can name the failure precisely where these two can only report it generically.
     *
     * A rejection or an exception that reaches this far has escaped Express's own error path, so
     * the process state is no longer trustworthy and it is ended rather than continued.
     */
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`❌ Unhandled Promise Rejection at:`, promise);
        logger.error(`💥 Rejection reason:`, reason);
        logger.error(`🛑 Application terminating due to unhandled promise rejection`);
        process.exit(1);
    });

    process.on('uncaughtException', (error) => {
        logger.error(`❌ Uncaught Exception:`, error);
        logger.error(`🛑 Application terminating due to uncaught exception`);
        process.exit(1);
    });

    /**
     * config.port decides what is bound; config.nodeEnv is read inside the callback purely to
     * decide how the startup message describes the running process. Both come through
     * config/index.js rather than from process.env, because that module is the configuration
     * boundary (it applies the default of 3000). No host is passed, so Node listens on every
     * interface - which is what makes the same command work inside a container, and is also why
     * the message below only claims a localhost URL where localhost is what a learner is using.
     *
     * The callback runs once the socket is actually bound, so the lines it logs report a claimed
     * port rather than an attempt to claim one. An asynchronous bind failure reaches the 'error'
     * listener above instead and never gets here.
     *
     * The call is wrapped because the other half of listen()'s failure surface is synchronous: an
     * out-of-range port is rejected before any socket exists, and without this catch that throw
     * escapes as an unhandled RangeError - nine node-internal frames and this file's absolute
     * path - where a taken port gets a named diagnosis and remedies. Routing it to the same
     * reporter is what makes the two failures look alike to whoever is reading the terminal.
     */
    try {
        server.listen(config.port, () => {
            logger.info(`🚀 HTTP Server successfully started and listening on port ${config.port}`);
            logger.info(`🌐 Server is ready to accept HTTP requests`);

            // The localhost URL is a development convenience and is only true in the sense that
            // matters there. Nothing is bound to localhost specifically - no host argument was
            // passed - so outside development, where the process is as likely to be answering on
            // a container or cluster address, the line states what was actually bound instead of
            // inviting an operator to a URL that describes their own machine.
            if (config.nodeEnv === 'development') {
                logger.info(`📍 Local development URL: http://localhost:${config.port}`);
            } else {
                logger.info(`📍 Listening on all network interfaces at port ${config.port}`);
            }

            logger.info(`⚡ Node.js ${process.version} | Express ${expressVersion} | Environment: ${config.nodeEnv}`);
            logger.info(`🎯 Tutorial application initialized successfully`);
        });
    } catch (error) {
        reportStartupFailure(error);
    }
}
