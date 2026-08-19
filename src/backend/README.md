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
- **Memory**: ≈ 65MB resident while the server runs, so allow at least 128MB free (`ps -o rss=` reports around 65,000 kB, drifting a few MB higher under sustained traffic; a bare `node` process is already ~44,000 kB of that)
- **Network**: Port 3000 available for HTTP server binding
- **Node.js Compatibility**: Express 5.0 requires Node.js 18 or higher

### Version Verification

```bash
node --version

npm --version
# This tutorial is validated on Node v22.23.2 with npm 11.18.0. package.json accepts any
# Node >= 18.0.0 and npm >= 8.0.0, and the application's own dependencies - express and dotenv -
# do run on any Node >= 18. The development tools are narrower: jest 30 declares
# "^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0" and nodemon's dependency tree declares "20 || >=22",
# so use Node 20 or 22 for npm ci, npm test and npm run dev - on 18.x npm reports those packages
# as unsupported engines.
```

## Installation

### 1. Repository Setup

```bash
git clone <repository-url>

# git clone leaves you in the parent directory, so enter the clone as well
cd <cloned-directory>/src/backend
```

`src/backend` is relative to the repository root, not to wherever you ran `git clone` — the root
`README.md` spells the same step out as `cd nodejs-tutorial-application/src/backend`.

### 2. Dependency Installation

```bash
# While package-lock.json satisfies the ranges in package.json this installs those exact
# versions; on a mismatch it resolves new ones and rewrites the lockfile. `npm ci` is the
# frozen alternative - it fails on a mismatch and writes to neither file.
npm install

```

### 3. Installation Verification

```bash
npm list --depth=0
# Five top-level packages: express and dotenv, plus jest, nodemon and supertest as devDependencies
```

## Running the Application

The server can be run in two distinct modes optimized for different use cases:

### Development Mode (Recommended for Learning)

Development mode uses `nodemon` for automatic server restart when file changes are detected, enabling rapid development and testing cycles.

```bash
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
[INFO]: ⚡ Node.js v22.23.2 | Express 5.2.1 | Environment: development
[INFO]: 🎯 Tutorial application initialized successfully
```

Editing a watched file prints `[nodemon] restarting due to changes...` followed by the startup
lines again.

Both tokens in that `⚡` line are worth reading carefully before you compare it with your own
output, because `server.js` reads each of them at run time rather than writing them into the
message. The Node.js version is whatever `process.version` reports on your machine, so expect the
version you installed; the sample above shows `v22.23.2`, the version this tutorial was last
validated on. The Express version comes from the installed package's own manifest
(`express/package.json`), so it is the version actually loaded — `5.2.1` is what the committed
lockfile resolves for the declared `^5.1.0` range, and `npm ls express` prints the same value.

**Development Mode Features:**
- **Auto-reload**: nodemon restarts `node server.js` when a `.js` or `.json` file under
  `src/backend` changes (tests, `node_modules`, `coverage` and the lockfile are ignored)
- **Prefixed Logging**: because `NODE_ENV` is `development`, the logger prefixes its output with
  `[INFO]:` and `[ERROR]:`, and `config/index.js` prints the configuration summary above. The
  log content itself is identical in every environment
- **Error Reporting**: an error forwarded to the error handler is logged server-side with its
  message and name, the request URL, method, params and query, an ISO timestamp, the client
  address and the request's `host`, `content-type` and `accept` headers — plus, in development
  only, the error's stack. Other request headers are not recorded, so an `Authorization` header
  or a `Cookie` cannot reach the log; the query string still can, because it is part of the
  target. The client receives the same generic four-field 500 envelope in every environment,
  whose `path` field echoes the request target it sent

### Production Mode

Production mode runs the server using the standard `node` runtime without additional development tooling.

```bash
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
📍 Listening on all network interfaces at port 3000
⚡ Node.js v22.23.2 | Express 5.2.1 | Environment: production
🎯 Tutorial application initialized successfully
```

The configuration summary is not printed outside development, and the `[INFO]:` prefix is
dropped. Two further differences are deliberate. The third line replaces the development URL:
`server.listen(config.port)` is called with no host argument, so nothing is bound to `localhost`
specifically, and outside development a `localhost` URL would name the reader's own machine
rather than the address the process is answering on. And both version tokens are read at run
time — Node.js from `process.version`, Express from the installed package's own manifest — so
the banner cannot drift from what is loaded; `npm ls express` reports the same version, `5.2.1`
being what the committed lockfile resolves for the declared `^5.1.0` range. The same caveat as
above applies to the `⚡` line here: it prints the Node.js version on your own machine, and the
sample shows `v22.23.2`, the version this tutorial was last validated on.

**Production Mode Features:**
- **No Watcher**: the process is plain `node server.js`, so no file watching or restart logic runs
- **Unprefixed Logging**: the same two log levels, without the development prefixes
- **Error Handling**: generic 500 responses that disclose no error detail, message or stack, in
  every environment; the envelope's `path` still echoes the request target the caller sent
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
curl http://localhost:3000/hello

wget -qO- http://localhost:3000/hello

# HTTPie, if you have it installed - it is not a prerequisite of this tutorial
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
- **`errorHandler.js`**: Centralized error handling using Express 5's enhanced promise support. Writes one diagnostic entry per forwarded error — the error's message and name together with the request URL, method, params and query, an ISO timestamp, the client address and the request's `host`, `content-type` and `accept` headers, plus the error's stack in development only — and answers the client with a generic 500 envelope of four fields (`error`, `status`, `timestamp`, `path`) — where `path` is `req.originalUrl || req.url`, so it echoes the caller's own target including any query string. It never calls `next()`: it is the terminal middleware, so the detail stays in the server log and only the generic envelope reaches the client
- **`requestLogger.js`**: Logs each request once on arrival, before routing: the method (`req.method`), the path (`req.originalUrl`) and the body. Object bodies are serialized with `JSON.stringify`, primitive bodies are converted with `String`, and a request with no body — the normal `GET /hello` case — is logged as `{}`. It never reads or writes the response, so there is no response, status-code or timing log

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
- **Memory Usage**: ≈ 65MB resident in typical operation, nearly all of it the Node.js runtime rather than this application
- **Startup Time**: < 5 seconds for application initialization
- **Throughput**: Capable of 1000+ requests/second under optimal conditions

## Configuration

### Environment Variables

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `NODE_ENV` | `development` | Application environment. Selects the `[INFO]:`/`[ERROR]:` log prefixes and whether the configuration summary is printed | `production` |
| `PORT` | `3000` | HTTP server port | `8080` |
| `APP_NAME` | `node-tutorial-app` | Name shown in the configuration summary; an empty or absent value falls back to `node-tutorial-app` | `my-tutorial` |
| `HOST` | `localhost` | Only shown in the configuration summary — it is **not** a bind control. `server.listen(config.port)` is called with no host argument, so the server accepts connections on every interface whatever this is set to, and `0.0.0.0` changes nothing | `0.0.0.0` |
| `ENABLE_LOGGING` | `true` | Set to `false` to suppress the configuration summary | `false` |

`AUTO_RESTART`, `TRUST_PROXY`, `JSON_LIMIT` and `URLENCODED_LIMIT` are also read into the
configuration object but no code consumes them yet. Every other variable in `.env` and
`.env.example` — including `LOG_LEVEL`, `SESSION_SECRET`, `RATE_LIMIT_*`,
`HEALTH_CHECK_ENDPOINT` and `METRICS_INTERVAL` — is a placeholder for a later tutorial and is
read by nothing. In particular there is **no** log-level setting: `logger.js` exposes `info` and
`error` in every environment and filters neither.

### Configuration Examples

```bash
# What the committed .env already sets
export NODE_ENV=development
export PORT=3000

# Any value other than 'development' drops the log prefixes and the configuration summary
export NODE_ENV=production
export PORT=8080
```

## Observability

### What Is Implemented

- **One log line per request**, written on arrival by `requestLogger` before routing:
  `[INFO]: HTTP Request - Method: GET Path: /hello Body: {}`. It carries three values and no
  more — the method, the path as `req.originalUrl` received it, and the body. A request that
  matches no route is logged in exactly the same way, because the logger runs before routing
  and has no idea yet whether a route will match
- **One diagnostic entry per forwarded error**, written by `errorHandler`: the error's message
  and name, the request URL, method, params and query, an ISO timestamp, the client address
  (`req.ip`, or the connection's remote address when Express resolved none), and the request's
  `host`, `content-type` and `accept` headers — those three by name, from a fixed allow-list, so
  no other header is recorded. In development the entry also carries the error's stack; outside
  development it does not, because every frame in a stack names an absolute filesystem path. The
  client gets a separate four-field 500 envelope, and the split between the two is field-by-field
  rather than wholesale. Omitted from the envelope: the message, stack and name, the method, the
  headers, the params, the query and the client address — and `error` is always the fixed string
  `Internal Server Error`. Present in it: `status`, a `timestamp`, and `path`, which repeats
  `req.originalUrl || req.url` with the query string included, so the caller is handed back the
  target it sent. `path` is the only request data the response echoes
- **Five startup lines** and, in development only, a six-line configuration summary

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

The figures below are measured from outside the process, not values the application reports:

| Metric | Figure | How to measure it |
|--------|--------|------------------|
| Response Time | < 100ms (single-digit milliseconds locally) | Time a request from the client, e.g. `time curl http://localhost:3000/hello` |
| Memory Usage | ≈ 65MB resident — measured, not a ceiling | Inspect the process externally, e.g. `ps -o rss= -p <server pid>`; a bare `node` process is already ~44,000 kB of it |
| Errors | none expected | Read the console for `[ERROR]:` lines |

## Testing

### Running Tests

```bash
npm test

npm run test:coverage

npm run test:watch
```

`jest.config.js` sets `collectCoverage: true`, so every run prints a coverage table — including
`npm run test:watch`. The watcher's table lists no files and reads `0%` in every column, even
after you press `a` to run all of them; the meaningful figures are the ones `npm test` and
`npm run test:coverage` print.

### Manual Testing

**Basic Functionality Test:**
```bash
curl -i http://localhost:3000/hello

# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
# 
# Hello world
```

**Error Handling Test:**
```bash
curl -i http://localhost:3000/nonexistent

# HTTP/1.1 404 Not Found
```

## Security Considerations

### Current Security Implementation

- **Input Validation**: None at the application level. Nothing here parses or validates a body,
  query string or parameter, and no body parser is mounted, so `req.body` is always `undefined`.
  What rejects a malformed request is Node's own HTTP parser, before any middleware runs
- **Error Handling**: An error forwarded to `errorHandler` produces a four-field 500 envelope.
  Field by field: `error` is always the fixed string `Internal Server Error`, so the failure's own
  message, stack and name never reach the client, and neither do the method, headers, params,
  query or client address; `status` and a `timestamp` are returned; and `path` repeats
  `req.originalUrl || req.url`, query string included, which is the one piece of the request the
  response hands back
- **Dependencies**: Regular security updates using `npm audit`
- **Transport**: HTTP only (suitable for local development)

### Known Limitations of the Tutorial Middleware

`requestLogger` and `errorHandler` are deliberately minimal teaching code. Read this before
copying either of them anywhere real.

- **The request log records the target verbatim.** `requestLogger` logs `req.originalUrl`, so a
  credential a client puts in a query string — `/hello?access_token=…` — reaches the console even
  though the route ignores it. Log `req.path` or a fixed route label instead
- **Neither module encodes what it logs.** Values go to `console` as-is, with no escaping of ANSI,
  C0/C1, `U+2028`/`U+2029` or bidirectional controls, so a value carrying them can distort how a
  log line is displayed. Reachability differs between the two modules, so treat them separately.
  The request log is safe as things stand: it records `req.originalUrl`, which keeps percent-encoding
  intact — `%1B` stays those three characters and never becomes `ESC` — a raw CR/LF in a request
  target is rejected `400` by Node's HTTP parser before any middleware runs, and no body parser
  exists to populate `req.body`. The error diagnostic is not safe: it logs `req.query`, and Express's
  query parser percent-*decodes*, so `?x=%E2%80%AE` arrives as a genuine `U+202E` and reaches the
  console verbatim — and the same applies to the values of the three headers it is allowed to
  record, since the allow-list bounds *which* headers reach the log, not how their values are
  written. That path needs an
  application error to be forwarded, and nothing in this tutorial raises one, so it is latent rather
  than open. Add the encoding before you add either a body parser or a route that can fail
- **The error diagnostic still records the request's own data, though no longer its credentials.**
  `errorHandler` logs the error's message and name with the request URL, method, params, query,
  an ISO timestamp and the client address. Two fields are deliberately bounded, and both bounds
  are worth understanding rather than copying blindly:
  - **Headers come from an allow-list**, `host`, `content-type` and `accept`, rather than from
    `req.headers` wholesale. Logging the whole header set is how a credential ends up in a log
    file — the weakness CWE-532 describes — because `Authorization`, `Cookie` and any API-key
    header a client invents all live there. Prefer an allow-list to a deny-list of
    secret-looking names: the deny-list has to be right about every header that will ever exist,
    and the one it has not heard of is the one that reaches the log
  - **The stack is recorded in development only**, because every frame in it names an absolute
    filesystem path. `errorName` and `errorMessage` identify the failure in every environment
  What is still recorded is request data: `requestUrl` and `requestQuery` carry the query string
  as sent, so a credential a caller puts in the target — `/hello?access_token=…` — reaches the
  console exactly as it does through the request log above, and `clientIP` is personal data.
  Before this middleware goes anywhere real, decide deliberately about those two: log `req.path`
  or a route label instead of the target, and mask or omit the address
- **A body would be serialized whole.** `requestLogger` calls `JSON.stringify` on an object body
  and `String` on a primitive one, with no size limit. That is latent rather than active here
  because no parser populates `req.body`, but it becomes both an exposure and an unbounded cost
  the moment one is added
- **The client-address fallback is not null-safe.** `req.ip || req.connection.remoteAddress` throws
  a `TypeError` when Express resolved no `ip` *and* `req.connection` is absent, ending the request
  with no response at all instead of the generic 500. Real Express requests always supply one of
  the two, and `tests/unit/errorHandler.test.js` pins the behaviour so it is visible rather than
  latent. `req.connection` is also deprecated in favour of `req.socket`

These are properties of this tutorial's middleware, not patterns to imitate.

### Security Best Practices

```bash
npm audit

npm audit fix

# Exit non-zero only when a moderate-or-higher vulnerability is present.
# The report itself is not filtered: every finding is still printed.
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
# NODE_ENV=development is what turns on both the [INFO]:/[ERROR]: prefixes and the startup
# configuration summary; any other value leaves both off. ENABLE_LOGGING=false then silences
# the summary while leaving the prefixes on, so the summary needs both. LOG_LEVEL is not read.
export NODE_ENV=development
npm run dev
```

There is no debug level to raise: `logger.js` has `info` and `error` and nothing else, so the
volume of application logging is fixed. To see more than the one line per request that
`requestLogger` writes, use the inspector below or add a `logger.info` call where you need it.

**Node.js Inspector:**
```bash
node --inspect server.js
# Then open chrome://inspect in the browser to attach
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