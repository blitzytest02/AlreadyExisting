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

/**
 * An Express application is itself a request listener, so it is handed to http.createServer
 * rather than started with app.listen(). The server object that results is the thing a test can
 * drive: the integration suite calls listen(0) and close() on this exact instance.
 *
 * @type {http.Server}
 */
const server = http.createServer(app);


/**
 * Binding is asynchronous, so a bind failure - EADDRINUSE above all - arrives here as an 'error'
 * event and a try/catch around server.listen() would never see it. Not every startup failure takes
 * that path, though: listen() validates its arguments first and throws synchronously for a port
 * outside 0-65535 (ERR_SOCKET_BAD_PORT), and config/index.js only warns about such a value rather
 * than rejecting it, so `PORT=70000 npm start` ends in an uncaught RangeError without this listener
 * running at all.
 *
 * This listener stays outside the direct-execution block below on purpose: it is attached to the
 * server object rather than to the process, so it remains inert until something calls listen(),
 * including a test that calls it.
 *
 * EADDRINUSE is singled out because it is the failure a learner meets routinely and the only one
 * with a concrete remedy to offer. Anything else is reported with the fields the error carries.
 * Note what that means: the whole error object reaches the console here, so this is a development
 * diagnostic, not a redacted one. That is the house style rather than an exception. A startup
 * error is the operator's own, but the request path is not: the request logger copies the target
 * and the body out verbatim, and the error middleware logs the request's headers, params and
 * query as they arrived - neither classifies, bounds nor encodes what it writes. That limitation
 * is recorded for a learner in src/backend/README.md under "Known Limitations of the Tutorial
 * Middleware"; nothing here should be read as evidence of a redaction policy.
 *
 * Both branches end in process.exit(1). A server that cannot bind has nothing left to do, and a
 * non-zero exit is what nodemon, npm and a container runtime read as failure.
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
        logger.error(`❌ Server startup failed with error: ${error.message}`);
        logger.error(`🔍 Error details:`, error);
        logger.error(`📋 Error code: ${error.code || 'UNKNOWN'}`);
        logger.error(`🔧 Please check server configuration and system requirements`);
        logger.error(`📞 If the problem persists, check the application logs for additional details`);
    }

    logger.error(`🛑 Application terminating due to server startup failure`);
    logger.error(`⏰ Shutdown initiated at: ${new Date().toISOString()}`);

    process.exit(1);
});

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
     * config.port decides what is bound; config.nodeEnv is read further down purely to name the
     * environment in the startup message. Both come through config/index.js rather than from
     * process.env, because that module is the configuration boundary (it applies the default of
     * 3000). No host is passed, so Node listens on every interface - which is what makes the same
     * command work inside a container.
     *
     * The callback runs once the socket is actually bound, so the lines it logs report a claimed
     * port rather than an attempt to claim one. A bind failure reaches the 'error' listener above
     * instead and never gets here.
     */
    server.listen(config.port, () => {
        logger.info(`🚀 HTTP Server successfully started and listening on port ${config.port}`);
        logger.info(`🌐 Server is ready to accept HTTP requests`);
        logger.info(`📍 Local development URL: http://localhost:${config.port}`);
        logger.info(`⚡ Node.js ${process.version} | Express 5.1.0 | Environment: ${config.nodeEnv}`);
        logger.info(`🎯 Tutorial application initialized successfully`);
    });

    /**
     * Process-level last resorts. Both handlers report and then exit(1), which is why their
     * registration belongs inside this guard rather than at module scope: a require must not
     * install a handler that can terminate a Jest worker over a rejection raised anywhere else
     * in the run. The integration suite asserts that this file adds no such listener on import.
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
}
