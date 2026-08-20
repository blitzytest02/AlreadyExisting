module.exports = {
  testEnvironment: 'node',

  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],

  collectCoverage: true,

  coverageDirectory: 'coverage',

  // Positive includes, package-relative. Jest is always run from src/backend,
  // so a 'src/backend/...' prefix would match nothing and silently reduce the thresholds below to
  // a no-op. These two globs measure exactly the request-handling modules the suites exercise;
  // the entry point, composition root, configuration, logger utility, tooling dotfiles and the
  // tests themselves sit outside these directories and are excluded by construction.
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js'
  ],

  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  verbose: true,

  // Clears recorded calls between cases. It does NOT restore original implementations, which is
  // why the middleware suites restore their logger spies explicitly.
  clearMocks: true,

  testTimeout: 30000
};
