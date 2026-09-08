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

- **[Node.js](https://nodejs.org/)**: v18.0.0 or higher — the floor declared by `engines.node` in `package.json` (**v22.16.0 LTS recommended**, the release this project is validated against)
  - Node.js v22 is an even-numbered release line and carries the LTS codename 'Jod'
  - The `>=18.0.0` floor is imposed by Express 5, not by any language feature this project uses
- **[npm](https://www.npmjs.com/)**: v8.0.0 or higher — the floor declared by `engines.npm` (**v11.4.1 or higher recommended**; npm comes bundled with Node.js)

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 50MB RAM (typical usage < 30MB)
- **Network**: Port 3000 available for HTTP server binding, or any free port supplied through the `PORT` environment variable
- **Node.js Compatibility**: Express 5.1.0 requires Node.js 18 or higher

### Version Verification

```bash
# Verify Node.js installation
node --version
# Expected output: v18.0.0 or higher (v22.16.0 recommended)

# Verify npm installation
npm --version
# Expected output: 8.0.0 or higher (11.4.1 or higher recommended)
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
# Install the exact dependency tree recorded in package-lock.json.
# This is the command CI runs, and it is the reproducible option.
npm ci

# Alternatively, resolve the declared ranges (may update the lock file)
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
```

Expected output — the versions resolved from `package-lock.json`:

```
nodejs-tutorial-app-backend@1.0.0 /path/to/src/backend
├── dotenv@16.6.1
├── express@5.1.0
├── jest@29.7.0
├── nodemon@3.1.14
└── supertest@7.1.1
```

`npm audit` should report `found 0 vulnerabilities`.

## Running the Application

The server can be run in two distinct modes optimized for different use cases:

### Development Mode (Recommended for Learning)

Development mode uses `nodemon` for automatic server restart when file changes are detected, enabling rapid development and testing cycles.

```bash
# Start development server with auto-reload
npm run dev
```

Expected output. `NODE_ENV` defaults to `development`, so both the configuration summary and the `[INFO]:` log prefixes are present:

```
[nodemon] 3.1.14
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): **/*
[nodemon] watching extensions: js,json
[nodemon] starting `node server.js`
📊 Configuration loaded successfully:
   🚀 App Name: node-tutorial-app
   🌐 Host: localhost
   📡 Port: 3000
   🔧 Environment: development
   📝 Logging: enabled
[INFO]: 🚀 HTTP Server successfully started and listening on port 3000
[INFO]: 🌐 Server is ready to accept HTTP requests
[INFO]: 📍 Local development URL: http://localhost:3000
[INFO]: ⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: development
[INFO]: 🎯 Tutorial application initialized successfully
```

The Node.js version in the last line is whatever `process.version` reports for the runtime you started, and `App Name` falls back to `node-tutorial-app` when no `.env` supplies `APP_NAME`.

**Development Mode Features:**
- **Auto-reload**: `nodemon` restarts `node server.js` whenever a watched `.js` or `.json` file changes; `tests/`, `node_modules/` and `package-lock.json` are ignored (see `nodemon.json`)
- **Request Logging**: `middleware/requestLogger.js` writes one record per request — `[INFO]: HTTP Request - Method: GET Path: /hello Body: {}`
- **Prefixed Log Levels**: `utils/logger.js` prefixes records with `[INFO]:` and `[ERROR]:` in development only
- **Configuration Summary**: `config/index.js` prints the resolved configuration at startup in development only

### Production Mode

Production mode runs the server using the standard `node` runtime without additional development tooling.

```bash
# Start production server
NODE_ENV=production npm start
```

Expected output. The environment, not the script, is what changes the logging: with `NODE_ENV=production` the configuration summary is suppressed and records carry no level prefix. A bare `npm start` with no `NODE_ENV` set produces the development output shown above.

```
🚀 HTTP Server successfully started and listening on port 3000
🌐 Server is ready to accept HTTP requests
📍 Local development URL: http://localhost:3000
⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: production
🎯 Tutorial application initialized successfully
```

**Production Mode Features:**
- **No Watcher Process**: runs `node server.js` directly, without `nodemon`
- **Unprefixed Logging**: `utils/logger.js` omits the `[INFO]:` and `[ERROR]:` prefixes outside development
- **Suppressed Configuration Summary**: `config/index.js` prints the startup summary in development only
- **Secure Error Responses**: `middleware/errorHandler.js` logs the failure server-side and returns a generic JSON envelope, disclosing no implementation detail
- **Resource Efficiency**: no build step, no watcher process, and a single static response path

### Server Startup Verification

Once started, the server listens at:
- **Base URL**: `http://localhost:3000` — the root path itself is not routed and answers `404`
- **Only Endpoint**: `http://localhost:3000/hello`

`/hello` is the single route this application declares. It is also the availability signal used by the container health check (`wget --spider`, which issues a `HEAD` request) and by the Kubernetes probes, so no separate probe route exists or is needed.

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
- **Query Parameters**: None supported

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

# Using JavaScript fetch
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
│   ├── index.js          # Route aggregator - mounts the hello router at /hello
│   └── hello.js          # Hello endpoint implementation (GET / inside that mount)
├── middleware/            # Custom Express middleware
│   ├── errorHandler.js   # Centralized error handling middleware
│   └── requestLogger.js  # HTTP request logging middleware
├── config/                # Configuration management
│   └── index.js          # Environment-specific configuration
├── utils/                 # Utility functions and helpers
│   └── logger.js         # Structured logging utility
├── tests/                 # Test suites executed by `npm test`
│   ├── unit/             # Unit tests
│   │   ├── hello.test.js         # Endpoint behaviour driven through Supertest
│   │   ├── errorHandler.test.js  # Error envelope and chain termination
│   │   └── requestLogger.test.js # Request body serialization branches
│   └── integration/      # Integration tests
│       └── hello.test.js         # Server lifecycle on an ephemeral port
├── .env.example           # Environment variable template
├── .eslintrc.js           # Codified lint rules (tooling not installed)
├── .prettierrc            # Codified formatting rules (tooling not installed)
├── jest.config.js         # Jest configuration and coverage thresholds
├── nodemon.json           # Watch configuration used by `npm run dev`
├── package.json           # Project metadata and dependency definitions
├── package-lock.json      # Dependency version lock file
└── README.md             # This documentation file
```

### Component Descriptions

**Core Application Files:**
- **`server.js`**: Main entry point that starts the HTTP server and binds to the configured port (3000 by default)
- **`app.js`**: Express application configuration, middleware registration, and route setup
- **`routes/index.js`**: Route aggregator that mounts the hello router at `/hello`, composing the public path
- **`routes/hello.js`**: Implementation of the `/hello` endpoint with proper error handling

**Middleware Components:**
- **`errorHandler.js`**: Centralized error handling using Express 5.1.0's enhanced promise support
- **`requestLogger.js`**: HTTP request logging — one record per request carrying the method, path and body

**Support Modules:**
- **`config/index.js`**: Environment-based configuration management, and the only reader of `process.env`
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
- **`jest`**: Runs every suite under `tests/` and enforces the coverage thresholds declared in `jest.config.js`
- **`nodemon`**: Automatically restarts the node application when file changes are detected
- **`supertest`**: Issues requests against the exported Express application without binding a public port
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

`config/index.js` is the only module that reads `process.env`, and every setting it reads has a literal fallback, so the application starts correctly with nothing configured. Copy `.env.example` to `.env` to override any of them locally.

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `NODE_ENV` | `development` | Application environment. `development` is what enables the startup configuration summary and the `[INFO]:` log prefixes | `production` |
| `PORT` | `3000` | HTTP server port. A non-numeric or zero value falls back to 3000, so `PORT=0` does **not** request an OS-assigned port | `8080` |
| `APP_NAME` | `node-tutorial-app` | Name reported in the startup configuration summary | `nodejs-tutorial-hello-world` |
| `HOST` | `localhost` | Recorded in configuration and printed at startup, but **not** passed to `server.listen()`. Node therefore binds every interface, which is what keeps a published container port reachable | `0.0.0.0` |
| `LOG_LEVEL` | `info` | Documented convention only — no module reads this variable, so setting it has no effect. `NODE_ENV` is what controls log formatting today | `debug` |

Setting `ENABLE_LOGGING=false` suppresses the development startup summary; it does not disable request logging.

### Configuration Examples

```bash
# Development configuration (these values are also the defaults)
export NODE_ENV=development
export PORT=3000

# Production configuration
export NODE_ENV=production
export PORT=8080
```

## Performance Monitoring

### Built-in Observability

The observability this application implements is one log record per request, written by `middleware/requestLogger.js`, plus an `[ERROR]:` record whenever a handler throws. There is no metrics endpoint, no timing instrumentation and no memory reporting anywhere in the code:

```
[INFO]: HTTP Request - Method: GET Path: /hello Body: {}
```

Response time is therefore measured from outside the process. `curl` reports it directly:

```bash
# Total time for a single request
curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/hello

# Ten sequential requests
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/hello
done
```

Measured against a locally running server, `GET /hello` typically completes in under a millisecond, and comfortably inside the 100ms budget in any case.

### Performance Metrics

| Metric | Target | How to observe it |
|--------|--------|-------------------|
| Response Time | < 100ms | `curl -w "%{time_total}"`, as above |
| Memory Usage | < 50MB | Operating system process tools (`ps`, Activity Monitor, Task Manager) |
| Error Rate | < 0.1% | `[ERROR]:` records written to stderr by `utils/logger.js` |
| Availability | `GET /hello` answers 200 | `curl -i http://localhost:3000/hello` — the same signal the container check and the Kubernetes probes use |

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

- **No User Input**: the endpoint accepts no path parameters, query string or body, so there is no application input to validate
- **Fingerprint Suppression**: `app.disable('x-powered-by')` keeps the `X-Powered-By` header off every response — the only response-header control this application applies
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
# Solution: reinstall from the committed lock file
rm -rf node_modules
npm ci
```

Do not delete `package-lock.json` to fix an install problem. `npm ci` reinstalls exactly the tree the lock file records — the same tree that CI and the container image install.

**Permission Denied:**
```bash
# Error: EACCES: permission denied
# Solution: Use different port or run with appropriate permissions
export PORT=8080
npm start
```

### Debugging

**Enable Verbose Logging:**
```bash
# NODE_ENV=development is what adds the [INFO]: / [ERROR]: prefixes
# and prints the startup configuration summary
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
- **CommonJS Modules**: `require`/`module.exports` throughout — `.eslintrc.js` sets `sourceType: 'script'` and `package.json` declares no `"type": "module"`
- **Async/Await**: Prefer promises over callbacks
- **Error Handling**: Implement comprehensive error management
- **Documentation**: Comment complex logic and public APIs
- **Testing**: Include tests for new functionality

`.eslintrc.js` and `.prettierrc` codify that style concretely — two-space indentation, single quotes, mandatory semicolons and an 80-column print width. Neither ESLint nor Prettier is declared as a dependency and there is no `lint` or `format` script, so the standard is documented rather than machine-enforced. Match it by hand, or invoke either tool through `npx` if you want a check.

## Deployment

### Local Development Deployment

```bash
# Standard development deployment
npm run dev
```

### Production Deployment (Future Consideration)

For production deployment, consider:

**Containerization:**

The repository already ships a multi-stage production image definition at `infrastructure/docker/Dockerfile`. Its build context is the repository root, so build it from there:

```bash
docker build -t nodejs-tutorial-app -f infrastructure/docker/Dockerfile .
docker run -p 3000:3000 nodejs-tutorial-app
```

The essential shape of that image, for reference:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY src/backend/package.json src/backend/package-lock.json ./
RUN npm ci --omit=dev
COPY src/backend/ ./
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
4. **Testing**: Extend the existing unit and integration suites to cover whatever you add
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

**Node.js Version**: v22.16.0 LTS | **Express Version**: 5.1.0
