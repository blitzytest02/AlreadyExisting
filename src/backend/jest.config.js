// Jest Configuration for Node.js Tutorial Application
// Jest Testing Framework - Version: 29.7.0 (the 29.x line, whose engine range
// contains this package's declared Node floor of >=18.0.0)
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
  // Defines which files to include in coverage analysis. These globs resolve
  // relative to rootDir, which defaults to the directory holding this file
  // (src/backend) - so they must NOT be prefixed with 'src/backend/', or they
  // resolve to src/backend/src/backend/**/*.js and match zero files, failing the
  // thresholds below on empty instrumentation.
  //
  // The includes are targeted rather than a blanket '**/*.js' on purpose: a
  // blanket include also instruments the generated HTML report under
  // coverage/lcov-report/ on every run after the first (Jest's default
  // coveragePathIgnorePatterns excludes node_modules but not coverageDirectory),
  // which collapses the global figures even when every source module is at 100%.
  // Naming the two source directories keeps the measurement stable and makes the
  // separate server.js / app.js / config / logger negations unnecessary.
  collectCoverageFrom: [
    'middleware/**/*.js',
    'routes/**/*.js'
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