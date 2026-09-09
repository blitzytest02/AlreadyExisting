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

- **[Git](https://git-scm.com/)**: cloning the repository, and `npm run test:watch`, which Jest refuses to run outside a Git working copy — Git is also what `--watch` consults to decide which suites to re-run
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
# Clone the repository. Replace the value below with the clone URL your Git
# host shows for this repository, and REPOSITORY on the first cd line with
# the directory git creates. The single quotes keep every character of the
# URL literal, and quoting the expansion passes it to git intact.
REPOSITORY_URL='https://github.com/OWNER/REPOSITORY.git'
git clone "$REPOSITORY_URL"

# Enter the clone, then the backend package directory
cd REPOSITORY
cd src/backend
```

`git clone` names the new directory after the last path segment of the URL with any `.git` suffix removed, so the URL above produces a directory called `REPOSITORY`. Pass a second argument — `git clone "$REPOSITORY_URL" my-directory` — to choose the name yourself, and `cd` into that instead.

### 2. Dependency Installation

```bash
# Install dependencies
npm ci
```

`npm ci` installs exactly the tree recorded in `package-lock.json`, which makes every install of this project resolve the same versions with the same integrity digests; it is also the command `.github/workflows/ci.yml` runs. `npm install` is the alternative: it resolves the ranges declared in `package.json` instead and may rewrite `package-lock.json` while doing so, which is what you want when you are deliberately changing a dependency and not what you want when you are setting the project up.

Either command installs the full tree — runtime and development dependencies together:

- **Runtime**: express@5.1.0 (Web application framework, pinned to an exact version) and dotenv@^16.3.1 (Loads .env into process.env for `config/index.js`)
- **Development**: jest, nodemon and supertest

A production-only tree is a separate command, and it belongs in its own step rather than after the one above:

```bash
# Production-only tree: what the container image installs
npm ci --omit=dev
```

That is the right tree inside the image and the wrong one on your machine: it omits Jest, so `npm test` cannot run. Use it only when you are deliberately building a runtime-only tree, and run `npm ci` again to get the test tooling back.

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

npm echoes the script it is about to run, `nodemon` prints its own preamble, and then `node server.js` takes over and prints the configuration summary followed by five startup lines:

```text
> nodejs-tutorial-app-backend@1.0.0 dev
> nodemon server.js

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

That block is a capture from a default environment: no `.env` file on disk and none of the variables below set. Several of its values come from your environment rather than from the source, so yours may legitimately differ:

- **`[nodemon] 3.1.14`** — the `nodemon` release actually installed. `npm ci` reproduces the version pinned in `package-lock.json`, which is where 3.1.14 comes from; `npm install` may resolve a newer 3.x, because the manifest declares the range `^3.0.0`.
- **`Node.js v22.16.0`** — `process.version` for the runtime you launched, interpolated by `server.js`. The block shows the v22.16.0 LTS this document recommends; a different Node build prints its own version here. The `Express 5.1.0` on that same line is a literal in the log statement and does not vary.
- **`App Name`, `Host`, `Port` and `Environment`** — `config/index.js` reads `APP_NAME`, `HOST`, `PORT` and `NODE_ENV`, falling back to `node-tutorial-app`, `localhost`, `3000` and `development`. Setting any of them changes the matching summary line, and `PORT` also changes every other appearance of `3000` in the block.
- **Whether the configuration summary appears at all** — `config/index.js` prints those six lines only when two conditions hold together: the environment is `development`, and `ENABLE_LOGGING` is not `false`. Set `ENABLE_LOGGING=false` and the summary disappears while the `[INFO]:` startup lines below it continue unchanged.

Each request served after startup adds one `HTTP Request` line, written by `middleware/requestLogger.js`.

**Development Mode Features:**
- **Auto-reload**: Automatically restarts server on file changes
- **Enhanced Logging**: One `HTTP Request` record per request — method, path and serialised body, written by `middleware/requestLogger.js` — carrying the `[INFO]:` prefix that `utils/logger.js` adds in development. Responses are not logged
- **Error Reporting**: Comprehensive error messages for development

### Production Mode

Production mode runs the server using the standard `node` runtime without additional development tooling.

```bash
# Start production server
npm start
```

`npm start` selects the **runtime** — plain `node`, with no file watcher — and not the **environment**. It leaves `NODE_ENV` unset, and `config/index.js` defaults that to `development`, so a bare `npm start` still prints the configuration summary and the `[INFO]:` prefixes shown in the development block above, under this "Production Mode" heading. What it drops is nodemon: the preamble is gone, and npm echoes `start` and `node server.js` in place of `dev` and `nodemon server.js`. Selecting the production environment is a separate step, and it is done on the command line:

```bash
# Start production server with the production environment selected
NODE_ENV=production npm start
```

```text
> nodejs-tutorial-app-backend@1.0.0 start
> node server.js

🚀 HTTP Server successfully started and listening on port 3000
🌐 Server is ready to accept HTTP requests
📍 Local development URL: http://localhost:3000
⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: production
🎯 Tutorial application initialized successfully
```

Both differences from the development output are driven by `NODE_ENV` alone: `config/index.js` prints its configuration summary only when the environment is `development`, and `utils/logger.js` adds the `[INFO]:` and `[ERROR]:` prefixes only when `config.nodeEnv === 'development'`. Of the varying values described above, only two appear in this block — the Node version and the port. Nodemon is not involved, and the summary that would have carried `App Name` and `Host` is suppressed here by the environment itself.

**Production Mode Features:**
- **Optimized Performance**: Minimal overhead for maximum throughput
- **Standard Logging**: Essential logging without development verbosity
- **Error Handling**: Secure error responses without sensitive information disclosure
- **Resource Efficiency**: Minimal memory footprint and CPU usage

### Server Startup Verification

Once started, the server listens at:
- **Base URL**: `http://localhost:3000` — the root path itself is not routed and answers `404`
- **Only Endpoint**: `http://localhost:3000/hello`

`/hello` is the single route this application declares. It is also the availability signal used by the container health check — `infrastructure/docker/Dockerfile` declares `HEALTHCHECK … CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/hello`, and `wget --spider` issues a `GET` — and by the Kubernetes probes, so no separate probe route exists or is needed.

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
- **`requestLogger.js`**: HTTP request logging — method, path and serialised body, one record per request — for monitoring and debugging; it observes requests only and logs nothing about the response

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
| Response Time | < 100ms | Not measured by this application — time a request from the client instead |
| Memory Usage | < 50MB | Not measured by this application |
| Error Rate | < 0.1% | The error record `middleware/errorHandler.js` writes through `utils/logger.js` when a handler throws — `[ERROR]:`-prefixed in development |
| Uptime | > 99.9% | Not measured by this application — the container health check and the Kubernetes probes poll `GET /hello`, and nothing here aggregates the result |

## Testing

### Running Tests

```bash
# Run all tests (coverage is collected on every run)
npm test

# Run all tests and write the lcov/HTML coverage report
npm run test:coverage

# Re-run affected tests as files change (interactive; needs a Git working copy)
# On a clean checkout it runs nothing until a tracked file changes; see below
npm run test:watch
```

`npm test` invokes Jest, which discovers `tests/unit/**/*.test.js` and `tests/integration/**/*.test.js`. Four suites and eleven cases run:

```
Test Suites: 4 passed, 4 total
Tests:       11 passed, 11 total
```

`jest.config.js` sets `collectCoverage: true`, so coverage is measured on every run rather than only under `test:coverage`, and the global thresholds of 90% for branches, functions, lines and statements are part of what `npm test` has to satisfy. Instrumentation covers `middleware/**/*.js` and `routes/**/*.js`, which currently report 100% on all four metrics.

`npm run test:watch` runs nothing on a clean checkout — with no tracked file changed since the last commit it prints `No tests found related to files changed since last commit.` and keeps watching — so press `a` at its `Watch Usage` menu or run `npm test -- --watchAll` to run every suite immediately; `docs/setup/development.md` §7.3 is the canonical watch-mode procedure.

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
- **Error Handling**: Secure error responses without information disclosure — the 500 envelope carries a generic message, never the error text or a stack trace. The server-side log record is held to the same standard: `middleware/errorHandler.js` passes request header values through an allow-list (`host`, `user-agent`, `accept`, `content-type`, `content-length`), recording every other header's name with the literal `[REDACTED]` in place of its value, and records the stack trace only when `NODE_ENV` is `development`, so no credential-bearing header value and no absolute host filesystem path is written to a production log
- **Dependencies**: Regular security updates using `npm audit`
- **Transport**: HTTP only (suitable for local development)

### Security Best Practices

```bash
# Check for security vulnerabilities
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# Review the advisories exactly as CI does: .github/workflows/ci.yml runs the
# audit step bare, applying no --audit-level, so an advisory at any severity -
# low included - fails the job. Reviewing under a threshold locally would hide
# findings that the pipeline still rejects.
npm audit
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
# Error: startup fails with "Port 3000 is already in use" and the process
# exits; server.js reports the underlying EADDRINUSE bind failure this way.
# Cause: another process is already listening on port 3000.
# Solution: start this server on a free port instead. The commands below
# move only this server; whatever holds port 3000 keeps running untouched.
export PORT=3001
npm start
```

**Module Not Found:**
```bash
# Error: Cannot find module 'express'
# Cause: the installed node_modules tree is missing or incomplete.
# Solution: delete only the installed tree, then reinstall from the lock file.
# package-lock.json is the audited dependency graph — the reviewed versions
# and their integrity digests — and it is deliberately NOT deleted here:
# npm ci requires it, and deleting it would resolve a fresh, unreviewed graph.
rm -rf node_modules
npm ci
```

Regenerating `package-lock.json` is a separate, deliberate act that belongs with an intentional change to `package.json`, and it is followed by re-running `npm audit` and `npm test` so the new graph is reviewed before it is relied on. It is never part of recovering from a missing module.

**Permission Denied:**
```bash
# Error: EACCES: permission denied
# Cause: ports below 1024 are privileged, and binding one needs privileges
# this server neither has nor needs.
# Solution: choose a port at or above 1024.
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

The repository ships its own image definition at `infrastructure/docker/Dockerfile`, and that tracked file is the one to build — there is no simplified variant to copy from here. It is a two-stage build on `node:22-alpine` that installs into `/usr/src/app`. The builder stage reads `package.json` and `package-lock.json` from `src/backend/` and installs the full tree with `npm ci --include=dev`. The runtime stage installs a production-only tree with `npm ci --omit=dev` and then takes the application sources from the filtered build context rather than from the builder, so the builder's development dependencies never reach the image. The container runs as a non-root user with UID 1001, declares a `HEALTHCHECK` that probes `/hello` with `wget --spider` — which issues a `GET`, not a `HEAD` — and starts with `CMD ["npm", "start"]`.

Build and run it from the repository root:

```bash
# Build the image. Run this from the repository ROOT, not from src/backend.
docker build -t nodejs-tutorial-app -f infrastructure/docker/Dockerfile .

# Run the image. This holds the terminal until you stop it with Ctrl-C.
docker run --rm -p 3000:3000 nodejs-tutorial-app
```

Then, from a second terminal, verify the endpoint:

```bash
curl http://localhost:3000/hello
```

The trailing `.` is the build context, and it has to be the repository root. The Dockerfile reads the dependency manifests from `src/backend/`, a path that resolves only against the root. More importantly, Docker looks for the ignore file at `<context>/.dockerignore` — not in the directory the Dockerfile happens to sit in — so the repository-root `.dockerignore` is what keeps every `node_modules` tree, `src/backend/tests`, the environment files and the coverage report out of both stages, while the older `infrastructure/docker/.dockerignore` sits below both context roots and is loaded by no build path at all.

One file does outrank the context root, and it is worth knowing about precisely because nothing would warn you: a Dockerfile-specific ignore file named `<dockerfile-path>.dockerignore` — here that would be `infrastructure/docker/Dockerfile.dockerignore` — takes precedence when it exists, and precedence means replacement rather than merge, so it would switch off every root exclusion at once and no build would report that it had happened. None exists in this repository, and none should be created.

Two things follow from that, and they are worth keeping apart, because only one of them is dangerous.

The command above is written with relative paths, so it has to be run at the repository root. Run it from `src/backend` and it fails immediately with `lstat infrastructure: no such file or directory` — it does not quietly build something worse. What matters is the context the final argument names, not the directory you happen to be standing in, so an equivalent command issued from anywhere else is perfectly fine as long as it still selects the repository root: an absolute `-f …/infrastructure/docker/Dockerfile` with that root as the context argument builds exactly the same image.

The dangerous case is the other one: an ad-hoc Dockerfile that copies the working tree unfiltered. That drops a local development dependency tree on top of the production-only install and bakes local configuration into an image layer. It is what the deleted snippet did, and it is why there is no simplified variant to copy from this document.

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