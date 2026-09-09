# Local Development Setup Guide

This comprehensive guide provides step-by-step instructions for setting up the Node.js tutorial application on your local machine for development and testing purposes. The setup process creates a robust development environment using Node.js v22.16.0 LTS and Express.js 5.1.0.

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Running the Application](#4-running-the-application)
5. [Verifying the Setup](#5-verifying-the-setup)
6. [Automated Setup](#6-automated-setup)
7. [Development Workflow](#7-development-workflow)
8. [Troubleshooting](#8-troubleshooting)
9. [Advanced Configuration](#9-advanced-configuration)
10. [Next Steps](#10-next-steps)

## 1. Prerequisites

Before you begin, ensure you have the following software installed on your system. These requirements are based on the technical specifications for optimal performance and compatibility.

### 1.1 Core Requirements

#### Node.js (Required)
- **Version**: Node.js v22.16.0 LTS or higher
- **Minimum**: Node.js v18.0.0 (Express.js 5.1.0 requirement)
- **Justification**: Node.js v22, codename 'Jod', is the release line this project targets, builds against in CI and is tested on

**Installation Verification:**
```bash
node --version
# Should display: v22.16.0 or higher
```

**Download Location**: [https://nodejs.org/](https://nodejs.org/)

**LTS Benefits:**
- Production applications should only use Active LTS or Maintenance LTS releases
- Node.js v22.x integrates V8 12.4 JavaScript engine with performance optimizations
- Cross-platform compatibility (Windows, macOS, Linux)
- Enhanced security with ReDoS attack mitigation

#### npm Package Manager (Required)
- **Version**: npm v11.4.1 or higher
- **Minimum**: npm v8.0.0
- **Status**: Bundled with Node.js installation

**Installation Verification:**
```bash
npm --version
# Should display: 11.4.1 or higher
```

**Package Manager Details:**
- Latest version provides improved dependency resolution
- Enhanced security vulnerability scanning with `npm audit`
- Over 3.1 million packages available in the npm registry
- Semantic versioning (semver) support for dependency management

#### Git Version Control (Required)
- **Purpose**: Repository cloning and version control
- **Any modern version supported**

**Installation Verification:**
```bash
git --version
# Should display git version information
```

### 1.2 Optional Components

#### Docker (Optional - Recommended)
- **Purpose**: Containerized development environment
- **Version**: Any modern Docker version
- **Use Case**: Consistent development environment across different machines

**Installation Verification:**
```bash
docker --version
docker info
# Should display Docker version and running daemon status
```

**Docker Benefits:**
- Consistent environment across development machines
- Production-like deployment testing
- Isolated dependency management
- Container orchestration preparation

### 1.3 System Requirements

#### Operating System Compatibility

These are the platform floors supported by the official Node.js 22 binaries. This project targets Node.js v22.16.0, so a platform below any of these floors needs a self-built or community-packaged runtime and is outside the scope of this guide.

- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 11 (Big Sur) or later — the official Node.js 22 builds target macOS 11, so macOS 10.15 (Catalina) cannot run them
- **Linux**: any 64-bit distribution providing glibc 2.28 or newer — Ubuntu 20.04+, Debian 10+, RHEL/Rocky/Alma Linux 8+, or equivalent. Ubuntu 18.04 and CentOS 7 ship an older glibc, are past their vendor end-of-life, and are not supported by the official Node.js 22 binaries.

Node.js publishes the authoritative platform, libc and toolchain floors for each release line in [BUILDING.md](https://github.com/nodejs/node/blob/main/BUILDING.md).

#### Hardware Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 500MB free space for dependencies
- **CPU**: Any modern 64-bit processor (x64 or arm64, including Apple Silicon)

### 1.4 Development Tools (Recommended)

#### Code Editor
- **Recommended**: Visual Studio Code with Node.js extensions
- **Alternatives**: WebStorm, Sublime Text, Vim/Neovim

#### Terminal/Command Line
- **Windows**: Git Bash or WSL (either one inside Windows Terminal, if you prefer)
- **macOS**: Terminal.app or iTerm2
- **Linux**: Any modern terminal emulator

**The command blocks in this guide are Bash**, and they are written for Bash
throughout — variable assignments, `if [ … ]` tests, `$(…)` substitution,
`NAME=value command` prefixes and `{1..10}` brace expansion all appear. On
Windows, run them in Git Bash or WSL rather than translating them. A PowerShell
equivalent is given for the two constructs most often pasted into PowerShell by
mistake: the one-off environment assignment in §4.3 and the timing loop in §5.2.

## 2. Installation

Follow these comprehensive steps to clone the repository and install all necessary dependencies for the Node.js tutorial application.

### 2.1 Repository Cloning

#### Step 1: Clone the Repository

Open your terminal and execute the following commands to clone the project repository:

Placeholders in this guide are shell variables, not angle-bracket tokens. A
bracketed placeholder pasted into a shell is not substituted: the brackets are
redirection operators, so the command either fails with a syntax error or
silently reads from a file of that name. Set the variable, keep the quotes, and
the block runs as written.

```bash
# Set this to the repository URL you were given
REPOSITORY_URL="https://github.com/your-organization/nodejs-tutorial.git"

git clone "$REPOSITORY_URL"

# Enter the clone. This is the only step that depends on the directory name:
# every later block resolves the repository root for itself.
cd "$(basename "$REPOSITORY_URL" .git)"
```

#### Step 2: Verify Project Structure

Confirm that the project structure is correctly cloned:

```bash
# Display project structure
ls -la

# Verify backend directory exists
ls -la src/backend/

# Confirm key files are present
ls -la src/backend/package.json
ls -la src/backend/.env.example
ls -la src/backend/server.js
```

**Expected Project Structure:**
```
project-root/
├── src/
│   └── backend/
│       ├── package.json
│       ├── .env.example
│       ├── server.js
│       ├── app.js
│       ├── routes/
│       ├── middleware/
│       ├── utils/
│       └── config/
├── infrastructure/
│   ├── scripts/
│   │   └── setup.sh
│   └── docker/
│       └── Dockerfile
└── docs/
    └── setup/
        └── development.md
```

### 2.2 Backend Dependencies Installation

#### Step 1: Navigate to Backend Directory

**Working-directory contract for this guide:** every command runs from
`src/backend` unless its block says otherwise — that is where the npm scripts
resolve their entry point and where the CI workflow runs. Each procedure that
needs it repeats the root-qualified `cd` below rather than a bare `cd src/backend`,
so you can start at any section, in any terminal, without tracking where the
previous section left you. `git rev-parse --show-toplevel` prints the repository
root from anywhere inside the clone, which makes the command safe to repeat:
running it twice cannot land you in `src/backend/src/backend`.

```bash
cd "$(git rev-parse --show-toplevel)/src/backend"
```

#### Step 2: Review Package Configuration

Examine the `package.json` file to understand the dependencies that will be installed:

**Core Dependencies (Production):**
- `express: 5.1.0` - Web application framework (exact version pin)
- `dotenv: ^16.3.1` - Environment variable management

**Development Dependencies:**
- `nodemon: ^3.0.0` - Automatic server restart during development
- `supertest: 7.1.1` - HTTP testing library for integration tests
- `jest: ^29.7.0` - Test runner for the unit and integration suites

**Package.json Scripts:**
- `start: "node server.js"` - Production server startup
- `dev: "nodemon server.js"` - Development server with auto-reload
- `test: "jest"` - Runs the unit and integration suites, with coverage collected on every run
- `test:coverage: "jest --coverage"` - Runs the suites and writes a coverage report
- `test:watch: "jest --watch"` - Re-runs affected suites as files change; requires a Git or Mercurial checkout (see §7.3 for the prerequisite, the fallback and how to stop it)

#### Step 3: Install Dependencies

Execute the npm install command to download and install all required packages:

```bash
npm install
```

**Installation Process Details:**
- Downloads Express.js 5.1.0 and related packages
- Creates `node_modules` directory with all dependencies
- Installs the versions pinned by the committed `package-lock.json`, which is the authoritative dependency graph — npm writes a new lockfile only when none is present, and rewrites the committed one only when it no longer agrees with `package.json`
- Installs approximately 50+ packages including transitive dependencies

Use `npm ci` instead of `npm install` when you want an exact, reproducible
install: it installs strictly what the lockfile pins, never rewrites it, and is
the command the CI workflow runs.

**Installation Verification:**
```bash
# Verify node_modules directory creation
ls -la node_modules/

# Check installed package versions
npm list --depth=0

# Verify Express.js installation
npm list express

# Check for security vulnerabilities
npm audit
```

**Expected Output:**
```
nodejs-tutorial-app-backend@1.0.0
├── dotenv@16.6.1
├── express@5.1.0
├── jest@29.7.0
├── nodemon@3.1.14
└── supertest@7.1.1
```

### 2.3 Dependency Security Audit

After installation, audit the dependency graph. A clean checkout is expected to report no advisories, and `.github/workflows/ci.yml` runs `npm audit` with no `--audit-level`, so any advisory at all fails the pipeline.

```bash
# Report advisories against the committed lockfile (this is what CI runs)
npm audit

# Read the full advisory detail before changing anything
npm audit --json

# Confirm the installed packages carry valid registry signatures
npm audit signatures
```

Treat `package-lock.json` as reviewed state, not disposable output. If an advisory does appear, preview the change, read it, then apply it deliberately:

```bash
# 1. Preview only, writes nothing
npm audit fix --dry-run

# 2. Apply the in-range fixes after reading the preview
npm audit fix

# 3. Review exactly what moved in the audited graph
git diff -- package-lock.json

# 4. Re-verify the tree the lockfile now describes
npm ci && npm audit && npm test
```

`npm audit fix --force` is deliberately absent from this procedure. It is permitted to install SemVer-major and out-of-range versions, so it can move the graph past the ranges `package.json` declares, including the exact `express` pin, with nobody reviewing the change. When an advisory cannot be cleared inside the declared ranges, raise the range in `package.json` yourself, reinstall, and run the suite.

## 3. Configuration

The application reads its configuration from environment variables, and every one
of them is optional. `src/backend/config/index.js` is the only module that reads
`process.env`, and each of its nine reads supplies a literal default, so a clean
checkout starts and serves `GET /hello` with no environment file present at all.
There is deliberately no `.env` in the repository: its absence is the normal
state, not an error.

This section covers the optional override file and what each setting actually
does.

### 3.1 Environment File Creation

#### Step 1: Copy Environment Template

This step is optional. Take it only when you want to change a default - a
different port, for instance. To keep the defaults, go straight to
[section 4](#4-running-the-application); nothing in this section is a
prerequisite for starting the server.

Create a local override by copying the example file:

```bash
# Enter the backend directory (root-qualified, so it is safe to repeat)
cd "$(git rev-parse --show-toplevel)/src/backend"

# Copy the environment template
cp .env.example .env
```

`.env` is ignored by Git (`src/backend/.gitignore:9`), so the values you put in it
stay out of version control. For a one-off change you do not need the file at
all: `PORT=3001 npm start` applies to that run only, and takes precedence over
any value in `.env`.

#### Step 2: Review Environment Template

The `.env.example` file contains comprehensive configuration templates:

**Server Configuration:**
```env
# PORT - HTTP server listening port
# Technical specification default: 3000 (F-001-RQ-003)
# Valid range: 1024-65535
PORT=3000

# NODE_ENV - Application environment
# Values: development, test, production
NODE_ENV=development

# HOST - the hostname recorded as the server's configured host
# Default: localhost
# Read into config.host and printed in the startup summary as "Host: <value>",
# but NOT used to bind. server.js calls server.listen(config.port) with no host
# argument, so Node binds every available interface whatever you set here.
# A Docker container therefore does not need HOST=0.0.0.0 for a published port
# to be reachable. The port-only listen() form is deliberate: passing
# config.host would bind loopback inside the container and make
# `docker run -p 3000:3000` unreachable from the host.
HOST=localhost
```

**Logging Configuration:**
```env
# LOG_LEVEL - a documented convention for a future logging implementation
# Read by NO module. config/index.js is the only reader of process.env in this
# codebase and it never reads LOG_LEVEL, so setting it has no effect anywhere
# today; the value is retained as a convention for a logger that accepts one.
# What controls log output today is NODE_ENV: utils/logger.js prefixes messages
# with "[INFO]:" / "[ERROR]:" when NODE_ENV is development, and omits the prefix
# in every other environment.
LOG_LEVEL=info
```

### 3.2 Port Configuration

#### Default Port Settings

The application defaults to port 3000, which is suitable for most development environments:

```env
PORT=3000
```

#### Alternative Port Configuration

If port 3000 is already in use, configure an alternative port. Set exactly one
value: within a single file dotenv keeps the last assignment of a key, so
several uncommented `PORT` lines do not offer a choice - they collapse silently
to whichever one comes last. Write the port you want as the only `PORT` line in
the file - `8000` and `8080` work exactly the same way as the `3001` shown here:

```env
# Development port - this must be the file's only PORT assignment
PORT=3001
```

To try a port without editing any file, set it on the command line for a single
run: `PORT=3001 npm start`. That wins over `.env`, because dotenv never
overwrites a variable that is already present in the environment.

#### Port Conflict Resolution

Check for port conflicts before starting the server:

```bash
# Check if port 3000 is in use (Linux/macOS)
lsof -i :3000

# Check if port 3000 is in use (Windows)
netstat -ano | findstr :3000
```

If the port is taken, the safe answer is almost always to use a different one —
no process has to be stopped at all:

```bash
PORT=3001 npm start
```

If you do need the port back, identify what is holding it before you stop
anything. The port number alone does not tell you whether it is your own server
or an unrelated service, and killing the wrong process can lose that service's
in-flight work:

```bash
# Which process holds port 3000? (Linux/macOS. Where lsof is not installed,
# `ss -ltnp | grep :3000` or `fuser -n tcp 3000` report the same thing.)
PORT_PID="$(lsof -ti :3000 || true)"

# An empty result means the port is free, or that lsof is unavailable — so
# guard on it, and look at what the process actually is before touching it
if [ -n "$PORT_PID" ]; then
  ps -p "$PORT_PID" -o pid,ppid,command
fi
```

Stop it only once you have confirmed it is a server you started. Prefer `Ctrl+C`
in the terminal that is running it; `kill` sends the same `SIGTERM` to one
specific process if that terminal is gone. Do not use `kill -9` unless `SIGTERM`
has already failed — it denies the process any chance to shut down — and never
kill processes by name (`pkill node` and the like), which would also take out
unrelated editors, language servers and build tools:

```bash
if [ -n "$PORT_PID" ]; then
  kill "$PORT_PID"
fi
```

Resolving the PID from the port matters for a second reason: `npm start` runs the
server as a child process, so the process holding the port is the `node` process
rather than npm itself. `Ctrl+C` signals both because they share the terminal's
process group, but a `kill` aimed at the npm process can leave the listener
running — and the port bound.

On Windows, read the owning PID out of the `netstat` output above and pass that
number — `taskkill /PID 12345 /F` — rather than a placeholder.

### 3.3 Environment Validation

Verify your environment configuration. Inspect the keys you need rather than
dumping the whole file. The check below reports which keys dotenv actually
parsed, and fails with a non-zero exit status only when a `.env` exists but
cannot be read. No `.env` at all is a normal clean-checkout result, so it is
reported as such rather than as a failure:

```bash
# List which keys are defined, without printing any values
grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env

# Read one named value, only when you actually need it
grep -E '^PORT=' .env

# Validate the environment file: report what dotenv parsed, and fail loudly if
# the file is present but unreadable
node -e "const r = require('dotenv').config(); if (r.error) { if (r.error.code === 'ENOENT') { console.log('No .env present - built-in defaults apply'); } else { console.error('Cannot read .env:', r.error.message); process.exit(1); } } else { console.log('Parsed from .env:', Object.keys(r.parsed).join(', ') || '(no keys)'); }"
```

A key you set but that does not appear in the parsed list is a malformed line,
most often one with no `=`. A key that does appear and still does not take
effect is a precedence question rather than a parsing one, because a value
already present in the environment is never replaced. "Environment Variable
Issues" in [section 8.3](#83-runtime-errors) covers both.

Do not `cat` the file, and never paste it into an issue, a chat message or a screen share. Printing it emits every value at once, and the whole file then lives in your shell history, your terminal scrollback and any CI log that captured the step. On a clean checkout `.env` does not exist at all, and the commands above simply report that.

## 4. Running the Application

The Node.js tutorial application provides multiple execution modes for different development scenarios.

### 4.1 Production Mode Execution

#### Standard Server Startup

Run the application using the production-like execution mode:

```bash
# Enter the backend directory (root-qualified, so it is safe to repeat)
cd "$(git rev-parse --show-toplevel)/src/backend"

# Start the server using npm start script
npm start
```

**Expected Console Output:**
```
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

**Process Details:**
- Executes `server.js` directly using Node.js
- No automatic restart on file changes
- Production-like execution environment
- Suitable for final testing and validation

### 4.2 Development Mode Execution

#### Auto-Reload Development Server

For active development, use the development mode with automatic restart:

```bash
# Start development server with nodemon
npm run dev
```

**Development Mode Benefits:**
- Automatic server restart on file changes
- Enhanced development productivity
- Real-time code change testing
- Detailed console output for debugging

**Monitored File Types:**
- `.js` files (JavaScript source)
- `.json` files (Configuration files)

### 4.3 Direct Node.js Execution

#### Alternative Execution Method

You can also run the application directly with Node.js:

```bash
# Direct Node.js execution
node server.js

# With environment variables
NODE_ENV=development PORT=3000 node server.js
```

**PowerShell equivalent** — PowerShell has no `NAME=value command` prefix, so set
the variables first and then run the command: `$env:NODE_ENV = 'development'; $env:PORT = '3000'; node server.js`.
Unlike the Bash form, these assignments persist for the rest of the PowerShell
session; use `Remove-Item Env:\PORT` to clear one.

### 4.4 Server Startup Validation

#### Startup Success Indicators

Look for these indicators of successful server startup:

1. **Port Binding Confirmation**: Server listening message with port number
2. **Express Integration**: Framework initialization confirmation
3. **Environment Validation**: Node.js and Express version display
4. **Request Readiness**: Ready to accept HTTP requests message

#### Common Startup Issues

**Port Already in Use (EADDRINUSE):**

The server writes the following eight lines through `logger.error` and then exits with status code 1. The `[ERROR]:` prefix is added only when `NODE_ENV=development`; in any other environment the same lines are printed without it. The port number is whichever port the process tried to bind, and the configuration summary is printed before these lines exactly as it is on a successful start.

```
[ERROR]: ❌ Server startup failed: Port 3000 is already in use
[ERROR]: 💡 Resolution suggestions:
[ERROR]:    • Stop the process using port 3000: lsof -ti:3000 | xargs kill -9
[ERROR]:    • Use a different port: PORT=3001 npm start
[ERROR]:    • Check for other running instances of this application
[ERROR]:    • Verify no other services are using port 3000
[ERROR]: 🛑 Application terminating due to server startup failure
[ERROR]: ⏰ Shutdown initiated at: 2026-09-08T19:51:14.578Z
```

The timestamp on the last line is the actual time of the failure, so it differs on every run.

**Solution Steps:**
1. Start on a free port instead — `PORT=3001 npm start` resolves the conflict without stopping anything
2. If you need port 3000 itself, identify the process holding it and confirm it is a server you started, using the diagnosis in §3.2
3. Stop that one process — `Ctrl+C` in its own terminal, or `kill` on its exact PID
4. Restart the application

The `lsof -ti:3000 | xargs kill -9` line above is the server's own generic hint,
printed by `server.js` without knowing what holds the port. Treat it as a
description of the conflict rather than a command to paste: it force-kills
whatever owns the port, which may be an unrelated service.

## 5. Verifying the Setup

Comprehensive verification ensures your development environment is correctly configured and the application is responding to requests.

### 5.1 HTTP Endpoint Testing

#### Browser Testing

1. Open your web browser
2. Navigate to: `http://localhost:3000/hello`
3. Verify the response displays: `Hello world`

**Expected Browser Output:**
```
Hello world
```

#### Command Line Testing with curl

Test the endpoint using curl for programmatic verification:

```bash
# Basic GET request to hello endpoint
curl http://localhost:3000/hello

# Detailed curl with request and response headers
curl -v http://localhost:3000/hello
```

**Expected response body** (11 bytes, no trailing newline):
```
Hello world
```

**Expected `curl -v` output includes:**
```
> GET /hello HTTP/1.1
> Host: localhost:3000
< HTTP/1.1 200 OK
< Content-Type: text/html; charset=utf-8
Hello world
```

#### Advanced Testing with Different Tools

**Using wget:**
```bash
# Print the response to stdout
wget -qO- http://localhost:3000/hello

# Or capture it in a temporary file, inspect it, then remove it. Writing the
# response into the working directory instead would leave an untracked file
# behind in src/backend, which .gitignore does not cover.
RESPONSE_FILE="$(mktemp)"
wget -qO "$RESPONSE_FILE" http://localhost:3000/hello
cat "$RESPONSE_FILE"
rm -f "$RESPONSE_FILE"
```

**Using HTTPie (if installed):**
```bash
# Clean HTTP client
http GET localhost:3000/hello

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
# Hello world
```

### 5.2 Server Health Verification

#### Process Status Check

Verify the server process is running correctly:

```bash
# Check Node.js processes
ps aux | grep node

# Check port binding
netstat -tulpn | grep 3000  # Linux
netstat -an | grep 3000     # macOS
netstat -an | findstr 3000  # Windows
```

#### Performance Verification

The commands in this section measure **HTTP response time only**. Memory and CPU are measured separately, against the process you started, using the second block below.

```bash
# Measure response time
time curl http://localhost:3000/hello

# Multiple requests for consistency
for i in {1..10}; do
  curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/hello
done
```

**PowerShell equivalent** — `{1..10}` is Bash brace expansion and PowerShell does
not expand it; use its own range operator and measure each request instead:
`1..10 | ForEach-Object { (Measure-Command { curl.exe -s -o NUL http://localhost:3000/hello }).TotalMilliseconds }`.
Call `curl.exe` explicitly, because bare `curl` in PowerShell may resolve to the
`Invoke-WebRequest` alias, which does not accept these flags.

**Expected HTTP Performance:**
- Response time: < 100ms — measured locally between 0.4 ms and 1.4 ms per request across ten iterations

To measure the process itself, scope the measurement to the server you launched rather than to every `node` process on the machine. Start it as a simple background command so that `$!` is the Node.js process. If the server from section 4 is still running, stop it first (Ctrl+C in its terminal) or give this instance a different port — two processes cannot bind the same port, and the second one exits with the EADDRINUSE output shown in section 4.4.

```bash
# Start the server in the background; $! is the node process itself
PORT=3000 node server.js & SERVER_PID=$!

# Resident memory (in KB) and CPU percentage, for that process only
ps -o pid=,rss=,pcpu= -p "$SERVER_PID"

# Stop the process you started
kill "$SERVER_PID"
```

Use `node server.js` rather than `npm start` here: `npm` forks a child process, so `$!` would hold npm's PID — reporting a couple of megabytes of wrapper instead of the server, and leaving the server running after `kill`.

**Observed process footprint** (Node.js v22, idle after a handful of requests):
- Resident memory: roughly 55–70 MB, nearly all of it the Node.js runtime itself
- CPU: ~0% when idle — the handler is a synchronous string response

Treat both figures as observations rather than acceptance criteria: they vary with the Node.js version, the platform and V8's heap sizing. A target below 50 MB is not achievable on this runtime.

### 5.3 Error Response Testing

#### Invalid Endpoint Testing

Test error handling by requesting a path the application does not declare, and by using methods its single route does not handle:

```bash
# Test the 404 response
curl -i http://localhost:3000/nonexistent

# Test other HTTP methods on the hello endpoint
curl -i -X POST http://localhost:3000/hello
curl -i -X PUT http://localhost:3000/hello
curl -i -X DELETE http://localhost:3000/hello
```

Unmatched requests are answered by Express's built-in final handler rather than by a route in this application, so the body is an HTML error page and not JSON. The response to `curl -i http://localhost:3000/nonexistent` is as follows, omitting the per-request `Date`, `Connection` and `Keep-Alive` headers:

```
HTTP/1.1 404 Not Found
Content-Security-Policy: default-src 'none'
X-Content-Type-Options: nosniff
Content-Type: text/html; charset=utf-8
Content-Length: 150

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /nonexistent</pre>
</body>
</html>
```

`POST`, `PUT` and `DELETE` against `/hello` are answered the same way, with the method named in the `<pre>` element — `Cannot POST /hello`, and `Content-Length: 145` for that shorter body. The application declares exactly one route, `GET /hello`; the complete method matrix, including the `HEAD` and `OPTIONS` behaviour Express derives from that single declaration, is published in the [API documentation](../api/hello.md).

The application's own error-handling middleware is not involved in any of these responses. It runs only when a route passes an error to `next(err)`, and no route in the tutorial does.

### 5.4 Logging Verification

#### Console Output Analysis

The request logger writes exactly one line per request, **before** the request is routed. That line carries the HTTP method, the request path and the request body, and nothing else. No response status and no duration can appear in it, because the record is written before a response exists. The client IP and the User-Agent are a different case: both are available on the request at that point, and the middleware simply does not select them.

**Successful request (`GET /hello`), in development:**
```
[INFO]: HTTP Request - Method: GET Path: /hello Body: {}
```

**Unmatched request (`GET /nonexistent`), in development:**
```
[INFO]: HTTP Request - Method: GET Path: /nonexistent Body: {}
```

An unmatched request produces the same `[INFO]:` record: its 404 comes from Express's built-in handler, which emits no warning and no error line of its own. `Body: {}` is what the logger prints whenever `req.body` is unpopulated, which is every request in this tutorial: no body parser is mounted, so a request may still carry body bytes but nothing parses them onto `req.body`.

The `[INFO]:` prefix is added only when `NODE_ENV=development`. In any other environment the same record is printed without it:
```
HTTP Request - Method: GET Path: /hello Body: {}
```

Response status codes are observed from the client side with `curl -i`, as in section 5.3, rather than from the log. Adding status, timing or client metadata to the log line means extending `src/backend/middleware/requestLogger.js` itself to collect those fields. The Winston replacement in section 9.3 is not that upgrade: it changes the transport and the formatting while deliberately preserving the same request-logger call, so it adds no new fields.

## 6. Automated Setup

For streamlined environment setup, use the provided automation script that handles prerequisites verification, dependency installation, and Docker image building.

### 6.1 Script Overview

The automated setup script (`infrastructure/scripts/setup.sh`) provides:

- **Prerequisites Verification**: Node.js, npm, and Docker version checking
- **Dependency Installation**: Automated npm package installation
- **Docker Image Building**: Container image creation for deployment
- **Comprehensive Logging**: Detailed progress and error reporting

### 6.2 Script Execution

#### Prerequisites for Script Execution

1. **Unix-like Environment**: Linux, macOS, or Windows with Git Bash/WSL
2. **Invocation Through `bash`**: the script is tracked with a non-executable file mode, so run it as `bash infrastructure/scripts/setup.sh`
3. **Project Root Directory**: Script must be run from project root

#### Running the Automated Setup

```bash
# Move to the repository root, wherever your clone lives
cd "$(git rev-parse --show-toplevel)"

# Execute the automated setup script
bash infrastructure/scripts/setup.sh
```

Passing the script to `bash` runs it exactly as committed and needs no file-mode
change. `chmod +x infrastructure/scripts/setup.sh` would work too, but the
tracked mode is `100644`, so it leaves an unstaged permission change in your
checkout — a modification to the repository rather than a step in setting it up.
Change the mode only if you intend to commit that change.

### 6.3 Script Execution Phases

#### Phase 1: Prerequisites Verification

**What it checks:**
- Node.js version compatibility (>= v18.0.0, target v22.16.0)
- npm version verification (>= v8.0.0, target v11.4.1+)
- Docker installation and daemon status
- Project structure validation

**Sample Output:**
```
[INFO] Phase 1/3: Prerequisites Verification
[SUCCESS] Node.js version 22.16.0 detected (minimum v18.0.0 required)
[SUCCESS] npm version 11.4.1 detected (minimum v8.0.0 required)
[SUCCESS] Docker version 24.0.0 detected and daemon is running
[SUCCESS] All system prerequisites verified successfully
```

#### Phase 2: Node.js Dependency Installation

**What it does:**
- Navigates to `src/backend` directory
- Executes `npm install` with progress reporting
- Performs security audit on installed packages
- Validates successful installation

**Sample Output:**
```
[INFO] Phase 2/3: Node.js Dependency Installation
[INFO] Installing dependencies from package.json specification
[SUCCESS] npm dependencies installed successfully
[INFO] Created node_modules directory with <count> packages
[SUCCESS] Security audit completed - no critical vulnerabilities found
```

The count is computed at run time by the script as `find node_modules -mindepth 1 -maxdepth 1 -type d | wc -l`, so it counts top-level directories inside `node_modules` — including `.bin` and one entry per scope such as `@babel`. It therefore differs both from the packages the manifest declares and from the total npm reports as installed, and it changes with the npm major version. It is informational output, not a figure to match.

#### Phase 3: Docker Image Build

**What it builds:**
- Multi-stage Docker image using `node:22-alpine` base
- Production-optimized image with non-root user
- Tagged as `nodejs-tutorial-app:latest`

**Sample Output:**
```
[INFO] Phase 3/3: Docker Image Build
[INFO] Building containerized version of Node.js tutorial application
[SUCCESS] Docker image built successfully: nodejs-tutorial-app:latest
[INFO] Final image size: <size>
```

The size is read back from `docker images --format "{{.Size}}"` after the build, so it reflects the base image, the resolved dependency tree and whatever the build context contained. On `node:22-alpine` it has been measured at roughly 170 MB from a clean checkout and roughly 225 MB when a local `node_modules` directory was present in the build context. Like the package count, it is not an acceptance criterion.

### 6.4 Post-Script Verification

#### Verify Script Success

After successful script execution, verify the setup:

```bash
# Verify dependencies installation
cd "$(git rev-parse --show-toplevel)/src/backend" && npm list --depth=0

# Verify Docker image creation
docker images nodejs-tutorial-app:latest

# Test application startup (Ctrl+C to stop it again)
npm start
```

#### Container Testing

Test the Docker image created by the script. Run the container **detached**
(`-d`) and capture the ID it prints: a foreground `docker run` holds the
terminal for as long as the container lives, so a `curl` typed after it in the
same terminal never executes. The ID is what identifies that one container to
every command that follows — its logs, and its removal.

The whole check runs inside `( … )`. That subshell is what makes the block safe
to paste: the cleanup trap and the `exit` below belong to it, so your terminal
keeps neither, and the compound command's exit status is the verdict — zero when
the endpoint answered, non-zero when it did not. The container does not outlive
the block, by design; when you want one to stay up and poke at it, use the
runtime-diagnosis sequence in section 8.5 instead.

```bash
(
  # Name this run uniquely - $$ is your shell's process ID - and keep the ID
  # docker run prints. Every command here addresses that exact container. Do
  # not force-remove a fixed name first: container names are daemon-global, so
  # on a shared machine the name may belong to another workload, and a name
  # freed that way can be taken by something else before the next command runs.
  # If this name is somehow already in use, docker run fails and says so, which
  # is the outcome you want.
  CONTAINER_ID="$(docker run -d --name "nodejs-tutorial-test-$$" -p 3000:3000 nodejs-tutorial-app:latest)" || exit 1

  # Remove that exact container however this block ends - normally, on the
  # failure path below, or on Ctrl+C - so it never keeps port 3000 bound. The
  # trap addresses the captured ID and nothing else.
  trap 'docker rm -f "$CONTAINER_ID" >/dev/null 2>&1' EXIT

  # Wait for it to answer, for at most 30 seconds, and record whether it ever
  # did. Without the flag the loop would finish successfully after 30 failed
  # probes, because the last thing it ran was the sleep.
  READY=no
  for _ in $(seq 1 30); do
    if curl -fsS http://localhost:3000/hello; then READY=yes; break; fi
    sleep 1
  done

  # Only when it never answered: read the container's own output for the reason,
  # and end the block non-zero so a script wrapping it stops here. This `exit`
  # leaves the subshell, not your terminal.
  if [ "$READY" = no ]; then
    docker logs "$CONTAINER_ID" >&2
    echo "container $CONTAINER_ID did not answer within 30 seconds" >&2
    exit 1
  fi
)
```

The `curl` runs on your host against the published port, not inside the
container — the image is Alpine-based and does not install curl. If port 3000 is
already taken, publish a different host port instead (`-p 3001:3000`) and probe
that; the port inside the container stays 3000.

### 6.5 Script Troubleshooting

#### Common Script Issues

**Permission Denied:**

`permission denied` after invoking the script directly
(`./infrastructure/scripts/setup.sh`) is the tracked file mode, not a damaged
checkout: the script is committed as `100644`. Run it through `bash`, which needs
no mode change and leaves the checkout clean. The script's path is relative to
the repository root, so move there first — the preceding section leaves you in
`src/backend`:

```bash
cd "$(git rev-parse --show-toplevel)"
bash infrastructure/scripts/setup.sh
```

**Docker Not Running:**
```bash
# Start Docker daemon (Linux)
sudo systemctl start docker

# On macOS/Windows, start Docker Desktop application
```

**Network Issues During npm Install:**
```bash
# Read the effective registry first; this changes nothing
npm config get registry

# Retry against the official registry for this command only,
# leaving your saved npm configuration untouched
npm ci --registry https://registry.npmjs.org/

# Repair the npm cache in place if you suspect corruption
npm cache verify
```

`npm config set` writes to your user-level npm configuration and then applies to every project on the machine, which is why the per-command `--registry` flag is used above instead. Likewise prefer `npm cache verify`, which drops corrupted and unreferenced entries and keeps the rest, over `npm cache clean --force`, which empties a cache shared by every project on the host and forces all of them to download their dependencies again.

## 7. Development Workflow

Establish an efficient development workflow for building and testing the Node.js tutorial application.

### 7.1 Daily Development Process

#### Starting Development Session

```bash
# 1. Navigate to project directory
cd /path/to/project-root

# 2. Pull latest changes (if working with team)
git pull origin main

# 3. Install any new dependencies
cd "$(git rev-parse --show-toplevel)/src/backend" && npm install

# 4. Start development server
npm run dev
```

#### Development Server Features

**Auto-Reload Capability:**
- Watches for file changes in `.js` and `.json` files
- Automatically restarts server on changes
- Maintains console history and logs
- Preserves environment variables across restarts

**Development Logging:**
- `[INFO]:` and `[ERROR]:` level prefixes on console output, added only when `NODE_ENV=development`
- One request record per request — method, path and body — written before the request is routed (see section 5.4)
- Error stack traces with request context, written by the error-handling middleware when a route passes an error to `next(err)`
- No timestamps on routine records, and no response status, duration or performance metric is emitted; the only timestamps the application prints come from the error handler's context and from the startup-failure shutdown line

### 7.2 Code Editing and Testing

#### Recommended Development Cycle

1. **Code Changes**: Edit source files in your preferred editor
2. **Automatic Restart**: Nodemon detects changes and restarts server
3. **Testing**: Use curl or browser to test endpoints
4. **Debugging**: Review console logs for issues
5. **Iteration**: Repeat cycle for continuous development

#### File Watching Configuration

The committed `nodemon.json` sets which files are watched:
```json
{
  "watch": ["./"],
  "ext": "js,json",
  "ignore": [
    "tests/",
    "node_modules/",
    "package-lock.json"
  ]
}
```

### 7.3 Testing During Development

#### Manual Testing Workflow

```bash
# Terminal 1: Run development server
npm run dev

# Terminal 2: Test endpoints
curl http://localhost:3000/hello

# Test error conditions
curl http://localhost:3000/nonexistent

# Performance testing
time curl http://localhost:3000/hello
```

#### Integration Testing Setup

For more comprehensive testing:

```bash
# Run the test suites once; coverage is collected on every run
npm test

# Watch mode for continuous testing (read the prerequisites below first)
npm run test:watch
```

**Watch mode: prerequisite, fallback and how to stop it.** This is the canonical
procedure — the other places in this guide that mention watch mode refer back
here.

- `npm run test:watch` runs `jest --watch`, which decides which suites to re-run
  by asking your version-control system what changed. It therefore requires the
  tree to be a Git or Mercurial working copy. Outside one — for example in a
  directory unpacked from a source archive — it refuses to start and exits with
  status 1, printing: `--watch is not supported without git/hg, please use --watchAll`.
- In that situation, re-run every suite on each change instead. This needs no new
  npm script — pass the flag through to Jest: `npm test -- --watchAll`.
- Both watchers keep running until you stop them, holding the terminal. Press
  `Ctrl+C` in that terminal to exit. Stop them there rather than from another
  terminal, and never by killing Node processes by name.
- Do not use either watcher in CI or any other non-interactive context. `npm test`
  is the one-shot command, and it is what the CI workflow runs.

### 7.4 Debugging Strategies

#### Console Debugging

Leverage built-in console logging:

```javascript
// Add debug logging in your code
console.log('Debug: Request received:', req.method, req.path);
console.log('Debug: Response data:', responseData);
```

#### Node.js Inspector

Use Node.js built-in debugger:

```bash
# Start server with debugger
node --inspect server.js

# Connect with Chrome DevTools
# Open chrome://inspect in Chrome browser
```

#### Environment-Specific Debugging

```bash
# Debug mode with enhanced logging
DEBUG=* npm run dev

# Specific module debugging
DEBUG=express:* npm run dev
```

## 8. Troubleshooting

Comprehensive troubleshooting guide for common development environment issues.

### 8.1 Server Startup Issues

#### Port Conflicts (EADDRINUSE)

**Problem**: Port 3000 is already in use by another process.

**Diagnosis:**
```bash
# Check what's using port 3000
lsof -i :3000          # Linux/macOS
netstat -ano | findstr :3000  # Windows
```

**Solutions:**

1. **Stop the Process You Started** — identify the owner first, then stop that one
   process. The port number does not tell you whose process it is, and forcing an
   unrelated service to die can lose its in-flight work. `Ctrl+C` in the terminal
   running your server does this without any of the commands below.
   ```bash
   # Linux/macOS: resolve the owning PID, then confirm what it actually is.
   # An empty result means the port is free, or that lsof is not installed —
   # `ss -ltnp | grep :3000` and `fuser -n tcp 3000` are the alternatives.
   PORT_PID="$(lsof -ti :3000 || true)"
   if [ -n "$PORT_PID" ]; then
     ps -p "$PORT_PID" -o pid,ppid,command
   fi

   # Stop that one process with SIGTERM once you have confirmed it is yours
   if [ -n "$PORT_PID" ]; then
     kill "$PORT_PID"
   fi

   # Windows: read the PID from the netstat output and pass that number
   netstat -ano | findstr :3000
   taskkill /PID 12345 /F
   ```
   Escalate to `kill -9 "$PORT_PID"` only if `SIGTERM` has already failed, and
   never stop processes by name — `pkill node` would also kill unrelated editors,
   language servers and build tools.

2. **Use Alternative Port:**
   ```bash
   # Start on a different port for this run only - nothing on disk changes, and
   # the value takes precedence over any PORT in .env
   PORT=3001 npm start
   ```

   To make the change persistent, open `.env` in your editor and change the
   value on its existing `PORT` line - no other line needs to move. Do not
   redirect into the file to do it: `echo "PORT=3001" > .env` truncates the
   file and deletes every other setting it holds, and a shell redirection
   truncates its target before the command on the left has produced anything,
   so a failure part-way through loses the original as well. Editing the one
   line in place is both the smallest change and the only one that cannot lose
   the rest of the file.

3. **Configure Dynamic Port:**
   ```bash
   # Use environment variable
   PORT=0 npm start  # OS assigns available port
   ```

#### Permission Errors

**Problem**: Cannot bind to port due to permissions.

Ports below 1024 are privileged on Linux and macOS. Do not reach one by running the application with `sudo`: that puts a network-facing process on the network as root, and anything it writes, such as a log file or a coverage directory, ends up root-owned inside your checkout. Bind an unprivileged port instead.

**Solution for Privileged Ports (< 1024):**
```bash
# Use the default unprivileged port; no elevation involved
PORT=3000 npm start

# Any port at or above 1024 works the same way
PORT=8080 npm start
```

When a low port is genuinely required, put something in front of the application rather than elevating it: terminate port 80 or 443 in a reverse proxy (nginx, Caddy, a cloud load balancer) that forwards to this process on its unprivileged port, which is also how the container and Kubernetes manifests in this repository expose it. Locally, publishing a container port does the same job — `docker run -p 80:3000 nodejs-tutorial-app:latest` has the Docker daemon bind the privileged port, since it already holds that privilege, and leaves the application listening on 3000.

What this guide deliberately does not do is grant `cap_net_bind_service` to the Node binary. That capability attaches to the shared interpreter, not to this application, so **every** Node process on the machine — including anything a dependency in any other project starts — would gain the ability to bind privileged ports, and it would keep it until someone removes it. If a host genuinely needs the capability, scope it to one service instead of to the interpreter: run this application under its own service manager unit and grant the capability there, which for systemd means `AmbientCapabilities=CAP_NET_BIND_SERVICE` on that unit alone.

#### Node.js Version Incompatibility

**Problem**: Express.js 5.1.0 requires Node.js >= 18.0.0.

**Diagnosis:**
```bash
node --version
# Any version below v18.0.0 needs an upgrade: the package floor is >=18.0.0, so
# v17.x fails it exactly as v16.x does
```

**Solution:**
```bash
# Install Node.js v22.16.0 LTS
# Visit https://nodejs.org/ for installer
# Or use Node Version Manager (nvm)

# Using nvm (Linux/macOS)
nvm install 22.16.0
nvm use 22.16.0

# Using nvm-windows
nvm install 22.16.0
nvm use 22.16.0
```

### 8.2 Dependency Installation Issues

#### Network Connectivity Problems

**Problem**: npm install fails due to network issues.

**Solutions:**

1. **Check npm Registry:**
   ```bash
   npm config get registry
   # Should return: https://registry.npmjs.org/
   
   # That effective value can come from any of six places: a command-line flag,
   # an npm_config_* environment variable, a project .npmrc, your user .npmrc,
   # the global .npmrc, or npm's built-in default. This listing prints a
   # `; "<layer>" config from <path>` header for each source that actually set
   # something, and marks the values a later layer overrode - so it tells you
   # which layer to change, and a setting with no header behind it is coming
   # from npm's default rather than from any file.
   npm config list

   # Where the user-level file lives, for when the listing above shows no
   # section for it and you want to create it. This prints the path only -
   # never cat an .npmrc, which is also where auth tokens are kept.
   npm config get userconfig
   ```

   `--location=user` is not a filter on that listing: it selects which file
   `npm config set`, `get`, `delete` and `edit` operate on, and
   `npm config list --location=user` still prints values coming from the
   environment or the command line. Read provenance from the merged listing
   above, and use `--location` only when you are changing a specific file.

   If the registry is not the official one, that is usually deliberate, such as an organization proxy. Override it for a single command with the `--registry` flag instead of rewriting your saved configuration, which would apply to every project on the machine:

   ```bash
   npm ci --registry https://registry.npmjs.org/
   ```

2. **Repair the npm Cache:**
   ```bash
   npm cache verify
   npm ci
   ```

   `npm cache verify` deletes corrupted and unreferenced entries and keeps the rest. `npm cache clean --force` empties the machine-wide cache, so every other project on the host has to download its dependencies again; reach for it only when a verify has failed to help.

3. **Use Only an Approved Registry:**

   Install from the official registry, or from a mirror your organization operates and vouches for. A mirror serves every package in the dependency graph together with the integrity digests that describe them, so pointing at a third party is a supply-chain trust decision rather than a network workaround; an unaffiliated public mirror carries no provenance guarantee for this project.

   ```bash
   # Only with a registry your organization approves
   npm ci --registry "$NPM_REGISTRY"

   # Verify signatures against that same registry, not npm's saved default
   npm audit signatures --registry "$NPM_REGISTRY"
   ```

   These are two independent controls, and both need the registry named explicitly. `npm ci` fails when a downloaded tarball does not match the `integrity` digest recorded in `package-lock.json`, which holds whatever registry served it. `npm audit signatures` checks the registry's signatures over the installed packages, and each npm command resolves its own registry, so without the `--registry` flag it would query the default one instead of the mirror that actually served the install. A registry that publishes no signing keys cannot satisfy this control at all, so treat anything short of a clean verification of every installed package as unverified.

#### Disk Space Issues

**Problem**: Insufficient disk space for node_modules.

**Diagnosis:**
```bash
# Check available disk space
df -h .                    # Linux/macOS
dir                        # Windows

# Check node_modules size
du -sh node_modules        # Linux/macOS
```

**Solutions:**
1. Free up disk space
2. Reclaim npm cache space in place: `npm cache verify` reports the cache size and drops corrupted and unreferenced entries. `npm cache clean --force` empties the machine-wide cache and is a last resort, not a routine step.
3. Remove packages this project no longer declares: `npm prune` touches only `./node_modules`, and finds nothing to remove immediately after `npm ci`.

#### Package Vulnerability Issues

**Problem**: npm audit reports security vulnerabilities.

**Solutions:**

1. **Read the Advisory First:**
   ```bash
   npm audit --json
   npm audit --audit-level=moderate
   npm audit --audit-level=high
   ```

2. **Preview, Then Apply In-Range Fixes:**
   ```bash
   # Writes nothing; shows what would change
   npm audit fix --dry-run

   # Apply, then read the diff of the audited graph
   npm audit fix
   git diff -- package-lock.json
   ```

3. **Re-verify Before Committing the New Lockfile:**
   ```bash
   npm ci && npm audit && npm test
   ```

`npm audit fix --force` is not part of this procedure. It may install SemVer-major and out-of-range versions, moving the graph outside the ranges `package.json` declares and past the exact `express` pin, which is a dependency change nobody has reviewed. Where an advisory cannot be cleared in range, raise the declared range in `package.json` yourself, reinstall, and run the suite.

### 8.3 Runtime Errors

#### Module Not Found Errors

**Problem**: Cannot find module 'express' or other dependencies.

**Diagnosis:**
```bash
# Verify node_modules exists
ls -la node_modules/

# Check if express is installed
npm list express
```

**Solutions:**
1. **Reinstall Dependencies** — replace the installed tree, and keep the lockfile.
   ```bash
   # Remove only the installed tree
   rm -rf node_modules

   # Reinstall exactly the versions the committed lockfile pins
   npm ci
   ```
   Do not delete `package-lock.json` to clear an install error. It is the
   committed, audited dependency graph, and it is what `npm ci` — the command CI
   runs — installs from; deleting it makes `npm ci` fail outright and lets
   `npm install` resolve a fresh graph that can differ from the reviewed one. A
   missing or corrupt `node_modules` is fixed by reinstalling it, which is what
   the two commands above do.

2. **Verify Working Directory:**
   ```bash
   pwd  # Should be in src/backend
   ls package.json  # Should exist
   ```

#### Environment Variable Issues

**Problem**: A value you set is not reaching the application.

A missing `.env` is not this problem. Every setting has a built-in default, so
with no file present the application runs on those defaults - port 3000,
environment `development`, app name `node-tutorial-app` - and starting without
one is the expected clean-checkout behaviour. Work through this section only
when a value you did set is being ignored.

**Diagnosis:**
```bash
# Check if .env file exists (absent is normal - defaults apply)
ls -la .env

# List which keys are defined, without printing any values
grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env

# Test environment loading: list the keys dotenv parsed, or its error code
node -e "const r = require('dotenv').config(); console.log(r.error ? r.error.code : Object.keys(r.parsed));"

# Show what the application resolved - requiring the config module prints the
# same configuration summary the server prints at startup
node -e "require('./config');"
```

As in section 3.3, read individual keys with `grep -E '^KEY=' .env` rather than printing the file: a full dump reaches your shell history, your scrollback and any CI log that captured the command.

**Solutions:**
1. **Create a `.env` only if you need to override a default** - the application
   does not require one:
   ```bash
   cp .env.example .env
   ```

2. **Check how dotenv actually read the file:**

   Whitespace around `=` is not the problem: dotenv trims it, so `PORT = 3000`
   and `PORT=3000` parse to the same value. Two different things do bite, and
   the parsed key list above tells them apart - a key missing from that list was
   never parsed, while a key present in it that still has no effect lost to
   something already in the environment. Both are reproduced below against a
   throwaway file, so the results do not depend on what your own `.env` happens
   to contain:

   ```bash
   # A deliberately malformed file to demonstrate against. mktemp -d puts it in
   # a directory with a random name that only your account can read, so nothing
   # here touches the checkout or your own .env.
   FIXTURE_DIR="$(mktemp -d)"
   printf 'PORT=3001\nAPP_NAME tutorial\nNODE_ENV=development\n' > "$FIXTURE_DIR/.env"

   # 1. NEVER PARSED: the APP_NAME line has no `=`, so dotenv skips it in
   #    silence. This prints [ 'PORT', 'NODE_ENV' ] - APP_NAME is dropped
   #    without any warning, it is absent from the parsed key list, and the
   #    built-in default stays in force.
   node -e "console.log(Object.keys(require('dotenv').config({ path: process.argv[1] }).parsed));" "$FIXTURE_DIR/.env"

   # 2. PARSED BUT NOT APPLIED: a variable already present in the environment is
   #    never overwritten by the file, so the key still appears in the parsed
   #    list while a shell value decides what the application sees. This prints
   #    the configuration summary, then `parsed from file: 3001 | resolved: 9999`
   #    - dotenv reports the file value it parsed, the application resolves the
   #    environment value.
   PORT=9999 node -e "const r = require('dotenv').config({ path: process.argv[1] }); console.log('parsed from file:', r.parsed.PORT, '| resolved:', require('./config').port);" "$FIXTURE_DIR/.env"

   # Remove the fixture directory this block created
   rm -rf "$FIXTURE_DIR"
   ```

### 8.4 Performance Issues

#### Slow Server Response

**Problem**: Server responses taking > 100ms.

**Diagnosis:**
```bash
# Measure response time
time curl http://localhost:3000/hello

# Check server resource usage
top | grep node
ps aux | grep node
```

**Solutions:**

1. **Check System Resources:**
   - Available RAM
   - CPU usage
   - Disk I/O

2. **Restart Development Server:**
   ```bash
   # Stop server (Ctrl+C) and restart
   npm run dev
   ```

3. **Rule Out a Corrupt Dependency Tree:**
   ```bash
   # The npm cache affects installs, never a running server, so verifying it
   # proves nothing on its own: reinstall from the reviewed lockfile so the
   # restart below loads a freshly built node_modules. `npm cache clean
   # --force` is not used here; it would empty the machine-wide cache.
   npm cache verify
   npm ci
   
   # Restart your own server: stop it with Ctrl+C in the terminal running it
   # (or kill its exact PID, as in the port-conflict diagnosis above), then
   # start it again. Never restart by name with pkill node — that would kill
   # every Node process on the machine, including unrelated tooling.
   npm start
   ```

#### Memory Leaks

**Problem**: Node.js process memory usage continuously increasing.

**Diagnosis:**
```bash
# Monitor memory usage
ps -o pid,vsz,rss,comm -p $(pgrep node)

# Use Node.js memory profiling
node --inspect server.js
# Connect to Chrome DevTools Memory tab
```

**Solutions:**
1. Restart development server regularly
2. Review code for memory leaks
3. Use production-mode monitoring tools

### 8.5 Docker-Related Issues

#### Docker Image Build Failures

**Problem**: Docker build command fails.

**Diagnosis:**
```bash
# Check Docker daemon status
docker info

# Verify Dockerfile exists
ls -la infrastructure/docker/Dockerfile

# Check build context
ls -la .
```

**Solutions:**

1. **Start Docker Daemon:**
   ```bash
   # Linux
   sudo systemctl start docker
   
   # macOS/Windows: Start Docker Desktop
   ```

2. **Free Disk Space:**
   ```bash
   # See what the daemon is actually holding before removing anything
   docker system df

   # Inspect this project's containers, identified by the image they came from
   docker ps -a --filter ancestor=nodejs-tutorial-app:latest

   # Remove exactly those containers. The loop body runs once per match, so it
   # is a no-op when there are none and never touches an unrelated container.
   for id in $(docker ps -aq --filter ancestor=nodejs-tutorial-app:latest); do
     docker rm -f "$id"
   done

   # Then this project's image, once nothing references it any more
   docker image rm nodejs-tutorial-app:latest

   # Only if that is still not enough. Build cache is daemon-wide, so bound it
   # by age instead of clearing it wholesale.
   docker builder prune --filter 'until=24h'
   
   # Check available space
   df -h
   ```

   `docker system prune -a` is deliberately not used here. It reaches across the entire daemon, removing every stopped container, every unused network, every image without a running container and the whole build cache, including other projects' images and anything you cannot rebuild. If you ever do decide you want it, read `docker system df` first and accept the loss knowingly.

3. **Network Issues:**
   ```bash
   # Pull the base image to verify registry access. This is not a passive
   # connectivity test: it downloads layers and updates the local image cache
   # for node:22-alpine, which is also what the build needs.
   docker pull node:22-alpine

   # Read-only alternative: queries the registry for the image's manifest and
   # writes nothing to the local cache. Needs the buildx plugin, which current
   # Docker installations include.
   docker buildx imagetools inspect node:22-alpine
   ```

#### Container Runtime Issues

**Problem**: Container starts but application not accessible.

The steps below are one sequence in a single terminal: the diagnosis names the
container, the solutions act on that same container, and the last step removes
it. Run them in order, and run the cleanup even if you stop early — the
container holds the published port until you do. Unlike the self-contained check
in section 6.4, this procedure cannot put its cleanup in a trap: the container
has to outlive each block so the next step can inspect it, so removal is step 3
and it is yours to run. It removes the exact ID captured here and nothing else.

**Diagnosis:**
```bash
# Check containers, including ones that have already exited
docker ps -a

# The container this procedure works on. If you already have one running from
# section 6.4, put its name here; otherwise leave this and step 1 starts it.
CONTAINER_NAME="nodejs-tutorial-test-$$"

# Resolve that exact container into a quoted variable, so no placeholder has to
# be substituted by hand. The `^/` and `$` anchors are required: Docker matches
# `name=` as a substring, so an unanchored filter also returns every container
# whose name merely contains this one, and two matches would put two IDs in the
# variable. An empty result means it is not there, and step 1 below starts it.
CONTAINER_ID="$(docker ps -aqf "name=^/${CONTAINER_NAME}$")"

# If it exists, read its output and the specific state fields you need
if [ -n "$CONTAINER_ID" ]; then
  docker logs "$CONTAINER_ID"
  docker inspect --format 'status={{.State.Status}} exit={{.State.ExitCode}} ports={{json .NetworkSettings.Ports}}' "$CONTAINER_ID"
fi
```

Ask `docker inspect` for the fields you need, as above. Without `--format` it
prints the container's entire configuration, and that includes `Config.Env` —
every environment value the container was started with — so a full dump is the
wrong thing to leave in a terminal you share, paste into an issue, or let a CI
job record.

**Solutions:**

1. **Port Mapping** — start the container with the port published, capturing the
   ID `docker run` prints so the checks below have something to address.
   ```bash
   # Start one only if the diagnosis found none. A non-empty $CONTAINER_ID means
   # that container already exists, so this never starts a duplicate under the
   # same name - and nothing is force-removed first, because a name still in use
   # should make docker run report the conflict rather than have you delete a
   # container you did not create.
   if [ -z "$CONTAINER_ID" ]; then
     CONTAINER_ID="$(docker run -d --name "$CONTAINER_NAME" -p 3000:3000 nodejs-tutorial-app:latest)"
   fi

   # Every command below addresses $CONTAINER_ID, so establish first that there
   # is a running container behind it. Two different failures land here: a name
   # conflict, where docker run prints nothing and the variable stays empty; and
   # a port conflict, where the container is created but never starts, so the ID
   # exists while the state reads `created`. Step 3 removes it either way.
   if [ -z "$CONTAINER_ID" ] ||
      [ "$(docker inspect --format '{{.State.Status}}' "$CONTAINER_ID" 2>/dev/null)" != running ]; then
     echo "no running container to diagnose; resolve the docker run error above" >&2
   else
     # Wait for it to answer, recording whether it ever did - a bare loop would
     # finish successfully after 30 failed probes, because its last act is a sleep
     READY=no
     for _ in $(seq 1 30); do
       if curl -fsS http://localhost:3000/hello; then READY=yes; break; fi
       sleep 1
     done

     # Its own output is the next thing to read, but only if it stayed silent
     if [ "$READY" = no ]; then
       docker logs "$CONTAINER_ID" >&2
       echo "container $CONTAINER_ID did not answer within 30 seconds" >&2
     fi
   fi
   ```

   Steps 2 and 3 both address `$CONTAINER_ID`. If the block above printed `no
   running container to diagnose`, then nothing below is measuring the
   application — deal with what `docker run` reported first. Step 3 is still
   worth running: a container that was created but never started is holding the
   name until you remove it.

2. **Container Health:**
   ```bash
   # Read the verdict the image's own HEALTHCHECK already recorded. It reports
   # "starting" until the first probe succeeds, so give it a few seconds.
   docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_ID"

   # Probe the endpoint from the host, through the published port
   curl -i http://localhost:3000/hello

   # Or probe from inside the container. The image is Alpine-based and installs
   # no curl, so use wget — the same tool its HEALTHCHECK uses.
   docker exec "$CONTAINER_ID" wget -qO- http://localhost:3000/hello
   ```
   The `docker exec` form above is a single non-interactive command. Do not use
   `docker exec -it … sh` and then type `curl` at the container's shell: that
   shell has no curl, and the interactive session will not exit on its own.

3. **Clean up** — remove the container this procedure started, by the ID it was
   started under, which also releases the host port:
   ```bash
   docker rm -f "$CONTAINER_ID"
   ```

## 9. Advanced Configuration

Advanced configuration options for experienced developers and production-like development environments.

### 9.1 Environment-Specific Configuration

Everything in this subsection is an extension you build yourself. The shipped
application loads exactly one file: `config/index.js` line 3 calls
`require('dotenv').config()` with no arguments, which reads `.env` from the
working directory and nothing else. Creating `.env.development` or
`.env.production` therefore has no effect on its own - the wiring change under
"Dynamic Environment Loading" below is what makes these files matter.

#### Multiple Environment Files

Before you create any of these files, check that Git ignores the name you
choose. `src/backend/.gitignore` ignores `.env` (line 9), `.env.test`
(line 104), `.env.production` (line 105), `.env.local` (line 106) and
`.env.development.local` (line 107) - but **not** the bare name
`.env.development`. Use the ignored `.env.development.local` for your local
development values, or add `.env.development` to `src/backend/.gitignore`
yourself before putting anything in it. An environment file that Git does not
ignore is one `git add .` away from being published.

```bash
# Create environment-specific files - each name below is already git-ignored
cp .env.example .env.development.local
cp .env.example .env.test
cp .env.example .env.production

# Verify that before writing anything sensitive into them. Each name must print
# the .gitignore rule that matches it; "NOT IGNORED" means stop and add the
# pattern first.
for f in .env.development.local .env.test .env.production; do
  git check-ignore -v "$f" || echo "NOT IGNORED: $f"
done
```

Git ignoring a file is not the same as Docker ignoring it, and the second check
matters just as much. The root `.dockerignore` excludes the exact names `.env`
and `.env.example`; `**/.env` does not match a suffixed name, so every
`.env.<something>` file you create under `src/backend/` stays in the build
context that `infrastructure/docker/Dockerfile` copies with
`COPY src/backend/ ./`, and it lands in the image and its layers. This is
measured, not theoretical: with the three files above in place, a build from the repository
root produced an image containing `/usr/src/app/.env.production` and the secret
inside it, while a plain `.env` was correctly excluded.

Keep credentials out of every file below `src/backend/`, or add a pattern such
as `**/.env.*` to the root `.dockerignore` before building. Either way, check
the image rather than assuming:

```bash
# Build from the repository root - both build contexts are the repository root,
# while the rest of this guide runs in src/backend, so move there and back
cd "$(git rev-parse --show-toplevel)"
docker build --file infrastructure/docker/Dockerfile --tag tutorial-env-check .

# `no environment files in image` is the result you want: it is the fallback the
# command prints when the listing finds nothing. A printed `.env*` filename is
# the failure - that file is shipped inside the image.
docker run --rm --entrypoint sh tutorial-env-check -c 'ls -a /usr/src/app | grep "^\.env" || echo "no environment files in image"'

# Return to the directory the following blocks expect
cd "$(git rev-parse --show-toplevel)/src/backend"
```

**Environment File Organization:**

```env
# .env.development.local
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug        # read by no module - see section 3.1
HOST=localhost         # recorded and printed, not used to bind

# .env.test
NODE_ENV=test
PORT=3001
LOG_LEVEL=error        # read by no module
HOST=localhost         # recorded and printed, not used to bind

# .env.production
NODE_ENV=production
PORT=80
LOG_LEVEL=warn         # read by no module
HOST=0.0.0.0           # recorded and printed, not used to bind
```

Only `NODE_ENV` and `PORT` above change what the application does. `HOST` is
read into `config.host` and printed at startup but does not affect which
interface is bound, and `LOG_LEVEL` is read by no module at all.

#### Dynamic Environment Loading

The loader below chooses one of those files. `NODE_ENV` is untrusted input, so it
never becomes part of the path: each accepted name maps to one fixed filename
through an allowlist, and an unrecognised value falls back to development
instead of resolving somewhere else entirely. Interpolating the variable
straight into the path - `` `.env.${process.env.NODE_ENV}` `` - lets a value
such as `x/../../../../etc/passwd` escape the directory, which is why the
allowlist is not optional.

```javascript
// src/backend/config/environment.js - an extension you add; not in the repository
const path = require('path');

// Allowlist: NODE_ENV is never interpolated into the path itself. Using
// hasOwnProperty rather than a bare index also rejects inherited keys such as
// '__proto__' and 'constructor'.
const ENV_FILES = {
  development: '.env.development.local',
  test: '.env.test',
  production: '.env.production'
};

const envName = process.env.NODE_ENV || 'development';
const envFile = Object.prototype.hasOwnProperty.call(ENV_FILES, envName)
  ? ENV_FILES[envName]
  : ENV_FILES.development;

// __dirname is src/backend/config, so '..' is the package directory.
const result = require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

// A missing file is not an error: every setting in config/index.js has a
// literal default, so absent values simply leave those defaults in place.
if (result.error && result.error.code !== 'ENOENT') {
  throw result.error;
}

module.exports = { envName, envFile, parsed: result.parsed || {} };
```

**Wiring it up.** Nothing imports that module until you change the single line
that loads dotenv today. In `src/backend/config/index.js`, replace line 3:

```javascript
require('dotenv').config();   // shipped behaviour: loads ./.env only
```

with:

```javascript
require('./environment');     // loads the file NODE_ENV maps to
```

**Precedence**, strongest first: a variable already set in the shell
(`PORT=3001 npm start`) always wins, because dotenv never overwrites an existing
`process.env` entry; then the values in whichever file was loaded; then the
literal defaults in `config/index.js`. Loading more than one file does not merge
them in the order you might expect - the first load to define a key keeps it, so
load the most specific file first.

### 9.2 Development Server Customization

#### Nodemon Custom Configuration

`nodemon.json` already exists in the backend directory and is committed with the
project. This is its contents:

```json
{
  "watch": ["./"],
  "ext": "js,json",
  "ignore": [
    "tests/",
    "node_modules/",
    "package-lock.json"
  ]
}
```

Paths are resolved relative to `src/backend`, because that is the directory
`npm run dev` runs in. There is deliberately no `exec` key: nodemon derives the
command from the script argument in `package.json` (`nodemon server.js`), so the
entry point is named in one place rather than two that have to agree.

Nodemon supports further keys you may add to this file if you want them, such as
`delay` to debounce rapid successive changes, `verbose` for detailed restart
output, `restartable` to set a manual restart command, and `env` to inject
environment variables. None of them is part of the committed configuration.

#### Custom npm Scripts

Add development convenience scripts to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "dev:debug": "nodemon --inspect server.js",
    "dev:watch": "nodemon --watch src --watch config server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix"
  }
}
```

### 9.3 Logging Configuration

#### Structured Logging Setup

This is an optional enhancement rather than part of the committed application: it replaces the hand-written console logger in `src/backend/utils/logger.js` with Winston and daily log rotation.

```bash
# Install Winston logging library
npm install winston winston-daily-rotate-file
```

**Logging Configuration Example:**

Three properties of the current module have to survive the replacement, or its callers break:

1. the **named export** `{ logger }` — `server.js`, `middleware/requestLogger.js` and `middleware/errorHandler.js` all destructure it;
2. **variadic** `info(...params)` and `error(...params)`, because call sites pass several arguments in one call: the request logger passes seven, and the error handler passes a context object alongside its message;
3. an **`error` listener on every transport** — a transport that cannot write (a full disk, wrong permissions, a rotation failure) emits `'error'`, and an unhandled `'error'` event on an `EventEmitter` is thrown, so one failed log write would terminate the process.

The version below is a complete replacement for the file, not an addition to it:

```javascript
// src/backend/utils/logger.js — complete replacement
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { inspect } = require('node:util');

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
});

const rotateTransport = new DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});

// Required: without these listeners, a failed log write terminates the process.
consoleTransport.on('error', (err) => {
  process.stderr.write(`logger console transport error: ${err.message}\n`);
});
rotateTransport.on('error', (err) => {
  process.stderr.write(`logger file transport error: ${err.message}\n`);
});

const winstonLogger = winston.createLogger({
  // LOG_LEVEL is read by no module in the shipped application; adopting this
  // replacement is what gives the variable an effect.
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [consoleTransport, rotateTransport]
});

// Join the variadic arguments the existing call sites pass into a single
// message, so logger.info('HTTP Request -', 'Method:', 'GET', ...) keeps working.
const render = (params) =>
  params
    .map((value) => (typeof value === 'string' ? value : inspect(value, { depth: 3 })))
    .join(' ');

const logger = {
  info: (...params) => winstonLogger.info(render(params)),
  error: (...params) => winstonLogger.error(render(params))
};

// Preserve the export shape the application already depends on.
module.exports = { logger };
```

`logs` and `*.log` are already ignored by `.gitignore`, so rotated files stay out of version control. Note that adopting this module replaces the `[INFO]:`/`[ERROR]:` prefixes described in section 5.4 with Winston's own formatting.

### 9.4 Security Enhancements

#### HTTP Security Headers

Install and configure Helmet.js for security headers:

```bash
# Install security middleware
npm install helmet cors rate-limiter-flexible
```

**Security Configuration:**

```javascript
// middleware/security.js
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiting configuration. Constructing a limiter enforces nothing on its
// own: a request has to consume a key, which is what the middleware below does.
const rateLimiter = new RateLimiterMemory({
  points: 100, // Requests allowed per key
  duration: 60, // Per 60 seconds
});

// The limiter's key is req.ip, which is the socket peer address unless Express
// is configured to trust a proxy. The committed application does not configure
// one, so the key is not client-controlled and is safe as it stands.
//
// Behind a load balancer, do NOT blanket-trust forwarding headers with
// app.set('trust proxy', true): a client can then supply its own
// X-Forwarded-For, rotate the value and evade the limit entirely. Name the
// trust boundary explicitly instead - a subnet, a hop count or a predicate -
// and make the last trusted proxy overwrite X-Forwarded-For rather than
// append to it:
//     app.set('trust proxy', '10.0.0.0/8'); // or a hop count, or a function
// Until that boundary is established, leave the setting off and keep the
// socket-derived key. See https://expressjs.com/en/guide/behind-proxies.html
const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch((rejection) => {
      // A real Error here is a limiter failure rather than a rejected request,
      // so it belongs on the error-handling path.
      if (rejection instanceof Error) {
        next(rejection);
        return;
      }

      const retryAfterSeconds = Math.ceil(rejection.msBeforeNext / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error: 'Too Many Requests',
        status: 429,
        retryAfterSeconds
      });
    });
};

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  cors: cors(corsOptions),
  rateLimiter: rateLimiterMiddleware
};
```

The policy above allows no inline styles or scripts. `'unsafe-inline'` is left out on purpose: adding it to a directive re-permits exactly the injected markup a Content Security Policy exists to block, so it undoes the protection for every response rather than for one page. This application has nothing that needs it, since `GET /hello` returns an eleven-byte string and serves no HTML, CSS or JavaScript of its own.

If you later add a page that genuinely requires an inline `<style>` or `<script>`, keep the directive strict and admit that one element explicitly. A nonce is per request, so it cannot be a literal in the module-scope object above: generate it in a middleware registered before Helmet, and have the directive read it from the response through a Helmet directive callback.

```javascript
// middleware/cspNonce.js - register this before the helmet middleware
const crypto = require('crypto');

function cspNonce(req, res, next) {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
}

// Then, in the helmet directives, read the nonce per request
const directives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", (req, res) => `'nonce-${res.locals.cspNonce}'`]
};

module.exports = { cspNonce, directives };
```

Emit the same value as a `nonce` attribute on the one element that needs it. The static alternative needs no middleware: take the SHA-256 digest of the exact inline block and add it to the directive in its quoted source form, `'sha256-<base64-digest>'`, which admits that block and nothing else.

Either approach admits one snippet you chose. A blanket exception admits every snippet, including an attacker's, which is why none is configured above.

Mount the exported middleware in `app.js` ahead of the router, so the limit applies before a request is routed:

```javascript
const security = require('./middleware/security');

app.use(security.helmet);
app.use(security.cors);
app.use(security.rateLimiter);
```

### 9.5 Performance Monitoring

#### Application Performance Monitoring

Node.js ships the profilers this application needs, so the starting point requires no dependency at all:

```bash
# Keep diagnostic output out of the checkout: profile files are not covered by
# .gitignore. Send it to a directory mktemp -d creates under a random name
# rather than a fixed path such as /tmp/node-profiles - a predictable name in a
# shared directory can already exist, be readable by other accounts, or be
# replaced between the profile run and the moment you read the report.
PROFILE_DIR="$(mktemp -d)"

# Everything below writes into that directory, so stop if it was not created:
# with an empty variable the profilers fall back to the working directory,
# which is the checkout this block exists to keep clean.
[ -d "$PROFILE_DIR" ] || echo "mktemp -d failed; do not run the commands below" >&2

# mktemp -d already restricts the directory to your account; setting the mode
# explicitly states that requirement rather than relying on the default
chmod 700 "$PROFILE_DIR"

# If this shell is interrupted or terminated before you reach the removal at the
# end, take the directory with it. An interrupted profile run writes no report -
# see the note below - so nothing is lost, and nothing is left behind either.
# The trap is not on EXIT: the reports are the point of the exercise and you
# need them to survive the block long enough to open them.
trap 'rm -rf -- "$PROFILE_DIR"' INT TERM

# CPU profile: writes CPU.<date>.<time>.<pid>.<n>.cpuprofile into the chosen
# directory, which loads in Chrome DevTools (Performance panel) or VS Code
node --cpu-prof --cpu-prof-dir="$PROFILE_DIR" server.js

# Heap allocation profile: writes Heap.<date>.<time>.<pid>.<n>.heapprofile the
# same way, which loads in the Chrome DevTools Memory panel
node --heap-prof --heap-prof-dir="$PROFILE_DIR" server.js

# Live inspection: attach chrome://inspect or a VS Code debug session. This
# writes nothing to disk and needs no exit
node --inspect server.js

# Remove the reports when you are finished reading them, and drop the trap with
# them so it does not outlive this block. This deletes the one directory the
# block created, named in $PROFILE_DIR, and nothing else.
trap - INT TERM
rm -rf -- "$PROFILE_DIR"
```

Both profile flags write their report **only when the process exits cleanly**, and this server registers no `SIGINT` or `SIGTERM` handler: interrupting it with Ctrl+C terminates it before anything is written. Measured on Node.js v22, neither `SIGINT` nor `SIGKILL` produces a file. So for a long-running server use `node --inspect` and record in DevTools, and keep the two profile flags for a workload that exits on its own.

Hosted APM agents (New Relic, Datadog, Elastic APM and similar) are an optional addition. Each has its own installation and configuration procedure and their agent APIs change between major versions, so follow the vendor's current documentation rather than a snippet reproduced here.

**Clinic is historical, and this guide does not run it.** The top-level `clinic` package is a command-line tool and exposes no `start()` entry point for application code to call, and the project is no longer actively maintained — version 13.0.0 was published in June 2023. It is not a dependency of this project, so reaching it through `npx` would download and execute whichever version the registry serves at that moment, outside the audited `package-lock.json` everything else here installs from, and an unmaintained profiler can fail or report inaccurately with no one to fix it. The built-in profilers above cover the same ground and are part of the runtime you already have. If you do need Clinic to reproduce a historical measurement, install an exact version into a throwaway project of its own — never into this checkout — drive it from the command line with `--dest` pointing outside any repository, since it otherwise writes into `.clinic/` in the working directory, and treat what it reports as unsupported.

**Performance Monitoring Setup:**

Sampling the process's own memory needs only public Node.js APIs:

```javascript
// monitoring/performance.js
const monitorMemory = () => {
  const usage = process.memoryUsage();
  console.log(`Memory Usage: RSS=${Math.round(usage.rss / 1024 / 1024)}MB, Heap=${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
};

// Sample every 30 seconds in development only
if (process.env.NODE_ENV === 'development') {
  const memoryTimer = setInterval(monitorMemory, 30000);

  // Do not let a monitoring timer hold the event loop open on shutdown
  memoryTimer.unref();
}
```

For a one-off figure without adding any code, use the PID-scoped measurement in section 5.2 instead.

### 9.6 Database Integration (Future Enhancement)

#### Database Connection Configuration

Prepare for future database integration:

```env
# Database configuration (future use)
DATABASE_URL=postgresql://user:password@localhost:5432/tutorial_db
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/tutorial_db
```

**Database Configuration Module:**

```javascript
// config/database.js (for future use)
const fs = require('fs');

const config = {
  development: {
    dialect: 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'tutorial_dev'
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgresql',
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        // Keep certificate verification enabled. Setting this to false accepts
        // any certificate presented, including an attacker's (CWE-295).
        rejectUnauthorized: true,
        // Trust the CA that signed the database server's certificate. Omit this
        // when that CA is already in the host's system trust store.
        ca: process.env.DB_CA_CERT_PATH
          ? fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf8')
          : undefined
      }
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

Never disable certificate verification to make a TLS connection succeed. With `rejectUnauthorized: false`, the client accepts whatever certificate it is handed, so anything sitting on the network path can present its own, terminate the connection, read the credentials carried in `DATABASE_URL` and relay the traffic onward undetected. That is CWE-295, improper certificate validation, and it fails silently: the connection works, which is precisely why the setting survives into production.

A self-signed certificate on a local database is not a reason to turn the check off; it is a reason to trust that one certificate. Keep `rejectUnauthorized: true` and either point `DB_CA_CERT_PATH` at the certificate that signed it, as the `ca` option above does, or export `NODE_EXTRA_CA_CERTS=/absolute/path/to/ca.pem` before starting the process so the whole runtime trusts it. Both keep verification in force and confine the exception to the one certificate you chose, and neither belongs in a production environment, where the server's certificate should be signed by a CA the host already trusts.

## 10. Next Steps

After successfully setting up your development environment, consider these next steps for continued learning and development.

### 10.1 Application Enhancement

#### Add More Endpoints

Extend the application with additional endpoints:

```javascript
// routes/api.js (future enhancement)
const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

// Version endpoint
router.get('/version', (req, res) => {
  const packageJson = require('../package.json');
  res.json({
    name: packageJson.name,
    version: packageJson.version,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV
  });
});

module.exports = router;
```

#### Implement Request Validation

Add input validation middleware:

```bash
# Install validation libraries
npm install joi express-validator helmet
```

#### Add Testing Framework

Jest and Supertest are already declared as development dependencies and are
installed by `npm ci`, and the committed suites run under a 90% coverage gate.
Extend that coverage as the application grows:

```bash
# Run the existing suites with a coverage report
npm run test:coverage

# Re-run continuously while adding cases. Watch mode needs a Git or Mercurial
# checkout and holds the terminal until you press Ctrl+C; see §7.3 for the
# prerequisite and the --watchAll fallback.
npm run test:watch
```

Add unit cases alongside each new route or middleware module you introduce, and
deepen the assertions in the existing suites so they check response values
rather than only status codes.

### 10.2 Production Deployment Preparation

#### Environment Configuration

Create production environment files. Of the keys below, only `NODE_ENV` and
`PORT` change what the application does - `config/index.js` is its only reader
of `process.env`. `HOST` is read into `config.host` and printed at startup, but
it does not select the bound interface, so setting it changes the startup
summary and nothing else. Everything under "Security settings" and "Database settings" is
a placeholder for a capability this tutorial does not contain, and setting it
has no effect until you add the code that reads it:

| Key | Consumed today | What it would require |
|---|---|---|
| `NODE_ENV`, `PORT` | Yes | Nothing - both are read by `config/index.js` |
| `HOST` | Read and printed, not used to bind | A `listen(config.port, config.host)` call, deliberately not made |
| `LOG_LEVEL` | No | A logger that accepts a level; `utils/logger.js` switches on `NODE_ENV` alone |
| `SESSION_SECRET` | No | Session middleware - none is installed |
| `JWT_SECRET` | No | Authentication - the application has none |
| `ALLOWED_ORIGINS` | No | CORS middleware - none is installed |
| `DATABASE_URL` | No | A database client - the application has none |
| `REDIS_URL` | No | A Redis client - the application has none |

```env
# .env.production
NODE_ENV=production
PORT=80

# Read into config.host and printed at startup; does not affect binding
HOST=0.0.0.0

# Every key from here down is inert in this application - see the table above.
# Do not put real credentials in a file under src/backend/: that directory is
# inside the Docker build context and any .env.<suffix> file in it is copied
# into the image (section 9.1).
LOG_LEVEL=warn

# Security settings (inject at deploy time from a secret manager; never commit)
SESSION_SECRET=__SET_AT_DEPLOY_TIME__
JWT_SECRET=__SET_AT_DEPLOY_TIME__
ALLOWED_ORIGINS=https://yourdomain.com

# Database settings (when needed)
DATABASE_URL=your-production-database-url
REDIS_URL=your-production-redis-url
```

The two secret values above are non-runnable placeholders, not examples to copy. A readable string such as `your-secure-session-secret` is guessable, and once pasted it tends to reach production unchanged. Generate a distinct high-entropy value for each secret, and reuse none of them across environments:

```bash
# 32 bytes of CSPRNG output, URL-safe. Run once per secret.
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Keep the generated values out of version control and out of the image. Hold them in your platform's secret store, such as Kubernetes Secrets, GCP Secret Manager, AWS Secrets Manager or HashiCorp Vault, and inject them as environment variables at deploy time. `src/backend/.gitignore` already ignores `.env.production` inside the backend package, so a copy written there stays untracked; the repository root carries no such rule, so a file placed there would not be ignored. Rotate any secret that has ever been committed, pasted into a terminal transcript or printed by a CI job, because a disclosed secret stays disclosed until it is replaced.

#### Docker Production Configuration

The production image is already committed as `infrastructure/docker/Dockerfile`:
a multi-stage build on `node:22-alpine` that installs production-only
dependencies with `npm ci --omit=dev`, runs as a non-root user, and health-checks
`/hello` with `wget`. Extend that file rather than writing a parallel one.

Its build context is the **repository root** — that is what both the Compose file
and the CD workflow declare — so build it from there and point at the file with
`-f`:

```bash
cd "$(git rev-parse --show-toplevel)"
docker build -f infrastructure/docker/Dockerfile -t nodejs-tutorial-app:latest .
```

If you do author a variant, it has to resolve its paths against that same root
context. The manifests live in `src/backend/`, not at the context root, so a
bare `COPY package*.json ./` finds nothing and the build fails on the first
instruction that needs them:

```dockerfile
# Dockerfile.production — place at the repository ROOT and build from there:
#   docker build -f Dockerfile.production -t nodejs-tutorial-app:prod .
FROM node:22-alpine AS production

WORKDIR /usr/src/app

# The manifests are under src/backend/ in the root build context
COPY src/backend/package.json src/backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the application sources to the same directory, so server.js sits at the
# WORKDIR root. The repository's .dockerignore keeps tests, jest.config.js, the
# env files and any local node_modules out of the context.
COPY src/backend/ ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

Two details that are easy to get wrong here. The first is the install flag:
`--omit=dev` is npm's current spelling and `--only=production` is its deprecated
predecessor, so the variant above passes `--omit=dev` alone. The committed
Dockerfile passes both — `npm ci --omit=dev --only=production` — which is
redundant rather than wrong; copy `--omit=dev` from it and leave the legacy flag
out of anything you write.

The second is the port. `EXPOSE` is documentation only, and the process listens
on whatever `PORT` selects, defaulting to 3000 — so keep the two consistent, let
the image keep that single internal port, and choose the externally visible port
when you run the container (`docker run -p 80:3000 …`) rather than by setting
`PORT=80` inside the image. Publishing a different host port needs no rebuild,
and every consumer of this image — the `HEALTHCHECK`, the Kubernetes probes and
the Compose service — addresses port 3000 inside the container.

#### CI/CD Pipeline Setup

Continuous integration is already configured — `.github/workflows/ci.yml` runs on
every push and pull request against `main`. Read and extend that file rather than
copying a pipeline out of this guide: it is the single source of truth for the
action versions and the Node version this project builds against, so it cannot
go stale the way a snippet here would.

What it does today, in order:

1. `actions/checkout` checks out the repository.
2. `actions/setup-node` selects Node.js `22.x` and enables the npm cache, keyed on `src/backend/package-lock.json`.
3. `npm ci` installs from the committed lockfile.
4. `npm audit` runs with no `--audit-level`, so any advisory fails the build.
5. `npm test` runs the suites, with the 90% coverage gate applied on every run.

Every npm step declares `working-directory: ./src/backend`, and that is not
optional: there is no `package.json` at the repository root, so an npm command
run from there fails before it does any work. Give any step you add the same
working directory:

```yaml
    - name: Additional check
      working-directory: ./src/backend
      run: npm test -- --ci
```

The indentation above matches the committed workflow, where the `steps:` entries
sit at four spaces — paste it at a different depth and the file stops being valid
YAML.

Take the `uses:` versions from the committed workflow when you add a step, and
upgrade them there — in one place — rather than in this document.

### 10.3 Learning Resources

#### Node.js and Express.js

- **Official Documentation**: [Node.js Docs](https://nodejs.org/docs/), [Express.js Guide](https://expressjs.com/)
- **Advanced Topics**: Streams, Clustering, Worker Threads
- **Security**: [Node.js Security Best Practices](https://nodejs.org/en/learn/getting-started/security-best-practices)

#### JavaScript ES2022+ Features

- Async/await patterns
- Modern module systems (ESM)
- Promise-based APIs
- Error handling strategies

#### Development Tools

- **Debugging**: Node.js Inspector, VS Code integration
- **Testing**: Jest, Supertest, Cypress
- **Monitoring**: PM2, New Relic, DataDog

### 10.4 Community and Support

#### Getting Help

- **Stack Overflow**: Tag questions with 'node.js', 'express.js'
- **GitHub Issues**: Report issues in respective repositories
- **Discord/Slack**: Join Node.js and Express.js communities

#### Contributing

- **Open Source**: Contribute to Node.js, Express.js projects
- **Documentation**: Improve project documentation
- **Code Reviews**: Participate in community code reviews

### 10.5 Production Considerations

#### Scaling Strategies

When your application grows beyond tutorial scope:

1. **Horizontal Scaling**: Multiple server instances
2. **Load Balancing**: Distribute traffic across instances
3. **Clustering**: Utilize multiple CPU cores
4. **Microservices**: Decompose into smaller services

#### Monitoring and Observability

Production monitoring requirements:

1. **Application Monitoring**: Performance metrics, error tracking
2. **Infrastructure Monitoring**: Server resources, network
3. **Log Aggregation**: Centralized logging with ELK stack
4. **Alerting**: Automated incident response

#### Security Hardening

Production security checklist:

1. **HTTPS/TLS**: Encrypt all communications
2. **Authentication**: Implement user authentication
3. **Authorization**: Role-based access control
4. **Input Validation**: Sanitize all user inputs
5. **Security Headers**: Comprehensive HTTP security headers

---

## Conclusion

You have set up the development environment for the tutorial application and verified it end to end. This foundation provides:

- **Node.js v22.16.0**: the runtime version this project targets and is tested against
- **Express.js 5.1.0**: the exact pinned framework version, with Express 5's promise-aware routing and automatic propagation of errors thrown in async handlers
- **Development Tools**: automatic restart through Nodemon, Jest and Supertest suites behind a 90% coverage gate, and Node.js's built-in inspector and profilers
- **Deployment material, unverified**: a multi-stage Dockerfile, a Compose file, Kubernetes manifests and a CD workflow are committed, but none is verified end to end — Docker Compose and the deployment pipeline have known defects. Treat sections 9 and 10 as a starting point for further work rather than as a production configuration.

The tutorial application demonstrates fundamental concepts while establishing patterns that carry over to larger applications. Continue building on this foundation as you learn.

**Happy coding! 🚀**