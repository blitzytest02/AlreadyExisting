// ESLint Configuration for Node.js Tutorial Application
// Supports Node.js v22.16.0 LTS with Express 5.1.0 and ES2022+ features
// Configured for code quality, security, and modern JavaScript development practices

module.exports = {
  // Environment configuration for Node.js backend development
  env: {
    // CommonJS module support for Node.js require/module.exports
    commonjs: true,
    // ES2021 features support (includes ES6+ syntax)
    es2021: true,
    // Node.js global variables and Node.js scoping
    node: true,
    // Jest testing environment (for future test integration)
    jest: true
  },

  // Extend recommended configurations for consistent code quality
  extends: [
    // ESLint recommended rules for general JavaScript best practices
    'eslint:recommended',
    // Security-focused linting rules to prevent common vulnerabilities
    'plugin:security/recommended',
    // Node.js specific best practices and patterns
    'plugin:node/recommended'
  ],

  // Parser options for modern JavaScript features
  parserOptions: {
    // Latest ECMAScript version (ES2022+ for Node.js v22 compatibility)
    ecmaVersion: 'latest',
    // Module type: 'module' for ES6 imports, 'script' for CommonJS
    sourceType: 'script',
    // ECMAScript features to enable
    ecmaFeatures: {
      // Enable destructuring assignment
      destructuring: true,
      // Enable template literals
      templateStrings: true,
      // Enable arrow functions
      arrowFunctions: true
    }
  },

  // Plugin configuration for enhanced linting capabilities
  plugins: [
    // Security plugin for detecting security anti-patterns
    'security',
    // Node.js specific linting rules
    'node',
    // JSDoc documentation linting
    'jsdoc'
  ],

  // Globals that should be available throughout the application
  globals: {
    // Process object for Node.js environment variables and system info
    process: 'readonly',
    // Buffer for binary data handling in Node.js
    Buffer: 'readonly',
    // Global for Node.js globals
    global: 'readonly'
  },

  // Custom rules configuration for code quality and security
  rules: {
    // ===== SECURITY RULES =====
    // Prevent use of eval() which can execute arbitrary code
    'no-eval': 'error',
    'security/detect-eval-with-expression': 'error',
    
    // Prevent use of console statements in production code
    'no-console': 'warn',
    
    // Require use of strict mode
    'strict': ['error', 'global'],
    
    // Prevent use of deprecated Node.js APIs
    'node/no-deprecated-api': 'error',
    
    // ===== CODE QUALITY RULES =====
    // Enforce consistent indentation (2 spaces for Node.js projects)
    'indent': ['error', 2, { 
      'SwitchCase': 1,
      'VariableDeclarator': 1,
      'outerIIFEBody': 1
    }],
    
    // Enforce consistent line endings (LF for Unix/Linux compatibility)
    'linebreak-style': ['error', 'unix'],
    
    // Enforce consistent quote style (single quotes for strings)
    'quotes': ['error', 'single', { 
      'avoidEscape': true,
      'allowTemplateLiterals': true 
    }],
    
    // Require semicolons for statement termination
    'semi': ['error', 'always'],
    
    // Enforce consistent comma usage
    'comma-dangle': ['error', 'never'],
    
    // ===== MODERN JAVASCRIPT RULES =====
    // Prefer const for variables that are never reassigned
    'prefer-const': 'error',
    
    // Prefer arrow functions for callbacks
    'prefer-arrow-callback': 'error',
    
    // Prefer template literals over string concatenation
    'prefer-template': 'error',
    
    // Prefer destructuring assignment when possible
    'prefer-destructuring': ['error', {
      'VariableDeclarator': {
        'array': false,
        'object': true
      },
      'AssignmentExpression': {
        'array': true,
        'object': false
      }
    }],
    
    // ===== EXPRESS.JS SPECIFIC RULES =====
    // Require error handling in Express routes
    'node/handle-callback-err': 'error',
    
    // Prevent callback hell by encouraging async/await
    'node/no-callback-literal': 'error',
    
    // ===== ERROR PREVENTION RULES =====
    // Prevent undefined variables
    'no-undef': 'error',
    
    // Prevent unused variables (except function arguments)
    'no-unused-vars': ['error', { 
      'vars': 'all',
      'args': 'after-used',
      'ignoreRestSiblings': false 
    }],
    
    // Prevent unreachable code
    'no-unreachable': 'error',
    
    // Require return statements in array method callbacks
    'array-callback-return': 'error',
    
    // ===== STYLISTIC RULES =====
    // Enforce consistent brace style
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    
    // Require space before function parentheses
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }],
    
    // Enforce consistent spacing inside object literal braces
    'object-curly-spacing': ['error', 'always'],
    
    // Enforce consistent spacing inside array brackets
    'array-bracket-spacing': ['error', 'never'],
    
    // ===== JSDOC DOCUMENTATION RULES =====
    // Require JSDoc comments for functions
    'jsdoc/require-description': 'warn',
    'jsdoc/require-param': 'warn',
    'jsdoc/require-returns': 'warn',
    'jsdoc/check-param-names': 'error',
    'jsdoc/check-types': 'error',
    
    // ===== NODE.JS SPECIFIC RULES =====
    // Prefer global Buffer instead of requiring it
    'node/prefer-global/buffer': 'error',
    
    // Prefer global console instead of requiring it
    'node/prefer-global/console': 'error',
    
    // Prefer global process instead of requiring it
    'node/prefer-global/process': 'error',
    
    // ===== PERFORMANCE RULES =====
    // Prevent inefficient regular expressions
    'no-regex-spaces': 'error',
    
    // Prevent unnecessary function binding
    'no-extra-bind': 'error',
    
    // Prevent unnecessary boolean casts
    'no-extra-boolean-cast': 'error'
  },

  // Override rules for specific file patterns
  overrides: [
    {
      // Configuration for test files
      files: ['**/*.test.js', '**/*.spec.js', '**/test/**/*.js'],
      env: {
        jest: true,
        mocha: true
      },
      rules: {
        // Allow console.log in test files for debugging
        'no-console': 'off',
        // Allow undefined variables in test files (test globals)
        'no-undef': 'off',
        // Relax JSDoc requirements for test files
        'jsdoc/require-description': 'off',
        'jsdoc/require-param': 'off',
        'jsdoc/require-returns': 'off'
      }
    },
    {
      // Configuration for configuration files
      files: ['**/*.config.js', '**/config/**/*.js', '.eslintrc.js'],
      rules: {
        // Allow console.log in configuration files
        'no-console': 'off',
        // Allow require() in configuration files
        'node/no-unpublished-require': 'off'
      }
    }
  ],

  // Settings for plugins
  settings: {
    // JSDoc settings
    jsdoc: {
      // Preferred tag names
      preferredTypes: {
        'object': 'Object',
        'array': 'Array',
        'function': 'Function'
      },
      // Tag name preference
      tagNamePreference: {
        'returns': 'return',
        'augments': 'extends'
      }
    },
    
    // Node.js settings
    node: {
      // Try to resolve imports using these extensions
      tryExtensions: ['.js', '.json', '.node'],
      // Convert path to be compatible with the target Node.js version
      convertPath: {
        'src/**/*.js': ['^src/(.+)$', 'lib/$1']
      }
    }
  },

  // Report unused disable directives
  reportUnusedDisableDirectives: true
};