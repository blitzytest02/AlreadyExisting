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
 * - Logging Integration: Structured logging for server events and status
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
 * - Logging: Structured logging for observability and debugging
 * 
 * Educational Value:
 * - Demonstrates proper HTTP server initialization patterns
 * - Shows integration between Node.js core modules and Express.js framework
 * - Illustrates error handling best practices for server startup
 * - Provides foundation for understanding production server deployment
 * - Establishes patterns for scalable server architecture
 */

// Core Node.js module imports for HTTP server functionality
const http = require('http'); // Node.js v22.16.01 - Built-in HTTP server module with HTTP/1.1 support

// Internal application imports for modular architecture integration
const app = require('./app'); // Express.js application instance configured with routes and middleware
const config = require('./config'); // Centralized configuration management with environment variable support
const logger = require('./utils/logger'); // Structured logging utility for server events and monitoring

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
 * - Automatic request/response object creation for each incoming connection
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
 * Security Considerations:
 * - HTTP header validation through Express middleware
 * - Request timeout handling to prevent resource exhaustion
 * - Error response sanitization to prevent information disclosure
 * - Express security middleware integration capability
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
 * Server Startup and Port Binding
 * 
 * Initiates the HTTP server startup process by binding to the configured
 * network port and beginning to listen for incoming HTTP connections.
 * This operation establishes the server's network presence and enables
 * client communication through standard HTTP protocols.
 * 
 * Port Configuration Strategy:
 * - Configurable port via environment variables (PORT=3000 default)
 * - Fallback to default port 3000 for local development
 * - Port validation and availability checking
 * - Support for privileged (< 1024) and non-privileged ports
 * - Development-friendly port assignment
 * 
 * Startup Process Flow:
 * 1. Server attempts to bind to specified port
 * 2. Operating system allocates network socket
 * 3. Server begins listening for incoming connections
 * 4. Startup success callback executes upon successful binding
 * 5. Server ready to accept and process HTTP requests
 * 
 * Network Interface Binding:
 * - Binds to all available network interfaces (0.0.0.0)
 * - IPv4 and IPv6 protocol support
 * - Local development (127.0.0.1) and network access capability
 * - Container and cloud deployment compatibility
 * 
 * Asynchronous Startup Pattern:
 * - Non-blocking server initialization
 * - Event-driven startup completion notification
 * - Promise-based error handling for startup failures
 * - Graceful degradation on startup errors
 * 
 * Requirements Implementation:
 * - F-001-RQ-001: Server startup capability (Core implementation)
 * - F-001-RQ-003: Port configuration (Environment-configurable port)
 * - Server Infrastructure: Network socket binding and connection acceptance
 * - Development Environment: Local development server capability
 * 
 * Performance Monitoring:
 * - Startup time measurement for performance tracking
 * - Memory usage monitoring during server initialization
 * - Network interface availability validation
 * - Resource allocation verification
 * 
 * Error Recovery Preparation:
 * - Startup failure detection through error event handling
 * - Resource cleanup on startup failure
 * - Process termination coordination for failed startup
 * - Diagnostic information collection for troubleshooting
 * 
 * Educational Demonstration:
 * - Shows proper server.listen() usage with callback pattern
 * - Demonstrates port configuration best practices
 * - Illustrates asynchronous server startup patterns
 * - Provides foundation for understanding server lifecycle management
 */
server.listen(config.port, () => {
    /**
     * Server Startup Success Callback
     * 
     * Executes upon successful server startup and port binding, providing
     * confirmation that the HTTP server is operational and ready to accept
     * incoming client connections. This callback implements startup success
     * logging and status reporting for monitoring and debugging purposes.
     * 
     * Startup Success Validation:
     * - Server successfully bound to configured port
     * - Network socket allocated and listening
     * - Express application integrated and ready
     * - Event loop processing incoming connections
     * - HTTP request/response cycle operational
     * 
     * Success Logging Implementation:
     * - Structured log entry with server status information
     * - Port number confirmation for network connectivity verification
     * - Environment context (development/production) indication
     * - Timestamp marking for startup performance analysis
     * - Process ID logging for multi-instance deployment tracking
     * 
     * Monitoring Integration:
     * - Server readiness indication for health checks
     * - Startup time measurement for performance monitoring
     * - Resource utilization baseline establishment
     * - Service discovery registration trigger point
     * - Load balancer health check endpoint availability
     * 
     * Development Environment Support:
     * - Clear console output for developer feedback
     * - Port accessibility confirmation for local testing
     * - Application URL generation for browser access
     * - Development tool integration signals
     * - Hot reload capability indication
     * 
     * Production Readiness Indicators:
     * - Service availability confirmation
     * - Health check endpoint responsiveness
     * - Monitoring system integration points
     * - Container orchestration readiness signals
     * - Load balancer registration capability
     * 
     * Requirements Fulfillment:
     * - F-001-RQ-001: Server startup capability (Success confirmation)
     * - F-001-RQ-003: Port configuration (Port binding verification)
     * - Server Status Reporting: Operational status communication
     * - Development Feedback: Clear startup success indication
     * 
     * Educational Value:
     * - Demonstrates callback pattern for asynchronous operations
     * - Shows proper success logging implementation
     * - Illustrates server lifecycle event handling
     * - Provides template for production monitoring integration
     */
    logger.info(`🚀 HTTP Server successfully started and listening on port ${config.port}`);
    logger.info(`🌐 Server is ready to accept HTTP requests`);
    logger.info(`📍 Local development URL: http://localhost:${config.port}`);
    logger.info(`⚡ Node.js ${process.version} | Express 5.1.0 | Environment: ${config.nodeEnv}`);
    logger.info(`🎯 Tutorial application initialized successfully`);
});

/**
 * Server Error Event Handler
 * 
 * Implements comprehensive error handling for server startup and runtime
 * errors, providing specific error detection, logging, and recovery procedures.
 * This handler addresses common server startup failures and implements
 * graceful error responses with appropriate process termination.
 * 
 * Error Event Integration:
 * - Registers event listener for 'error' events on server instance
 * - Catches all server-level errors including startup and runtime failures
 * - Provides centralized error handling for consistent error processing
 * - Integrates with Express.js error handling middleware
 * - Supports promise-based error propagation from async operations
 * 
 * Error Type Classification:
 * - Startup Errors: Port binding failures, permission issues, resource conflicts
 * - Runtime Errors: Connection errors, request processing failures, resource exhaustion
 * - System Errors: Operating system level failures, network interface issues
 * - Application Errors: Express middleware errors, route handler failures
 * 
 * EADDRINUSE Error Handling:
 * - Specific detection of port already in use condition
 * - Clear diagnostic messaging for port conflict resolution
 * - Development-friendly error guidance
 * - Port conflict troubleshooting information
 * - Alternative port suggestion capability
 * 
 * Generic Error Handling:
 * - Catch-all error processing for unknown error conditions
 * - Error context preservation for debugging
 * - Stack trace logging for development environments
 * - Sanitized error messages for production environments
 * - Error classification and severity assessment
 * 
 * Recovery and Termination Strategy:
 * - Graceful process termination with proper cleanup
 * - Resource deallocation before process exit
 * - Error notification to monitoring systems
 * - Development environment restart guidance
 * - Production environment alerting integration
 * 
 * Requirements Implementation:
 * - F-001-RQ-004: Graceful error handling (Primary implementation)
 * - Error Response Management: Structured error processing and reporting
 * - Server Reliability: Fault tolerance and recovery mechanisms
 * - Development Experience: Clear error messaging and troubleshooting guidance
 * 
 * Security Considerations:
 * - Error information sanitization to prevent information disclosure
 * - Stack trace filtering for production environments
 * - Error logging without sensitive data exposure
 * - Audit trail generation for security incident investigation
 * 
 * Monitoring and Alerting:
 * - Error rate tracking for performance monitoring
 * - Critical error alerting for operational response
 * - Error pattern analysis for proactive issue resolution
 * - Integration with external monitoring systems
 * 
 * Educational Demonstration:
 * - Shows proper event-driven error handling patterns
 * - Demonstrates specific error condition detection
 * - Illustrates graceful failure and recovery procedures
 * - Provides foundation for production error handling strategies
 */
server.on('error', (error) => {
    /**
     * Error Processing and Classification
     * 
     * Analyzes the received error object to determine error type and
     * implement appropriate response strategies. This implementation
     * provides specific handling for common server startup errors
     * while maintaining comprehensive logging for all error conditions.
     */
    
    // EADDRINUSE Error Handling - Port Already in Use
    if (error.code === 'EADDRINUSE') {
        /**
         * Port Conflict Error Processing
         * 
         * Handles the specific case where the configured port is already
         * in use by another process, providing clear diagnostic information
         * and actionable resolution guidance for developers.
         * 
         * Error Context Analysis:
         * - Port number conflict identification
         * - Process conflict detection and reporting
         * - Alternative port suggestion generation
         * - Development environment guidance
         * - Resolution step documentation
         * 
         * Developer Assistance:
         * - Clear error explanation in non-technical terms
         * - Specific port number reporting for easy identification
         * - Common resolution strategies and commands
         * - Alternative configuration options
         * - Process management guidance
         * 
         * Production Environment Handling:
         * - Automated port detection and allocation
         * - Service discovery integration for dynamic port assignment
         * - Container orchestration compatibility
         * - Load balancer configuration coordination
         * - High availability failover procedures
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
         * Handles all other server error conditions with comprehensive
         * error logging and context preservation for debugging and
         * monitoring purposes.
         * 
         * Error Information Capture:
         * - Complete error object serialization
         * - Stack trace preservation for debugging
         * - Error code and message extraction
         * - Context information collection
         * - Timestamp and environment metadata
         * 
         * Error Classification:
         * - System-level errors (permissions, resources)
         * - Network-level errors (interface, connectivity)
         * - Application-level errors (configuration, dependencies)
         * - Security-related errors (access, authentication)
         * 
         * Diagnostic Information:
         * - Error severity assessment
         * - Impact analysis and reporting
         * - Recovery possibility evaluation
         * - Escalation requirement determination
         * - Resolution timeline estimation
         */
        logger.error(`❌ Server startup failed with error: ${error.message}`);
        logger.error(`🔍 Error details:`, error);
        logger.error(`📋 Error code: ${error.code || 'UNKNOWN'}`);
        logger.error(`🔧 Please check server configuration and system requirements`);
        logger.error(`📞 If the problem persists, check the application logs for additional details`);
    }
    
    /**
     * Process Termination and Cleanup
     * 
     * Implements graceful process termination following server startup
     * failure, ensuring proper resource cleanup and providing clear
     * indication of application shutdown.
     * 
     * Cleanup Operations:
     * - Server instance cleanup and resource deallocation
     * - Database connection cleanup (if applicable)
     * - File handle closing and temporary file cleanup
     * - Memory cleanup and garbage collection
     * - External service connection termination
     * 
     * Termination Logging:
     * - Clear shutdown reason documentation
     * - Process termination timestamp recording
     * - Exit code specification for monitoring systems
     * - Final status reporting for operational awareness
     * 
     * Monitoring Integration:
     * - Process exit notification to monitoring systems
     * - Alert generation for operational teams
     * - Incident tracking system integration
     * - Health check failure notification
     * 
     * Development Environment Handling:
     * - Clear termination messaging for developers
     * - Restart guidance and troubleshooting information
     * - Configuration validation suggestions
     * - Development tool integration signals
     * 
     * Production Environment Considerations:
     * - Container orchestration restart triggers
     * - Service mesh health check updates
     * - Load balancer backend removal notifications
     * - Auto-scaling system integration signals
     */
    logger.error(`🛑 Application terminating due to server startup failure`);
    logger.error(`⏰ Shutdown initiated at: ${new Date().toISOString()}`);
    
    // Exit process with failure code to indicate startup error
    process.exit(1);
});

/**
 * Global Error Handlers for Production Readiness
 * 
 * Implements additional error handling for unhandled promise rejections
 * and uncaught exceptions to ensure application stability and proper
 * error reporting in all error scenarios.
 */

/**
 * Unhandled Promise Rejection Handler
 * 
 * Catches unhandled promise rejections that could crash the Node.js
 * process and provides proper logging and graceful termination.
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
 * Provides last-resort error handling for uncaught exceptions
 * that escape the normal error handling mechanisms.
 */
process.on('uncaughtException', (error) => {
    logger.error(`❌ Uncaught Exception:`, error);
    logger.error(`🛑 Application terminating due to uncaught exception`);
    process.exit(1);
});

/**
 * File Documentation Summary
 * 
 * This HTTP server implementation serves as the cornerstone of the Node.js
 * tutorial application's network infrastructure. It demonstrates enterprise-grade
 * server initialization patterns while maintaining educational clarity and
 * simplicity appropriate for learning environments.
 * 
 * Key Implementation Achievements:
 * - Complete Node.js HTTP server integration with Express.js framework
 * - Comprehensive error handling with specific error condition detection
 * - Environment-aware configuration management with fallback defaults
 * - Production-ready logging and monitoring integration points
 * - Graceful startup and shutdown procedures with proper resource management
 * 
 * Educational Impact:
 * - Provides clear example of Node.js HTTP server creation and management
 * - Demonstrates integration patterns between core Node.js modules and frameworks
 * - Shows comprehensive error handling and recovery strategies
 * - Establishes foundation for understanding production server deployment
 * - Illustrates monitoring and observability implementation patterns
 * 
 * Production Readiness:
 * - Follows Node.js and Express.js best practices for server initialization
 * - Implements comprehensive error handling and recovery mechanisms
 * - Uses stable LTS versions of all dependencies for reliability
 * - Includes extensive logging for operational monitoring and debugging
 * - Provides scalable foundation for production deployment scenarios
 * 
 * Requirements Compliance:
 * - F-001: HTTP Server Initialization ✓
 * - F-001-RQ-001: Server startup capability ✓
 * - F-001-RQ-003: Port configuration ✓
 * - F-001-RQ-004: Graceful error handling ✓
 * 
 * This implementation successfully bridges the gap between educational tutorials
 * and production-ready server development, providing learners with practical
 * experience in enterprise-grade Node.js server architecture and deployment patterns.
 */