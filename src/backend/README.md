# Node.js Tutorial App - Backend

This is the backend for the Node.js tutorial application, designed as an educational resource for developers learning Node.js and Express.js fundamentals. The application demonstrates core HTTP server capabilities through a simple HTTP endpoint implementation using modern Node.js development practices.

## Overview

The backend server is built with Node.js v22.16.0 LTS and Express.js 5.1.0, leveraging the latest stable technologies with long-term support. It implements a single-threaded event-driven architecture optimized for educational clarity while maintaining production-ready patterns.

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

# Dependencies installed:
# - express@^5.1.0 (Web application framework)
# - Additional dependencies as specified in package.json
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
```

Expected output — five lines from nodemon, then the same startup output `npm start` produces:

```
[nodemon] 3.1.14
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): **/*
[nodemon] watching extensions: js,json
[nodemon] starting `node server.js`
📊 Configuration loaded successfully:
   🚀 App Name: nodejs-tutorial-hello-world
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

Editing a watched file prints `[nodemon] restarting due to changes...` followed by the startup
lines again.

**Development Mode Features:**
- **Auto-reload**: nodemon restarts `node server.js` when a `.js` or `.json` file under
  `src/backend` changes (tests, `node_modules`, `coverage` and the lockfile are ignored)
- **Prefixed Logging**: because `NODE_ENV` is `development`, the logger prefixes its output with
  `[INFO]:` and `[ERROR]:`, and `config/index.js` prints the configuration summary above. The
  log content itself is identical in every environment
- **Error Reporting**: an error forwarded to the error handler is logged server-side with its
  `code` and class name when those are ones the middleware lists, the module name plus line and
  column of its top frames, and how many headers and parameters the request carried — never
  which ones, and never its message; the client receives the same generic 500 envelope in every
  environment

### Production Mode

Production mode runs the server using the standard `node` runtime without additional development tooling.

```bash
# Start production server
npm start

```

`npm start` runs `node server.js` with no watcher. With the committed `.env` in place
`NODE_ENV` is still `development`, so the output is the eleven lines shown for development mode
without the nodemon banner. Setting the environment explicitly changes the presentation:

```bash
NODE_ENV=production npm start
```

```
🚀 HTTP Server successfully started and listening on port 3000
🌐 Server is ready to accept HTTP requests
📍 Local development URL: http://localhost:3000
⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: production
🎯 Tutorial application initialized successfully
```

The configuration summary is not printed outside development, and the `[INFO]:` prefix is
dropped. The `Express 5.1.0` token is a fixed string in `server.js`; run `npm ls express` to see
the version actually installed.

**Production Mode Features:**
- **No Watcher**: the process is plain `node server.js`, so no file watching or restart logic runs
- **Unprefixed Logging**: the same two log levels, without the development prefixes
- **Error Handling**: generic 500 responses that disclose no error detail, message or stack, in
  every environment
- **No Extra Machinery**: this tutorial adds no clustering, caching, compression or metrics, so
  "production mode" means only the environment value and the presentation change described above

### Server Startup Verification

Once started, the server will be accessible at:
- **Local URL**: `http://localhost:3000`
- **Main Endpoint**: `http://localhost:3000/hello`

Expected startup time: < 5 seconds for optimal performance.

## API Documentation

### Hello World Endpoint

#### GET /hello

Returns a simple "Hello world" message demonstrating basic HTTP endpoint functionality.

**Request Details:**
- **Method**: GET
- **URL**: `/hello`
- **Headers**: No special headers required
- **Authentication**: None required
- **Query Parameters**: None supported

**Response Specification:**
- **Status Code**: 200 (OK)
- **Content-Type**: `text/html; charset=utf-8`
- **Response Body**: `Hello world`
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

Using the browser or Node.js `fetch` API:

```javascript
fetch('http://localhost:3000/hello')
  .then(response => response.text())
  .then(data => console.log(data));
```

**Expected Response:**
```
Hello world
```

**Error Responses:**

| Status Code | Condition | Response Format |
|-------------|-----------|-----------------|
| 404 | Route not found | Express default HTML error page |
| 500 | Server error | Generic error message |

## Project Structure

The backend follows a modular architecture with clear separation of concerns:

```
src/backend/
├── server.js              # Main entry point - HTTP server initialization
├── app.js                 # Express application configuration and middleware setup
├── routes/                # Route definitions and handlers
│   ├── index.js          # Route aggregator - mounts helloRouter at /hello
│   └── hello.js          # Hello endpoint implementation
├── middleware/            # Custom Express middleware
│   ├── errorHandler.js   # Centralized error handling middleware
│   └── requestLogger.js  # HTTP request logging middleware
├── config/                # Configuration management
│   └── index.js          # Environment-specific configuration
├── utils/                 # Utility functions and helpers
│   └── logger.js         # Two-level console logger (info, error)
├── tests/                 # Test suites
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
- **`routes/index.js`**: Route aggregator that mounts `helloRouter` at `/hello`, so `app.js` only has to mount this router at `/`
- **`routes/hello.js`**: Implementation of the `/hello` endpoint with proper error handling

**Middleware Components:**
- **`errorHandler.js`**: Centralized error handling using Express 5's enhanced promise support. Logs one diagnostic entry per forwarded error and answers the client with a generic 500 envelope. The entry records the shape of the request, not its content, and admits a value only by membership of a list written in the module rather than by its shape — a regular expression describes what a value looks like, and an opaque token can be made to look like anything. It records an entry **count** for the headers, query and route parameters (no name and no value from any of them), a route classification in place of the request target, the client address reduced to its network portion, the error's `code` when it is one of the codes the module lists, its class name when it is a built-in error, the stack reduced to at most five module names with their line and column, and the User-Agent as present or absent. The client address is the one value derived rather than selected: it is reduced to its network portion only after Node's own parser confirms it is an address, and omitted whole when it is not. The error's free-form message is never recorded
- **`requestLogger.js`**: Logs each request once on arrival, before routing: the method when HTTP defines it, a classification of the request target — the route asked for or `[unmatched]`, with `?[REDACTED]` appended when a query was present — and the body. The target is classified rather than logged because a secret needs no label and no query string to be in a URL, and capping one does not redact it. It never reads or writes the response, so there is no response, status-code or timing log

**Support Modules:**
- **`config/index.js`**: Environment-based configuration management
- **`utils/logger.js`**: A two-level wrapper over `console` — `info` writes to stdout and `error` to stderr. There are no other levels and no level filter, and the wrapper adds no timestamp of its own (the error diagnostic and the shutdown line each record one explicitly in what they log); `NODE_ENV=development` adds the `[INFO]:` and `[ERROR]:` prefixes

## Dependencies

### Production Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| [express](https://www.npmjs.com/package/express) | ^5.1.0 | Fast, unopinionated, minimalist web framework for Node.js | MIT |
| [dotenv](https://www.npmjs.com/package/dotenv) | ^16.3.1 | Loads the package-local `.env` file so `config/index.js` can read `PORT`, `NODE_ENV` and `HOST` | BSD-2-Clause |

**Express.js 5.1.0 Key Features:**
- **Promise Support**: Middleware can now return rejected promises, caught by the router as errors
- **Enhanced Security**: Updated to path-to-regexp@8.x, removing sub-expression regex patterns for security reasons
- **Node.js Compatibility**: Requires Node.js 18 or higher, optimized for v22 LTS
- **Performance Improvements**: Delivers key performance improvements and focuses on core stability

### Development Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| [jest](https://www.npmjs.com/package/jest) | 30.4.2 | Test runner for the unit and integration suites, and the coverage gate | MIT |
| [nodemon](https://www.npmjs.com/package/nodemon) | ^3.0.0 | Auto-restart development server on file changes | MIT |
| [supertest](https://www.npmjs.com/package/supertest) | 7.1.1 | HTTP assertions against the Express app and the exported server | MIT |

**Development Tools:**
- **`jest`**: Runs `npm test`, `npm run test:coverage` and `npm run test:watch`, and enforces the 90% coverage thresholds for `routes/` and `middleware/`
- **`nodemon`**: Automatically restarts the node application when file changes are detected
- **`supertest`**: Issues the HTTP requests the endpoint suites assert on
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
| `NODE_ENV` | `development` | Application environment. Selects the `[INFO]:`/`[ERROR]:` log prefixes and whether the configuration summary is printed | `production` |
| `PORT` | `3000` | HTTP server port | `8080` |
| `APP_NAME` | `node-tutorial-app` | Name shown in the configuration summary; startup fails if it is empty | `my-tutorial` |
| `HOST` | `localhost` | Host shown in the configuration summary | `0.0.0.0` |
| `ENABLE_LOGGING` | `true` | Set to `false` to suppress the configuration summary | `false` |

`AUTO_RESTART`, `TRUST_PROXY`, `JSON_LIMIT` and `URLENCODED_LIMIT` are also read into the
configuration object but no code consumes them yet. Every other variable in `.env` and
`.env.example` — including `LOG_LEVEL`, `SESSION_SECRET`, `RATE_LIMIT_*`,
`HEALTH_CHECK_ENDPOINT` and `METRICS_INTERVAL` — is a placeholder for a later tutorial and is
read by nothing. In particular there is **no** log-level setting: `logger.js` exposes `info` and
`error` in every environment and filters neither.

### Configuration Examples

```bash
# Development configuration (matches the committed .env)
export NODE_ENV=development
export PORT=3000

# Production configuration
export NODE_ENV=production
export PORT=8080
```

## Observability

### What Is Implemented

- **One log line per request**, written on arrival by `requestLogger` before routing:
  `[INFO]: HTTP Request - Method: GET Path: /hello Body: {}`. The path is a **classification**,
  not the target: the route that was asked for, or `[unmatched]`, plus `?[REDACTED]` when a query
  was present. A request for `/A3F9K2QXOPAQUE1234567890` is logged as `Path: [unmatched]`
- **One diagnostic entry per forwarded error**, written by `errorHandler`: an entry count for the
  headers, query and route parameters, the same route classification, a validated network-only
  client address (`[omitted]` when the value is not an address), the error's `code` when it is one
  the middleware lists, its class name when it is a built-in error, at most five stack frames
  reduced to a module name with its line and column, and the User-Agent recorded only as present
  (`[omitted]`) or absent. The error's own message is never logged, and no header, query or
  parameter name or value is
- **Five startup lines** and, in development only, a six-line configuration summary
- **Values that cannot grow**: every value the error diagnostic records is a member of a list
  written in the middleware, an integer, a fixed marker, or a validated address network of at most
  16 characters, so nothing needs truncating. The
  request logger truncates only the body and its serialization-failure reason at 200 characters,
  marked with `...[truncated]`; its method and path are drawn from fixed vocabularies

### What Is Not Implemented

No response or status-code logging, no request timing or duration, no request correlation IDs, no
`warn`/`debug` levels, no log-level filtering, no automatic timestamping, no memory or CPU
sampling, no metrics endpoint and no application health endpoint — the container, Compose and
Kubernetes health checks all call `GET /hello`. Adding any of these means adding code; none of
them can be switched on through configuration.

On timestamps specifically: the logger wrapper adds none, so request-arrival and startup lines
carry no time of their own. Two places record one explicitly in the text they log — the error
diagnostic's `timestamp` field and the shutdown line in `server.js` — so a timestamp appears where
that code put it, never because the logger supplied it.

The figures below are manual-measurement targets, not values the application reports:

| Metric | Target | How to measure it |
|--------|--------|------------------|
| Response Time | < 100ms | Time a request from the client, e.g. `time curl http://localhost:3000/hello` |
| Memory Usage | < 50MB | Inspect the process externally, e.g. `ps -o rss= -p <server pid>` |
| Errors | none expected | Read the console for `[ERROR]:` lines |

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Manual Testing

**Basic Functionality Test:**
```bash
# Test hello endpoint
curl -i http://localhost:3000/hello

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
# 
# Hello world
```

**Error Handling Test:**
```bash
# Test 404 response
curl -i http://localhost:3000/nonexistent

# Expected response:
# HTTP/1.1 404 Not Found
```

## Security Considerations

### Current Security Implementation

- **Input Validation**: Basic HTTP request validation
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
# Solution: Reinstall from the committed lockfile
rm -rf node_modules
npm ci
```

Keep `package-lock.json`: `npm ci` installs exactly the versions it records, which is what makes the install reproducible. Only regenerate the lockfile deliberately, after an intentional `package.json` change.

**Permission Denied:**
```bash
# Error: EACCES: permission denied
# Solution: Use different port or run with appropriate permissions
export PORT=8080
npm start
```

### Debugging

**Turn on the development log prefixes and the configuration summary:**
```bash
# NODE_ENV is the only variable that changes logging behaviour
export NODE_ENV=development
npm run dev
```

There is no debug level to raise: `logger.js` has `info` and `error` and nothing else, so the
volume of application logging is fixed. To see more than the one line per request that
`requestLogger` writes, use the inspector below or add a `logger.info` call where you need it.

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

**License**: This tutorial project is provided for educational purposes. Please refer to the project license file for usage terms.

**Last Updated**: December 2024 | **Node.js Version**: v22.16.0 LTS | **Express Version**: 5.1.0