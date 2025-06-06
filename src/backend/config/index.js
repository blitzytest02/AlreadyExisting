// Load environment variables from .env file into process.env
// dotenv version: ^16.3.1 - Environment variable loader for Node.js applications
require('dotenv').config();

/**
 * Centralized Application Configuration
 * 
 * This configuration module centralizes all application settings and provides
 * a single source of truth for environment-specific configurations. It loads
 * environment variables from a .env file and provides sensible defaults for
 * local development environments.
 * 
 * The configuration follows the twelve-factor app methodology for configuration
 * management, storing config in environment variables for easy deployment
 * across different environments without code changes.
 * 
 * Key Features:
 * - Environment variable loading via dotenv
 * - Sensible defaults for local development
 * - Type conversion for numeric values
 * - Validation of critical configuration values
 * 
 * Requirements Addressed:
 * - F-001-RQ-003: Port configuration with default value of 3000
 * - Local development environment compatibility using .env files
 * - Node.js v22.16.0 LTS compatibility
 * - Express.js 5.1.0 integration support
 */

/**
 * Application Configuration Object
 * 
 * Contains all application-wide configuration settings with environment
 * variable support and sensible defaults for development environments.
 * 
 * @type {Object}
 */
const config = {
    /**
     * HTTP Server Port Configuration
     * 
     * Defines the port number on which the HTTP server will listen for incoming
     * requests. This setting is configurable via the PORT environment variable
     * with a default fallback to port 3000 for local development.
     * 
     * Technical Specifications:
     * - Default port: 3000 (as per F-001-RQ-003 requirement)
     * - Environment variable: PORT
     * - Type: number
     * - Valid range: 1024-65535 (standard port range for non-privileged processes)
     * 
     * Usage Examples:
     * - Development: PORT=3000 (default)
     * - Production: PORT=8080 or PORT=80 (depending on deployment)
     * - Testing: PORT=0 (allows OS to assign available port)
     * 
     * @type {number}
     * @default 3000
     */
    port: parseInt(process.env.PORT, 10) || 3000,

    /**
     * Node.js Environment Configuration
     * 
     * Specifies the current runtime environment for the application.
     * This setting affects logging levels, error handling, and performance
     * optimizations throughout the application.
     * 
     * @type {string}
     * @default 'development'
     */
    nodeEnv: process.env.NODE_ENV || 'development',

    /**
     * Application Name Configuration
     * 
     * Defines the application name for logging and monitoring purposes.
     * This value is used in log entries and can be helpful for identifying
     * the application in distributed systems.
     * 
     * @type {string}
     * @default 'node-tutorial-app'
     */
    appName: process.env.APP_NAME || 'node-tutorial-app',

    /**
     * Server Host Configuration
     * 
     * Defines the hostname or IP address on which the server will bind.
     * For local development, this defaults to localhost (127.0.0.1).
     * 
     * @type {string}
     * @default 'localhost'
     */
    host: process.env.HOST || 'localhost',

    /**
     * Development Configuration Section
     * 
     * Contains settings specific to development environment including
     * debugging options and development-specific features.
     */
    development: {
        /**
         * Enable/disable detailed logging in development environment
         * @type {boolean}
         * @default true
         */
        enableLogging: process.env.ENABLE_LOGGING !== 'false',

        /**
         * Enable/disable automatic server restart on file changes
         * @type {boolean}
         * @default true
         */
        autoRestart: process.env.AUTO_RESTART !== 'false'
    },

    /**
     * Express.js Framework Configuration
     * 
     * Contains Express.js 5.1.0 specific configuration settings for
     * middleware, routing, and server behavior.
     */
    express: {
        /**
         * Trust proxy setting for Express.js
         * Important for proper client IP detection behind load balancers
         * @type {boolean}
         * @default false
         */
        trustProxy: process.env.TRUST_PROXY === 'true',

        /**
         * JSON parsing configuration
         * @type {Object}
         */
        json: {
            /**
             * Maximum request body size for JSON parsing
             * @type {string}
             * @default '10mb'
             */
            limit: process.env.JSON_LIMIT || '10mb'
        },

        /**
         * URL encoding configuration
         * @type {Object}
         */
        urlencoded: {
            /**
             * Enable extended URL encoding support
             * @type {boolean}
             * @default true
             */
            extended: true,
            /**
             * Maximum request body size for URL encoded data
             * @type {string}
             * @default '10mb'
             */
            limit: process.env.URLENCODED_LIMIT || '10mb'
        }
    }
};

/**
 * Configuration Validation
 * 
 * Validates critical configuration values to ensure the application
 * can start successfully. This prevents runtime errors caused by
 * invalid configuration values.
 */
(function validateConfig() {
    // Validate port number is within acceptable range
    if (config.port < 1024 || config.port > 65535) {
        console.warn(`Warning: Port ${config.port} is outside recommended range (1024-65535)`);
    }

    // Validate required configuration values are present
    if (!config.appName) {
        throw new Error('APP_NAME configuration is required');
    }

    // Log configuration summary in development environment
    if (config.nodeEnv === 'development' && config.development.enableLogging) {
        console.log('📊 Configuration loaded successfully:');
        console.log(`   🚀 App Name: ${config.appName}`);
        console.log(`   🌐 Host: ${config.host}`);
        console.log(`   📡 Port: ${config.port}`);
        console.log(`   🔧 Environment: ${config.nodeEnv}`);
        console.log(`   📝 Logging: ${config.development.enableLogging ? 'enabled' : 'disabled'}`);
    }
})();

/**
 * Export the configuration object for use throughout the application
 * 
 * This configuration object serves as the single source of truth for all
 * application settings and can be imported by any module that needs access
 * to configuration values.
 * 
 * @module config
 * @type {Object}
 * @exports config
 */
module.exports = config;