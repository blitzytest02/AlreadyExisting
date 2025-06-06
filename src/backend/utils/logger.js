/**
 * Simple Console Logger Utility
 * 
 * A lightweight logging utility that provides different log levels (info, error) with
 * environment-specific formatting. The log format is adjusted based on the application
 * environment (development vs. other) to enhance debugging in development without
 * cluttering production logs.
 * 
 * This utility is kept simple with no external dependencies to align with the tutorial's
 * focus on core Node.js concepts and provides the foundation for observability by
 * creating logs that can be monitored.
 * 
 * Technical Features:
 * - Environment-aware formatting (development vs production)
 * - Multiple log levels (info, error) 
 * - Console-based output (stdout for info, stderr for error)
 * - Variadic parameter support for flexible message composition
 * - Zero external dependencies for educational clarity
 * 
 * Requirements Addressed:
 * - Basic error handling and logging (Core Features and Functionalities)
 * - Logging and Tracing Strategy (Cross-cutting Concerns)
 * - Monitoring and Observability Approach (System Architecture)
 */

// Import application configuration to determine current environment
// This provides access to the NODE_ENV setting for environment-specific behavior
const config = require('../config');

/**
 * Logger utility object providing standardized logging functionality
 * across the application with environment-specific formatting
 * 
 * @namespace logger
 */
const logger = {
    /**
     * Logs informational messages to the standard console output
     * 
     * In a 'development' environment, messages are prefixed with '[INFO]:' for clarity
     * and easy identification during debugging. In other environments (production, test),
     * no prefix is added to keep logs clean and reduce verbosity.
     * 
     * This function supports variadic parameters, allowing multiple values to be logged
     * in a single call, which is useful for logging complex data structures or
     * multiple related pieces of information.
     * 
     * @function info
     * @param {...any} params - Variable number of parameters to log. Can include
     *                          strings, objects, numbers, or any other data types
     *                          that can be serialized by console.log
     * @returns {void} This function does not return a value
     * 
     * @example
     * // Development environment output: [INFO]: Server started on port 3000
     * logger.info('Server started on port', 3000);
     * 
     * @example
     * // Production environment output: Request processed successfully
     * logger.info('Request processed successfully');
     * 
     * @example
     * // Logging multiple parameters and objects
     * logger.info('User action:', { userId: 123, action: 'login' }, 'at', new Date());
     */
    info: (...params) => {
        // Check if the application environment is 'development' for conditional formatting
        if (config.nodeEnv === 'development') {
            // In development, prefix with [INFO]: for clear identification of log level
            console.log('[INFO]:', ...params);
        } else {
            // In production/other environments, log without prefix for cleaner output
            console.log(...params);
        }
    },

    /**
     * Logs error messages to the console's error stream
     * 
     * In a 'development' environment, messages are prefixed with '[ERROR]:' for easy
     * identification and debugging. In other environments (production, test), no prefix
     * is added to maintain clean log output suitable for production monitoring systems.
     * 
     * This function outputs to stderr (console.error) to ensure error messages are
     * properly categorized and can be redirected or filtered separately from standard
     * output in production environments.
     * 
     * @function error
     * @param {...any} params - Variable number of parameters to log. Typically includes
     *                          error messages, error objects, stack traces, or any
     *                          contextual information relevant to the error condition
     * @returns {void} This function does not return a value
     * 
     * @example
     * // Development environment output: [ERROR]: Database connection failed
     * logger.error('Database connection failed', error);
     * 
     * @example
     * // Production environment output: Authentication failed for user 123
     * logger.error('Authentication failed for user', userId);
     * 
     * @example
     * // Logging error objects with additional context
     * logger.error('Request processing failed:', error, 'for endpoint:', endpoint);
     */
    error: (...params) => {
        // Check if the application environment is 'development' for conditional formatting
        if (config.nodeEnv === 'development') {
            // In development, prefix with [ERROR]: for clear identification of error logs
            console.error('[ERROR]:', ...params);
        } else {
            // In production/other environments, log without prefix for cleaner output
            console.error(...params);
        }
    }
};

/**
 * Export the logger object for use throughout the application
 * 
 * The logger object contains standardized logging functions that provide consistent
 * formatting and behavior across different application environments. This centralized
 * approach ensures uniform logging practices and makes it easy to modify logging
 * behavior application-wide by updating this single module.
 * 
 * Usage in other modules:
 * - Import: const { logger } = require('./utils/logger');
 * - Or: const logger = require('./utils/logger').logger;
 * 
 * The logger is used by:
 * - Request loggers for tracking HTTP requests
 * - Error handlers for logging application errors
 * - Middleware for logging processing information
 * - General application components for debugging and monitoring
 * 
 * @module logger
 * @type {Object}
 * @property {Function} info - Logs informational messages
 * @property {Function} error - Logs error messages
 */
module.exports = { logger };