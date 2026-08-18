// Jest Configuration for Node.js Tutorial Application
// Jest Testing Framework - Version: Latest
// Configured for Node.js v22.16.0 LTS environment with Express.js 5.1.0

/**
 * Jest Configuration Object
 * 
 * This configuration file sets up Jest testing framework for the Node.js tutorial application.
 * It defines test environment, file patterns, coverage settings, and quality thresholds
 * to ensure consistent and reliable testing across the application.
 */
module.exports = {
  // Test Environment Configuration
  // Set to 'node' as required for Node.js applications
  // This configures Jest to run tests in a Node.js environment rather than browser/jsdom
  testEnvironment: 'node',

  // Test File Discovery Patterns
  // Defines where Jest should look for test files
  // Supports both unit tests and integration tests in separate directories
  testMatch: [
    '**/tests/unit/**/*.test.js',      // Unit test files in tests/unit directory
    '**/tests/integration/**/*.test.js' // Integration test files in tests/integration directory
  ],

  // Code Coverage Collection
  // Enables automatic code coverage collection during test execution
  // Essential for quality metrics and CI/CD pipeline integration
  collectCoverage: true,

  // Coverage Output Directory
  // Specifies where coverage reports will be generated
  // Used by CI/CD systems and development tools for coverage analysis
  coverageDirectory: 'coverage',

  // Coverage Collection Sources
  // Defines which files to include in coverage analysis, expressed as positive
  // includes that are relative to this package directory (Jest is always run from
  // src/backend, so a 'src/backend/...' prefix would match nothing and silently
  // reduce the thresholds below to a no-op). Measures exactly the four request
  // handling modules exercised by the unit and integration suites; the entry point,
  // composition root, configuration, logger utility, tooling dotfiles and the tests
  // themselves all sit outside these two directories and are excluded by construction.
  collectCoverageFrom: [
    'routes/**/*.js',      // Route modules: index.js aggregator and hello.js handler
    'middleware/**/*.js'   // Cross-cutting middleware: requestLogger.js and errorHandler.js
  ],

  // Coverage Thresholds
  // Establishes quality gates to ensure high level of test coverage
  // These thresholds must be met for tests to pass in CI/CD pipeline
  coverageThreshold: {
    global: {
      branches: 90,    // 90% branch coverage required
      functions: 90,   // 90% function coverage required
      lines: 90,       // 90% line coverage required
      statements: 90   // 90% statement coverage required
    }
  },

  // Verbose Output
  // Enables detailed test output for better debugging and educational value
  // Shows individual test results and execution details
  verbose: true,

  // Mock Cleanup
  // Automatically clears mock calls and instances between tests
  // Ensures test isolation and prevents mock state leakage
  clearMocks: true,

  // Test Timeout
  // Sets maximum time (in milliseconds) for individual test execution
  // Prevents tests from hanging indefinitely and ensures timely CI/CD execution
  testTimeout: 30000  // 30 seconds timeout for comprehensive test scenarios
};