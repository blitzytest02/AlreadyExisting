# Node.js Tutorial App - Backend

This is the backend for the Node.js tutorial application, designed as an educational resource for developers learning Node.js and Express.js fundamentals. The application demonstrates core HTTP server capabilities through a simple HTTP endpoint implementation using modern Node.js development practices.

## Overview

The backend server is built on Node.js v22.16.0 LTS and Express.js 5.1.0. It implements a single-threaded event-driven architecture optimized for educational clarity while maintaining production-ready patterns.

### Educational Objectives

- **HTTP Server Concepts**: Understanding fundamental web server operations
- **Express.js Framework**: Learning modern web application framework patterns  
- **Request/Response Cycle**: Grasping HTTP request processing and response generation
- **Node.js Runtime**: Exploring server-side JavaScript execution environment
- **Modern JavaScript**: Utilizing ES2022+ features and async/await patterns

### Key Features

- **Single `/hello` Endpoint**: Returns a simple "Hello world" message
- **Event-Driven Architecture**: Leverages Node.js single-threaded event loop design
- **Promise-Based Error Handling**: Modern error management using Express 5.1.0 features
- **Educational Structure**: Clear, maintainable code with extensive documentation
- **Production Patterns**: Demonstrates scalable architecture principles

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **[Node.js](https://nodejs.org/)**: v22.16.0 LTS or higher (**v22.16.0 LTS recommended**)
  - Node.js v22 officially transitioned into Long Term Support (LTS) with codename 'Jod'
  - Production applications should only use Active LTS or Maintenance LTS releases
  - Includes critical updates and security support for years to come
- **[npm](https://www.npmjs.com/)**: v11.4.1 or higher (comes bundled with Node.js)
  - Latest npm version provides enhanced security and performance features

### Optional Tooling

Every command in this document runs with only Node.js and npm installed, except where it names one of these:

- **[Git](https://git-scm.com/)**: cloning the repository, and `npm run test:watch`, which Jest refuses to run outside a Git working copy
- **[curl](https://curl.se/)**, **[wget](https://www.gnu.org/software/wget/)** or **[HTTPie](https://httpie.io/)**: any one of them verifies the endpoint — a browser or Node's global `fetch` works equally well
- **[Docker](https://www.docker.com/)**: only for the containerization notes under Deployment

### Shell Assumptions

The shell commands here are written for a POSIX shell such as bash or zsh: `export NAME=value` and `rm -rf` are POSIX syntax. On Windows, run them under WSL or Git Bash, or use the PowerShell equivalents — `$env:NAME = 'value'` to set an environment variable and `Remove-Item -Recurse -Force` for a recursive delete.

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 50MB RAM (typical usage < 30MB)
- **Network**: Port 3000 available for HTTP server binding
- **Node.js Compatibility**: Express 5.0 requires Node.js 18 or higher

### Version Verification

```bash
# Verify Node.js installation
node --version
# Expected output: v22.16.0 or higher

# Verify npm installation  
npm --version
# Expected output: 11.4.1 or higher
```

## Installation

### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the backend directory
cd src/backend
```

### 2. Dependency Installation

```bash
# Install production dependencies
npm install

# Runtime dependencies installed:
# - express@5.1.0 (Web application framework, pinned to an exact version)
# - dotenv@^16.3.1 (Loads .env into process.env for config/index.js)
#
# Both commands also install the development dependencies
# (jest, nodemon, supertest). Add --omit=dev for a production-only
# tree, which is what the container image installs.
```

### 3. Installation Verification

```bash
# Verify installation success
npm list --depth=0
# Should show installed packages without errors
```

## Running the Application

The server can be run in two distinct modes optimized for different use cases:

### Development Mode (Recommended for Learning)

Development mode uses `nodemon` for automatic server restart when file changes are detected, enabling rapid development and testing cycles.

```bash
# Start development server with auto-reload
npm run dev

# Expected output:
# Server starting...
# Server listening on port 3000
# Development mode: Auto-reload enabled
```

**Development Mode Features:**
- **Auto-reload**: Automatically restarts server on file changes
- **Enhanced Logging**: Detailed request/response logging for debugging
- **Error Reporting**: Comprehensive error messages for development
- **Performance Monitoring**: Basic timing and memory usage reporting

### Production Mode

Production mode runs the server using the standard `node` runtime without additional development tooling.

```bash
# Start production server
npm start

# Expected output:
# Server starting...
# Server listening on port 3000
# Production mode: Optimized for performance
```

**Production Mode Features:**
- **Optimized Performance**: Minimal overhead for maximum throughput
- **Standard Logging**: Essential logging without development verbosity
- **Error Handling**: Secure error responses without sensitive information disclosure
- **Resource Efficiency**: Minimal memory footprint and CPU usage

### Server Startup Verification

Once started, the server listens at:
- **Base URL**: `http://localhost:3000` — the root path itself is not routed and answers `404`
- **Only Endpoint**: `http://localhost:3000/hello`

`/hello` is the single route this application declares. It is also the availability signal used by the container health check (a bounded `node` `http.request` probe that issues a `HEAD` request) and by the Kubernetes probes, so no separate probe route exists or is needed.

Expected startup time: < 5 seconds for optimal performance.

## API Documentation

### Hello World Endpoint

#### GET /hello

Returns a simple "Hello world" message demonstrating basic HTTP endpoint functionality. The public path is composed by two declarations: `routes/index.js` mounts the hello router at `/hello`, and `routes/hello.js` declares `GET /` inside that router. There is no `/api` prefix anywhere in this application.

**Request Details:**
- **Declared Method**: `GET` — the only route this application declares
- **Derived Methods**: Express derives `HEAD` and `OPTIONS` from that single `GET` declaration, so both are served. `HEAD /hello` returns `200` with the same headers and no body; `OPTIONS /hello` returns `200` with `Allow: GET, HEAD`
- **URL**: `/hello`
- **Headers**: No special headers required
- **Authentication**: None required
- **Query Parameters**: None used — the matcher accepts a query string and the handler ignores it

**Response Specification:**
- **Status Code**: 200 (OK)
- **Content-Type**: `text/html; charset=utf-8` — `res.send()` derives this from the string body
- **Content-Length**: `11`
- **Response Body**: `Hello world` (exactly 11 bytes, with no trailing newline)
- **`X-Powered-By`**: not sent, because `app.js` calls `app.disable('x-powered-by')`
- **Response Time**: Target < 100ms (95th percentile)

**Example Requests:**

```bash
# Using curl
curl http://localhost:3000/hello

# Using wget
wget -qO- http://localhost:3000/hello

# Using HTTPie
http GET localhost:3000/hello
```

From JavaScript — a browser console, or Node's global `fetch`:

```javascript
fetch('http://localhost:3000/hello')
  .then(response => response.text())
  .then(data => console.log(data));
```

**Expected Response:**
```
Hello world
```

**Method and Path Matrix:**

Express's default matcher is case-insensitive and non-strict, and neither option is overridden, so the measured behaviour is:

| Request | Status | Notes |
|---------|--------|-------|
| `GET /hello` | 200 | Body `Hello world` |
| `HEAD /hello` | 200 | Same headers as `GET`, empty body |
| `OPTIONS /hello` | 200 | `Allow: GET, HEAD` |
| `POST` / `PUT` / `DELETE` / `PATCH` on `/hello` | 404 | Method is not routed |
| `GET /HELLO` | 200 | Case-insensitive path matching |
| `GET /hello/` | 200 | Trailing slash ignored |
| `GET /nonexistent` | 404 | No matching route |

**Error Responses:**

| Status Code | Condition | Response Format |
|-------------|-----------|-----------------|
| 404 | Path or method not routed | Express default HTML page, e.g. `<pre>Cannot POST /hello</pre>` |
| 500 | Unhandled server error | JSON envelope `{ error, status, timestamp, path }` produced by `middleware/errorHandler.js` |

The 404 comes from Express's own default handler, which is why its body is HTML rather than JSON. The JSON envelope belongs to `middleware/errorHandler.js`, registered as the terminal middleware in `app.js`; no route in this application throws, so the 500 path is a safeguard for future handlers rather than an exercised one.

## Project Structure

The backend follows a modular architecture with clear separation of concerns:

```
src/backend/
├── server.js              # Main entry point - HTTP server initialization
├── app.js                 # Express application configuration and middleware setup
├── routes/                # Route definitions and handlers
│   └── hello.js          # Hello endpoint implementation
├── middleware/            # Custom Express middleware
│   ├── errorHandler.js   # Centralized error handling middleware
│   └── requestLogger.js  # HTTP request logging middleware
├── config/                # Configuration management
│   └── index.js          # Environment-specific configuration
├── utils/                 # Utility functions and helpers
│   └── logger.js         # Console info/error logging utility
├── tests/                 # Test suites executed by `npm test`
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── package.json           # Project metadata and dependency definitions
├── package-lock.json      # Dependency version lock file
└── README.md             # This documentation file
```

### Component Descriptions

**Core Application Files:**
- **`server.js`**: Main entry point that starts the HTTP server and binds to port 3000
- **`app.js`**: Express application configuration, middleware registration, and route setup
- **`routes/hello.js`**: Implementation of the `/hello` endpoint with proper error handling

**Middleware Components:**
- **`errorHandler.js`**: Centralized error handling using Express 5.1.0's enhanced promise support
- **`requestLogger.js`**: HTTP request/response logging for monitoring and debugging

**Support Modules:**
- **`config/index.js`**: Environment-based configuration management
- **`utils/logger.js`**: `info` and `error` helpers over `console.log`/`console.error`, prefixed with the severity in development

## Dependencies

### Production Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| [express](https://www.npmjs.com/package/express) | 5.1.0 | Fast, unopinionated, minimalist web framework for Node.js | MIT |
| [dotenv](https://www.npmjs.com/package/dotenv) | ^16.3.1 | Loads variables from `.env` into `process.env`; required once by `config/index.js` | BSD-2-Clause |

`express` is declared as an exact version rather than a caret range, so a fresh install resolves the same 5.1.0 that this document, the startup log line and the container image labels all name.

**Express.js 5.1.0 Key Features:**
- **Promise Support**: Middleware can now return rejected promises, caught by the router as errors
- **Enhanced Security**: Updated to path-to-regexp@8.x, removing sub-expression regex patterns for security reasons
- **Node.js Compatibility**: Requires Node.js 18 or higher, optimized for v22 LTS
- **Performance Improvements**: Delivers key performance improvements and focuses on core stability

### Development Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| [jest](https://www.npmjs.com/package/jest) | ^29.7.0 | Test runner and coverage reporter, configured by `jest.config.js` | MIT |
| [nodemon](https://www.npmjs.com/package/nodemon) | ^3.0.0 | Auto-restart development server on file changes | MIT |
| [supertest](https://www.npmjs.com/package/supertest) | 7.1.1 | Drives HTTP assertions against the Express app in-process | MIT |

`jest` is held on the 29.x line deliberately, and 29.7.0 is not the newest release available. The current major, `jest@30`, publishes an engine range that excludes Node 18.0–18.13, 19, 21 and 23 — every one of which this package's `engines.node` floor of `>=18.0.0` admits — whereas `jest@29.7.0`'s range contains that floor exactly. The 29.x line is the compatible choice, not the latest one.

**Development Tools:**
- **`nodemon`**: Automatically restarts the node application when file changes are detected
- **Built-in Node.js tools**: Debugging with `--inspect` flag, performance profiling

## Architecture Overview

### System Architecture

The application implements a **Single-Threaded Event-Driven Architecture** leveraging Node.js's event loop design:

```
HTTP Client → HTTP Server → Express Application → Route Handler → Response
     ↑                                                              ↓
     └─────────────── HTTP Response ←─────────────────────────────┘
```

**Architectural Principles:**
- **Event-Driven Processing**: Non-blocking I/O operations using Node.js event loop
- **Stateless Design**: No persistent state management, enabling horizontal scaling
- **Modular Structure**: Clear separation between HTTP handling, routing, and business logic
- **Promise-Based Flow**: Modern asynchronous programming patterns

### Request Processing Flow

1. **Request Reception**: HTTP server accepts incoming connection
2. **Express Processing**: Request routed through middleware stack  
3. **Route Matching**: URL pattern matched against registered routes
4. **Handler Execution**: Business logic executed for matched route
5. **Response Generation**: HTTP response formatted and sent to client

**Performance Characteristics:**
- **Response Time**: Target < 100ms for `/hello` endpoint
- **Memory Usage**: < 50MB typical operation
- **Startup Time**: < 5 seconds for application initialization
- **Throughput**: Capable of 1000+ requests/second under optimal conditions

## Configuration

### Environment Variables

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `NODE_ENV` | `development` | Application environment | `production` |
| `PORT` | `3000` | HTTP server port | `8080` |
| `LOG_LEVEL` | — (unread) | Documented convention only; no module reads this variable, so setting it has no effect. `NODE_ENV` is what controls log formatting | `debug` |

### Configuration Examples

```bash
# Development configuration
export NODE_ENV=development
export PORT=3000

# Production configuration  
export NODE_ENV=production
export PORT=8080
```

## Performance Monitoring

### Built-in Monitoring

The monitoring this application implements is one log record per request, written by `middleware/requestLogger.js`, plus an `[ERROR]:` record whenever a handler throws. There is no metrics endpoint and no health route — `GET /hello` itself is the availability signal used by the container health check and the Kubernetes probes.

### Performance Metrics

| Metric | Target | Monitoring Method |
|--------|--------|------------------|
| Response Time | < 100ms | Built-in timing |
| Memory Usage | < 50MB | Process monitoring |
| Error Rate | < 0.1% | Error logging |
| Uptime | > 99.9% | Health checks |

## Testing

### Running Tests

```bash
# Run all tests (coverage is collected on every run)
npm test

# Run all tests and write the lcov/HTML coverage report
npm run test:coverage

# Re-run affected tests as files change (interactive; needs a Git working copy)
npm run test:watch
```

`npm test` invokes Jest, which discovers `tests/unit/**/*.test.js` and `tests/integration/**/*.test.js`. Four suites and eleven cases run:

```
Test Suites: 4 passed, 4 total
Tests:       11 passed, 11 total
```

`jest.config.js` sets `collectCoverage: true`, so coverage is measured on every run rather than only under `test:coverage`, and the global thresholds of 90% for branches, functions, lines and statements are part of what `npm test` has to satisfy. Instrumentation covers `middleware/**/*.js` and `routes/**/*.js`, which currently report 100% on all four metrics.

### Manual Testing

**Basic Functionality Test:**
```bash
# Test hello endpoint
curl -i http://localhost:3000/hello

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
# Content-Length: 11
#
# Hello world
```

**Error Handling Test:**
```bash
# Test the 404 for an unrouted path
curl -i http://localhost:3000/nonexistent

# Expected response:
# HTTP/1.1 404 Not Found
# Content-Type: text/html; charset=utf-8
# ...HTML body containing: Cannot GET /nonexistent

# Test the 404 for an unrouted method on an existing path
curl -i -X POST http://localhost:3000/hello

# Expected response:
# HTTP/1.1 404 Not Found
# ...HTML body containing: Cannot POST /hello
```

## Security Considerations

### Current Security Implementation

- **No Consumed Input**: the hello handler reads no path parameters, query values or request body and returns a constant response, so no request data is reflected back. Requests can still carry a query string, headers and a body — Express matches `/hello?anything` and exposes `req.query`, and `middleware/requestLogger.js` records the request's original URL — so treat request data as untrusted in any handler you add
- **Error Handling**: Secure error responses without information disclosure
- **Dependencies**: Regular security updates using `npm audit`
- **Transport**: HTTP only (suitable for local development)

### Security Best Practices

```bash
# Check for security vulnerabilities
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# Review security advisories
npm audit --audit-level=moderate
```

### Future Security Enhancements

For production deployments, consider implementing:
- **HTTPS Transport**: TLS encryption for data in transit
- **Authentication**: JWT or session-based authentication
- **Rate Limiting**: Request throttling to prevent abuse
- **Security Headers**: CORS, CSP, and other protective headers

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Error: EADDRINUSE: address already in use :::3000
# Solution: Change port or kill existing process
export PORT=3001
npm start
```

**Module Not Found:**
```bash
# Error: Cannot find module 'express'
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Permission Denied:**
```bash
# Error: EACCES: permission denied
# Solution: Use different port or run with appropriate permissions
export PORT=8080
npm start
```

### Debugging

**Enable Debug Logging:**
```bash
# Set debug environment
export NODE_ENV=development
npm run dev
```

**Node.js Inspector:**
```bash
# Start with debugging enabled
node --inspect server.js
# Open chrome://inspect in browser
```

## Contributing

### Development Setup

1. **Fork and Clone**: Create your own fork of the repository
2. **Install Dependencies**: Run `npm install` in the backend directory
3. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
4. **Make Changes**: Implement your improvements
5. **Test Changes**: Ensure all tests pass and functionality works
6. **Submit Pull Request**: Create PR with clear description

### Code Style Guidelines

- **ES2022+ Syntax**: Use modern JavaScript features
- **Async/Await**: Prefer promises over callbacks
- **Error Handling**: Implement comprehensive error management
- **Documentation**: Comment complex logic and public APIs
- **Testing**: Include tests for new functionality

## Deployment

### Local Development Deployment

```bash
# Standard development deployment
npm run dev
```

### Production Deployment (Future Consideration)

For production deployment, consider:

**Containerization:**

The repository ships its own image definition at `infrastructure/docker/Dockerfile`: a two-stage build on `node:22-alpine` that installs into `/usr/src/app`, copies the manifests from the builder stage, runs as a non-root user and declares a `HEALTHCHECK` against `/hello`. The snippet below is a deliberately simplified single-stage illustration of the pattern, not an excerpt of that file:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**Process Management:**
```bash
# Using PM2 for production
npm install -g pm2
pm2 start server.js --name "hello-api"
```

## Learning Resources

### Next Steps for Learners

1. **Extend Functionality**: Add more endpoints and HTTP methods
2. **Database Integration**: Connect to PostgreSQL or MongoDB
3. **Authentication**: Implement JWT-based authentication
4. **Testing**: Add comprehensive unit and integration tests
5. **Monitoring**: Integrate with monitoring solutions like Prometheus

### Recommended Reading

- **[Node.js Official Documentation](https://nodejs.org/docs/)**
- **[Express.js Guide](https://expressjs.com/)**
- **[npm Package Management](https://docs.npmjs.com/)**
- **[JavaScript ES2022+ Features](https://developer.mozilla.org/en-US/docs/Web/JavaScript)**

## Support and Feedback

For questions, issues, or contributions:

1. **Check Documentation**: Review this README and inline code comments
2. **Search Issues**: Look for existing solutions in project issues
3. **Create Issue**: Submit detailed bug reports or feature requests
4. **Community Support**: Engage with the Node.js and Express.js communities

---

**License**: ISC, as declared by the `license` field in `src/backend/package.json`. This tutorial project is provided for educational purposes.

**Last Updated**: December 2024 | **Node.js Version**: v22.16.0 LTS | **Express Version**: 5.1.0