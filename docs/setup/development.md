# Local Development Setup Guide

This comprehensive guide provides step-by-step instructions for setting up the Node.js tutorial application on your local machine for development and testing purposes. The setup process creates a robust development environment on Node.js 22.x LTS with Express 5.x - validated on Node v22.23.2, npm 11.18.0 and Express 5.2.1.

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
- **Validated on**: Node.js v22.23.2 (the 22.x LTS line, codename 'Jod')
- **Minimum**: Node.js v18.0.0, which is what `package.json` declares (Express 5 requires 18 or higher)
- **Practical floor**: Node.js 20 or 22 for `npm ci`, `npm test` and `npm run dev` - Jest 30 and nodemon's dependency tree declare narrower engine ranges than `package.json` does, and on 18.x npm reports them as unsupported
- **Justification**: the 22.x line is an LTS line, so it receives critical updates and security support; check <https://nodejs.org/en/about/previous-releases> for the phase it is in now

**Installation Verification:**
```bash
node --version
# Should display: v22.23.2 - the exact runtime this tutorial is validated against
```

**Download Location**: [https://nodejs.org/](https://nodejs.org/)

**LTS Benefits:**
- Production applications should only use Active LTS or Maintenance LTS releases
- Node.js v22.x integrates the V8 12.4 JavaScript engine with performance optimizations (v22.23.2 reports `12.4.254.21-node.56` in `process.versions.v8`)
- Cross-platform compatibility (Windows, macOS, Linux)
- Enhanced security with ReDoS attack mitigation

#### npm Package Manager (Required)
- **Validated on**: npm 11.18.0
- **Minimum**: npm v8.0.0, which is what `package.json` declares
- **Status**: Bundled with Node.js installation

**Installation Verification:**
```bash
npm --version
# Should display: 11.18.0 - the exact npm this tutorial is validated against
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
```

**Docker Benefits:**
- Consistent environment across development machines
- Production-like deployment testing
- Isolated dependency management
- Container orchestration preparation

### 1.3 System Requirements

#### Operating System Compatibility
- **Windows**: Windows 10/11 (64-bit)
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Ubuntu 18.04+, CentOS 7+, or equivalent distributions

#### Hardware Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: 500MB free space for dependencies
- **CPU**: Any modern x64 processor

### 1.4 Development Tools (Recommended)

#### Code Editor
- **Recommended**: Visual Studio Code with Node.js extensions
- **Alternatives**: WebStorm, Sublime Text, Vim/Neovim

#### Terminal/Command Line
- **Windows**: PowerShell, Git Bash, or Windows Terminal
- **macOS**: Terminal.app or iTerm2
- **Linux**: Any modern terminal emulator

## 2. Installation

Follow these comprehensive steps to clone the repository and install all necessary dependencies for the Node.js tutorial application.

### 2.1 Repository Cloning

#### Step 1: Clone the Repository

Open your terminal and execute the following commands to clone the project repository:

```bash
git clone <repository-url>

cd <project-directory>
```

#### Step 2: Verify Project Structure

Confirm that the project structure is correctly cloned:

```bash
ls -la

ls -la src/backend/

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

```bash
cd src/backend
```

#### Step 2: Review Package Configuration

Examine the `package.json` file to understand the dependencies that will be installed:

**Core Dependencies (Production):**
- `express: ^5.1.0` - Web application framework with latest features
- `dotenv: ^16.3.1` - Environment variable management

**Development Dependencies:**
- `jest: 30.4.2` - JavaScript testing framework that runs the unit and integration suites
- `nodemon: ^3.0.0` - Automatic server restart during development
- `supertest: 7.1.1` - HTTP testing library for integration tests

**Package.json Scripts:**
- `start: "node server.js"` - Production server startup
- `dev: "nodemon server.js"` - Development server with auto-reload
- `test: "jest"` - Runs the Jest test suite (unit and integration tests)
- `test:coverage: "jest --coverage"` - Test run that also reports coverage and enforces the configured thresholds
- `test:watch: "jest --watch"` - Watch mode for continuous testing during development

#### Step 3: Install Dependencies

Execute the npm install command to download and install all required packages:

```bash
npm install
```

**Installation Process Details:**
- Downloads Express 5.2.1, dotenv 16.6.1, and the three development packages - Jest 30.4.2,
  nodemon 3.1.14 and Supertest 7.1.1 - exactly as `package-lock.json` pins them
- Creates the `node_modules` directory with all dependencies: 292 top-level directories
- Leaves `package-lock.json` untouched, because it already satisfies `package.json`. It is only
  written when the two disagree, and `npm ci` fails in that situation instead of reconciling
- Reports `added 402 packages, and audited 403 packages`, and `found 0 vulnerabilities`, on a
  first install. A second run with `node_modules` already in place reports `up to date, audited 403
  packages` instead. Four deprecation warnings and one skipped install script are expected in both
  cases; `src/backend/README.md` inventories all five

**Installation Verification:**
```bash
ls -la node_modules/

npm list --depth=0

npm list express

npm audit
```

**Expected Output:**
```
nodejs-tutorial-app-backend@1.0.0
├── dotenv@16.6.1
├── express@5.2.1
├── jest@30.4.2
├── nodemon@3.1.14
└── supertest@7.1.1
```

### 2.3 Dependency Security Audit

After installation, perform a security audit to ensure all dependencies are secure:

```bash
npm audit

npm audit fix

npm audit --audit-level=moderate
```

## 3. Configuration

The application uses environment variables for configuration management. This section covers creating and configuring the necessary environment files.

### 3.1 Environment File Creation

#### Step 1: Confirm the Environment File

A working `.env` is committed at `src/backend/.env`, so a fresh clone already has one. Confirm it
is there, and create one from the template only if it is missing:

```bash
cd src/backend

[ -f .env ] || cp .env.example .env
```

Use the guard rather than a bare `cp .env.example .env`. The template is not a copy of the
committed file: `.env` sets `APP_NAME=nodejs-tutorial-hello-world`, and `.env.example` does not set
`APP_NAME` at all. Overwriting `.env` with the template therefore drops that variable, and
`config/index.js` falls back to `node-tutorial-app` — so the startup line this guide documents as
`🚀 App Name: nodejs-tutorial-hello-world` becomes `🚀 App Name: node-tutorial-app`. Every other
setting is identical in the two files, so nothing else about the application changes; what changes
is that the transcript stops matching. If you have already overwritten it, `git checkout --
src/backend/.env` restores the committed file.

#### Step 2: Review Environment Template

The `.env.example` file contains comprehensive configuration templates:

**Server Configuration:**
```env
PORT=3000

NODE_ENV=development

HOST=localhost
```

`PORT` and `NODE_ENV` change what the application does. `HOST` does not: `config/index.js` reads
it and the startup summary prints it, but `server.js` calls `server.listen(config.port)` with no
host argument, so the server accepts connections on every interface whatever `HOST` says. Setting
it to `0.0.0.0` for a container changes nothing, and honouring `localhost` would break the
container health check and the Kubernetes probes, which reach the port from outside loopback.

**Logging Configuration:**

`.env.example` also carries a `LOG_LEVEL` entry, and it is worth knowing before you set it that
**no code reads it**: `config/index.js` defines no log-level setting, and `utils/logger.js`
exposes exactly two levels, `info` and `error`, in every environment with no filtering between
them. Changing this value has no effect on what the application logs.

```env
LOG_LEVEL=info
```

The one variable that does change logging is `NODE_ENV`: set to `development` it adds the
`[INFO]:` and `[ERROR]:` prefixes and makes `config/index.js` print its configuration summary;
any other value leaves both out. The same variables apply as listed above — `PORT`, `NODE_ENV`,
`HOST`, plus `APP_NAME` and `ENABLE_LOGGING`.

### 3.2 Port Configuration

#### Default Port Settings

The application defaults to port 3000, which is suitable for most development environments:

```env
PORT=3000
```

#### Alternative Port Configuration

If port 3000 is already in use, configure an alternative port:

```env
PORT=3001
PORT=8000
PORT=8080
```

#### Port Conflict Resolution

Check whether the port is free before starting the server. This check needs nothing but the Node
you have already installed, so it works the same on Windows, macOS and Linux and inside a
container — it asks the operating system for the port and reports what it is told:

```bash
node -e "const s=require('net').createServer();s.once('error',e=>console.log(e.code==='EADDRINUSE'?'port 3000 is IN USE':'probe failed: '+e.code));s.once('listening',()=>s.close(()=>console.log('port 3000 is FREE')));s.listen(3000)"
```

It prints `port 3000 is FREE` or `port 3000 is IN USE`. Substitute the port you intend to use;
`PORT=8080 node -e "…s.listen(Number(process.env.PORT))"` works too if you would rather not edit
the line.

A port inspector tells you *which* process holds the port, which the probe above deliberately does
not. Those tools are separate installs and none of them is guaranteed to be present — a slim
container image or a fresh Linux install often has none of `lsof`, `ss`, `netstat` or `fuser`, and
a missing one exits `127` with `command not found` rather than telling you anything about the port.
Run whichever your machine actually has:

```bash
# Linux/macOS, if lsof is installed
lsof -i :3000 -sTCP:LISTEN     # note the PID and command

# Linux, if iproute2 is installed
ss -lptn 'sport = :3000'

# Windows, in PowerShell (no extra install needed)
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
```

If the port belongs to a server you started, stop it with `Ctrl+C` in its own terminal — that needs
no tooling at all and is the remedy to reach for first. If that terminal is gone and you have one of
the inspectors above, ask the process it names to shut down gracefully with `kill <PID>` (or
`Stop-Process -Id <PID>` on Windows). If you have none of them, set a different `PORT` as shown
above and move on; nothing in this tutorial depends on port 3000 specifically.

### 3.3 Environment Validation

Verify your environment configuration:

```bash
# WARNING: this prints the file in full - every value, not just the names. Anything in .env
# ends up in your terminal scrollback, your shell's session transcript and any log or CI
# job output that captures the terminal. Run it only on a .env you know holds no real
# credential. To see just the names, read the keys instead of the file:
#   grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env
cat .env

node -e "require('dotenv').config(); console.log('Environment loaded successfully');"
```

## 4. Running the Application

The Node.js tutorial application provides multiple execution modes for different development scenarios.

### 4.1 Production Mode Execution

#### Standard Server Startup

Run the application using the production-like execution mode:

```bash
cd src/backend

npm start
```

**Expected Console Output:**

With the committed `.env` in place (`NODE_ENV=development`), `npm start` prints eleven lines:
six from `config/index.js` while it loads the configuration, then five from the server once the
port is bound. The `[INFO]:` prefix on the server lines is added by the logger in development
only.

```
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

Running `NODE_ENV=production npm start` prints only the five server lines, without the
configuration summary and without the `[INFO]:` prefix, and its third line reads
`📍 Listening on all network interfaces at port 3000` — `server.listen(config.port)` passes no
host argument, so nothing is bound to `localhost` in particular and only a development reader is
certain to be at that URL. Both version tokens are read at run time rather than written into the
message as fixed strings: Node.js from `process.version` and Express from the installed
package's own manifest, so `npm ls express` reports the same version the banner shows — `5.2.1`
for the committed lockfile.

**Process Details:**
- Executes `server.js` directly using Node.js
- No automatic restart on file changes
- Production-like execution environment
- Suitable for final testing and validation

### 4.2 Development Mode Execution

#### Auto-Reload Development Server

For active development, use the development mode with automatic restart:

```bash
npm run dev
```

**Development Mode Benefits:**
- Automatic server restart on file changes
- Enhanced development productivity
- Real-time code change testing
- The same console output as `npm start`, preceded by nodemon's own five-line banner

**Monitored File Types** (`src/backend/nodemon.json`, `"ext": "js,json"`)**:**
- `.js` files (JavaScript source)
- `.json` files (Configuration files)

`.env` is **not** watched, so a change to it takes effect only after you restart the process
yourself — type `rs` at the nodemon prompt or stop and start it again. `nodemon.json` ignores
`tests/`, `node_modules/`, `coverage/` and `package-lock.json` — and nodemon ignores `coverage/`
by default as well — so running the test suite does not trigger a restart.

### 4.3 Direct Node.js Execution

#### Alternative Execution Method

You can also run the application directly with Node.js:

```bash
node server.js

NODE_ENV=development PORT=3000 node server.js
```

### 4.4 Server Startup Validation

#### Startup Success Indicators

Look for these indicators of successful server startup:

1. **Port Binding Confirmation**: Server listening message with port number
2. **Express Integration**: Framework initialization confirmation
3. **Environment Validation**: Node.js and Express version display
4. **Request Readiness**: Ready to accept HTTP requests message

#### Common Startup Issues

**Port Already in Use (EADDRINUSE):**
```
[ERROR]: ❌ Server startup failed: Port 3000 is already in use
[ERROR]: 💡 Resolution suggestions:
[ERROR]:    • Start on a free port instead: PORT=3001 npm start
[ERROR]:    • Or release port 3000: press Ctrl+C in the terminal that started the process holding it
[ERROR]:    • If that terminal is gone, find the owning PID with whichever port inspector this machine has - ss, lsof or fuser on Linux and macOS, netstat on Windows - and signal only that PID
[ERROR]:    • Check for other running instances of this application
[ERROR]:    • Verify no other services are using port 3000
[ERROR]: 🛑 Application terminating due to server startup failure
[ERROR]: ⏰ Shutdown initiated at: 2026-08-19T13:24:54.534Z
```

The configuration summary prints first, then these nine lines, and the process exits with code 1.
The `[ERROR]:` prefix is there because `NODE_ENV` is `development`; in any other environment the
same nine lines appear without it. The timestamp is the moment the bind failed, so yours will
differ. The suggested port is derived from the one that failed (`PORT` + 1), so on a conflict over
4000 the first bullet reads `PORT=4001 npm start`. No port-inspection tool is assumed to be
present: whether `ss`, `lsof` or `fuser` exists depends on the machine, which is why `Ctrl+C` is
offered first and the fallback names alternatives rather than prescribing one command. Section 8.1
below shows how to confirm which PID owns the port and signal only that one.

**Invalid Port Value:**
```
[ERROR]: ❌ Server startup failed: 65536 is not a usable port number
[ERROR]: 💡 Resolution suggestions:
[ERROR]:    • Set PORT to a whole number from 1024 to 65535, then start again
[ERROR]:    • Or start on the documented default: PORT=3000 npm start
[ERROR]:    • Check src/backend/.env - the PORT value recorded there is used whenever the shell sets none
[ERROR]: 🛑 Application terminating due to server startup failure
[ERROR]: ⏰ Shutdown initiated at: 2026-08-19T13:24:54.534Z
```

`config/index.js` prints its own `Warning: Port 65536 is outside recommended range (1024-65535)`
line before these seven, because it warns about the value rather than rejecting it. A `PORT`
outside 0–65535 is then rejected by `server.listen()` before any socket exists, so it fails
synchronously rather than through the server's `error` event. `server.js` catches that throw and
routes it to the same reporter, which is why an invalid port reads like a taken one instead of
printing a `RangeError` stack trace. A value that is not a number at all — `PORT=abc` — never
reaches this path: `config/index.js` parses it, gets `NaN` and falls back to 3000.

**Solution Steps:**
1. Identify the process using the port
2. Stop the conflicting process
3. Use an alternative port
4. Restart the application

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
curl http://localhost:3000/hello

Hello world

curl -v http://localhost:3000/hello

# > GET /hello HTTP/1.1
# > Host: localhost:3000
# < HTTP/1.1 200 OK
# < Content-Type: text/html; charset=utf-8
# Hello world
```

#### Advanced Testing with Different Tools

**Using wget:**
```bash
wget -qO- http://localhost:3000/hello

wget -O response.txt http://localhost:3000/hello
```

**Using HTTPie (if installed):**
```bash
http GET localhost:3000/hello

# HTTP/1.1 200 OK
# Content-Type: text/html; charset=utf-8
# Hello world
```

### 5.2 Server Health Verification

#### Process Status Check

Verify the server process is running correctly. The request itself is the most direct check, and it
needs nothing beyond curl:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/hello   # prints 200 when it is up
```

To confirm the port is held rather than free — useful when the server is starting or has just been
stopped — reuse the portable probe from
[§3.2 Port Conflict Resolution](#port-conflict-resolution). It prints `port 3000 is IN USE` while
the server holds it:

```bash
node -e "const s=require('net').createServer();s.once('error',e=>console.log(e.code==='EADDRINUSE'?'port 3000 is IN USE':'probe failed: '+e.code));s.once('listening',()=>s.close(()=>console.log('port 3000 is FREE')));s.listen(3000)"
```

`ps aux | grep node` lists the process on Linux and macOS. `netstat`, `ss` and `lsof` all report the
listening socket too, but each is a separate install and a slim environment may have none of them —
see the note in §3.2 before relying on one.

#### Performance Verification

Test server response performance:

```bash
time curl http://localhost:3000/hello

for i in {1..10}; do
  curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/hello
done
```

**Expected Performance:**
- Response time: < 100ms (single-digit milliseconds on a local machine)
- Memory usage: ≈ 65MB resident, as reported by `ps -o rss= -p <server pid>` — most of it the
  Node.js runtime, since a bare `node` process already occupies ~44MB
- CPU usage: < 5% (idle)

### 5.3 Error Response Testing

#### Invalid Endpoint Testing

Test error handling by accessing non-existent endpoints:

```bash
curl -i http://localhost:3000/nonexistent

# HTTP/1.1 404 Not Found
# Content-Type: text/html; charset=utf-8
# Unmatched paths are handled by Express's built-in 404 handler, which returns
# its default HTML error page containing: <pre>Cannot GET /nonexistent</pre>

# Only GET is registered, so each of these matches no handler and gets the same 404 - never a 405
curl -X POST http://localhost:3000/hello
curl -X PUT http://localhost:3000/hello
curl -X DELETE http://localhost:3000/hello
```

### 5.4 Logging Verification

#### Console Output Analysis

Verify proper logging functionality:

**Successful Request Log:**
```
[INFO]: HTTP Request - Method: GET Path: /hello Body: {}
```

**Unmatched Path Request Log** (`curl http://localhost:3000/nonexistent`)**:**
```
[INFO]: HTTP Request - Method: GET Path: /nonexistent Body: {}
```

**Request Carrying a Query String** (`curl "http://localhost:3000/hello?greeting=world"`)**:**
```
[INFO]: HTTP Request - Method: GET Path: /hello Body: {}
```

The request logger runs before routing, so every request produces exactly one line like the samples above: method, pathname and body only, with no status code, response time, client IP or user agent. The `Path:` value is the pathname of `req.originalUrl` — the target up to the first `?` or `#` — so the third sample logs `/hello` for a request to `/hello?greeting=world`. That is deliberate: a query string is where a caller's values live, and a log line is read by more people and kept for longer than the request that produced it. Two further rules apply to every value in the line: anything outside printable ASCII is written as inert `\uXXXX` text, and each value is cut off at 256 characters with the number of dropped characters stated. An unmatched target appears in full, because there is nothing in it to remove. The body is `{}` for any request without one, and that is every request here because no body parser is mounted. The `[INFO]:` prefix is added only when `NODE_ENV` is `development`; other environments log the same message without it. An unmatched path is logged in exactly the same way and is then answered by Express's built-in 404 handler, so no additional log line follows.

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
2. **Execute Permissions**: Script must be executable
3. **Project Root Directory**: Script must be run from project root

#### Running the Automated Setup

```bash
cd /path/to/project-root

chmod +x infrastructure/scripts/setup.sh

./infrastructure/scripts/setup.sh
```

### 6.3 Script Execution Phases

#### Phase 1: Prerequisites Verification

**What it checks:**
- Node.js version compatibility (the script requires >= v18.0.0)
- npm version verification (the script requires >= v8.0.0)
- Docker installation and daemon status
- Project structure validation

**Sample Output** — the version numbers are whatever your machine reports, because the script prints
what it detected rather than a fixed value (it strips the leading `v` from Node's, and takes the
first version-shaped number out of `docker --version`). On the environment this guide is validated
on they read `22.23.2`, `11.18.0` and `29.7.0`:
```
[INFO] Phase 1/3: Prerequisites Verification
[SUCCESS] Node.js version 22.23.2 detected (minimum v18.0.0 required)
[SUCCESS] npm version 11.18.0 detected (minimum v8.0.0 required)
[SUCCESS] Docker version 29.7.0 detected and daemon is running
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
[INFO] Created node_modules directory with 292 packages
[SUCCESS] Security audit completed - no critical vulnerabilities found
```

#### Phase 3: Docker Image Build

**What it builds:**
- Multi-stage Docker image using `node:22-alpine` base
- Production-optimized image with non-root user
- Tagged as `nodejs-tutorial-app:latest`

**Sample Output** — the size on the last line is read back from `docker images` after the build, so it
is whatever your platform produces rather than a fixed number. It varies with the `node:22-alpine`
base image and the CPU architecture; on the environment this guide is validated on (linux/amd64) it
reads `171MB`:
```
[INFO] Phase 3/3: Docker Image Build
[INFO] Building containerized version of Node.js tutorial application
[SUCCESS] Docker image built successfully: nodejs-tutorial-app:latest
[INFO] Final image size: 171MB
```

The script closes with a summary whose dependency line is also read back from the installed tree, so
it names the version `package-lock.json` actually resolved rather than a literal baked into the
script:
```
[INFO] Setup Summary:
[INFO]   ✓ System prerequisites verified (Node.js, npm, Docker)
[INFO]   ✓ Backend dependencies installed (Express ^5.1.0 resolved to 5.2.1 + related packages)
[INFO]   ✓ Docker image built (nodejs-tutorial-app:latest)
[INFO]   ✓ Environment ready for development and testing
```

### 6.4 Post-Script Verification

#### Verify Script Success

After successful script execution, verify the setup:

```bash
cd src/backend && npm list --depth=0

docker images nodejs-tutorial-app:latest

npm start
```

#### Container Testing

Test the Docker image created by the script. Start the container in the background so the same terminal can issue the request, then stop it again:

```bash
docker run --rm -d --name nodejs-tutorial-app -p 3000:3000 nodejs-tutorial-app:latest

curl http://localhost:3000/hello

docker stop nodejs-tutorial-app
```

To watch the container's log output instead, run `docker run --rm -p 3000:3000 nodejs-tutorial-app:latest` in the foreground and send the `curl` request from a second terminal.

### 6.5 Script Troubleshooting

#### Common Script Issues

**Permission Denied:**
```bash
chmod +x infrastructure/scripts/setup.sh
```

**Docker Not Running:**
```bash
sudo systemctl start docker

```

**Network Issues During npm Install:**
```bash
npm config set registry https://registry.npmjs.org/

npm cache clean --force
```

## 7. Development Workflow

Establish an efficient development workflow for building and testing the Node.js tutorial application.

### 7.1 Daily Development Process

#### Starting Development Session

```bash
cd /path/to/project-root

git pull origin main

cd src/backend && npm install

npm run dev
```

#### Development Server Features

**Auto-Reload Capability:**
- Watches `.js` and `.json` files under `src/backend`, ignoring `tests/`, `node_modules/`,
  `coverage/` and `package-lock.json` (`coverage/` is named in `nodemon.json` and is ignored by
  nodemon's own defaults as well, and `.env` is not watched — restart the process to pick it up)
- Automatically restarts the server on changes
- Maintains console history and logs
- Preserves environment variables across restarts

**Development Logging:**
- One console line per request, written on arrival before routing:
  `[INFO]: HTTP Request - Method: GET Path: /hello Body: {}`. The logger adds no timestamp, so
  request and startup lines carry none - the error diagnostic and the shutdown line each record
  one explicitly in the text they log. There is no response or status-code log, no request
  duration and no metrics — the request logger never touches the response object
- The path is the pathname of `req.originalUrl` — the target up to the first `?` or `#` — and the
  method is `req.method`. The body is serialized with `JSON.stringify` when it is an object,
  converted with `String` when it is a primitive, and reported as `{}` when there is none —
  which is every request in this tutorial, since no body parser is mounted. A query string a
  client puts in the target does not appear in the console, and every value that does appear is
  escaped to printable ASCII and bounded to 256 characters
- The `[INFO]:`/`[ERROR]:` prefixes, and the configuration summary printed at startup, appear
  because `NODE_ENV` is `development`
- An error forwarded to the error handler produces one diagnostic entry recording the error's
  message and name together with the request pathname, method, route params, the number of query
  parameters the target carried, an ISO timestamp, the client address and the request's `host`,
  `content-type` and `accept` headers — those three from a fixed allow-list, so an `Authorization`
  header or a `Cookie` never reaches the log — plus the error's stack in development only. The
  query's own values are not recorded, and every value that is recorded is escaped and bounded
  exactly as in the request line above. Most of that stays server-side, but not
  all of it, so take the envelope field by field rather than assuming it is generic. Omitted from
  the client entirely: the message, stack and name, the method, the headers, the params, the
  query count and the client address — and `error` is always the fixed string
  `Internal Server Error`. Returned to the client: `status`, a `timestamp`, and `path`, which
  repeats `req.originalUrl || req.url` with the query string included, so the caller gets back
  the target it sent. `docs/architecture/overview.md` states the field-by-field contract

### 7.2 Code Editing and Testing

#### Recommended Development Cycle

1. **Code Changes**: Edit source files in your preferred editor
2. **Automatic Restart**: Nodemon detects changes and restarts server
3. **Testing**: Use curl or browser to test endpoints
4. **Debugging**: Review console logs for issues
5. **Iteration**: Repeat cycle for continuous development

#### File Watching Configuration

This is the whole of the shipped `src/backend/nodemon.json`:
```json
{
  "watch": ["./"],
  "ext": "js,json",
  "ignore": [
    "tests/",
    "node_modules/",
    "coverage/",
    "package-lock.json"
  ]
}
```

`"watch": ["./"]` resolves to the package directory, so nodemon watches `src/backend`
recursively and monitors `.js` and `.json` files only. `.env` is not among them, and no `delay`
is configured, so a saved change restarts the process straight away rather than after a pause.
On top of the four ignores above nodemon applies its own defaults, which add `.git/`,
`node_modules/`, `coverage/`, `.nyc_output/`, `.sass-cache/` and `bower_components/`. Run
`npx nodemon --dump server.js` from `src/backend` to print the configuration nodemon actually
resolved, watch root included.

### 7.3 Testing During Development

#### Manual Testing Workflow

```bash
npm run dev

curl http://localhost:3000/hello

curl http://localhost:3000/nonexistent

time curl http://localhost:3000/hello
```

#### Integration Testing Setup

For more comprehensive testing:

```bash
npm test

# Run the suite with a coverage report; Jest enforces the configured
# 90% thresholds for routes/**/*.js and middleware/**/*.js
npm run test:coverage

npm run test:watch
```

Coverage collection is enabled for every Jest run (`collectCoverage: true` in
`src/backend/jest.config.js`), so watch mode prints a coverage table too. The watcher's table
lists no files and reads `0%` in every column, and it stays at `0%` even after you press `a` to
run all the tests — so read coverage from `npm test` or `npm run test:coverage`, never from the
watcher.

### 7.4 Debugging Strategies

#### Console Debugging

Leverage built-in console logging:

```javascript
console.log('Debug: Request received:', req.method, req.path);
console.log('Debug: Response data:', responseData);
```

#### Node.js Inspector

Use Node.js built-in debugger:

```bash
node --inspect server.js

```

#### Environment-Specific Debugging

```bash
DEBUG=* npm run dev

DEBUG=express:* npm run dev
```

## 8. Troubleshooting

Comprehensive troubleshooting guide for common development environment issues.

### 8.1 Server Startup Issues

#### Port Conflicts (EADDRINUSE)

**Problem**: Port 3000 is already in use by another process.

**Diagnosis:**

Confirm the port really is taken, using only the Node you already have — this works on every
platform and in a container with no extra tooling:

```bash
node -e "const s=require('net').createServer();s.once('error',e=>console.log(e.code==='EADDRINUSE'?'port 3000 is IN USE':'probe failed: '+e.code));s.once('listening',()=>s.close(()=>console.log('port 3000 is FREE')));s.listen(3000)"
```

To learn *which* process holds it you need a port inspector, and none is guaranteed to be installed
(see [§3.2 Port Conflict Resolution](#port-conflict-resolution)). Run whichever your machine has —
`lsof -i :3000` or `ss -lptn 'sport = :3000'` on Linux, `lsof -i :3000` on macOS,
`Get-NetTCPConnection -LocalPort 3000 -State Listen` in Windows PowerShell. A tool that is not
installed exits `127` with `command not found`, which says nothing about the port.

**Solutions:**

1. **Stop the Conflicting Process:**
   Prefer `Ctrl+C` in the terminal that owns the process — it needs no tooling. Otherwise verify
   which PID holds the port with one of the inspectors above and signal only that PID, so an
   unrelated process is never terminated:
   ```bash
   # Linux/macOS: confirm the owner, then request a graceful shutdown
   lsof -i :3000 -sTCP:LISTEN     # note the PID and command name (needs lsof)
   kill <PID>                     # SIGTERM; the process can clean up
   
   # Windows PowerShell: confirm the PID, then request a graceful shutdown
   Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object OwningProcess
   Stop-Process -Id <PID>
   ```
   Only if the verified PID ignores SIGTERM should you escalate to `kill -9 <PID>`
   (Windows: `Stop-Process -Id <PID> -Force`). SIGKILL gives the process no chance to clean up,
   so it is a last resort rather than the first step. Never match on a process *name* to pick the
   target: `pkill node` or `taskkill /IM node.exe` would also end unrelated Node processes,
   including ones your editor or another project started.

   If you have no inspector at all, skip straight to a different port below — it is faster than
   installing one, and nothing in this tutorial needs port 3000 specifically.

2. **Use Alternative Port:**
   ```bash
   PORT=3001 npm start
   
   echo "PORT=3001" > .env
   ```

3. **Pick Another Free Port:**
   ```bash
   PORT=8080 npm start
   ```
   `PORT=0` does not produce an OS-assigned port here: `config/index.js` resolves the
   port with `parseInt(process.env.PORT, 10) || 3000`, and `0` is falsy, so the server
   still binds 3000.

#### Permission Errors

**Problem**: Cannot bind to port due to permissions.

**Solution for Privileged Ports (< 1024):**
```bash
# Use sudo (not recommended for development)
sudo npm start

PORT=3000 npm start  # Port 3000 doesn't require sudo
```

#### Node.js Version Incompatibility

**Problem**: Express 5 requires Node.js >= 18.0.0, and the development tools require 20 or 22.

**Diagnosis:**
```bash
node --version
```

**Solution** — install a 22.x runtime and select it. `nvm install 22` takes the newest 22.x
release, which is the version to prefer; pin an exact patch only if you need to match another
machine, and `v22.23.2` is what this guide is validated on:
```bash
# Newest 22.x, which is what most machines should run
nvm install 22
nvm use 22

# Or the exact patch this guide is validated on
nvm install 22.23.2
nvm use 22.23.2
```

### 8.2 Dependency Installation Issues

#### Network Connectivity Problems

**Problem**: npm install fails due to network issues.

**Solutions:**

1. **Check npm Registry:**
   ```bash
   npm config get registry
   # Should return: https://registry.npmjs.org/
   
   npm config set registry https://registry.npmjs.org/
   ```

2. **Clear npm Cache:**
   ```bash
   npm cache clean --force
   npm install
   ```

3. **Retry Against the Official Registry:**
   ```bash
   npm config get registry        # expect https://registry.npmjs.org/
   npm ci
   ```
   Do not switch to a third-party registry mirror to work around a network error. A
   mirror changes where every package in the dependency graph comes from, so it is a
   supply-chain decision that needs your organisation's approval, not a troubleshooting
   step. If an approved internal mirror exists, use it for a single command only
   (`npm ci --registry https://<approved-mirror>`) and never persist it with
   `npm config set`; restore the default with
   `npm config set registry https://registry.npmjs.org/`.

#### Disk Space Issues

**Problem**: Insufficient disk space for node_modules.

**Diagnosis:**
```bash
df -h .                    # Linux/macOS
dir                        # Windows

du -sh node_modules        # Linux/macOS
```

**Solutions:**
1. Free up disk space
2. Clean npm cache: `npm cache clean --force`
3. Remove unused packages: `npm prune`

#### Package Vulnerability Issues

**Problem**: npm audit reports security vulnerabilities.

**Solutions:**

1. **Automatic Fix:**
   ```bash
   npm audit fix
   ```

2. **Manual Review:**
   ```bash
   npm audit --audit-level=moderate
   npm audit --audit-level=high
   ```

3. **Force Updates:**
   ```bash
   npm audit fix --force
   # Caution: May introduce breaking changes
   ```

### 8.3 Runtime Errors

#### Module Not Found Errors

**Problem**: Cannot find module 'express' or other dependencies.

**Diagnosis:**
```bash
ls -la node_modules/

npm list express
```

**Solutions:**
1. **Reinstall Dependencies From the Lockfile:**
   ```bash
   rm -rf node_modules
   npm ci
   ```
   Keep `package-lock.json`. `npm ci` installs exactly the versions it records, which is
   what makes the install reproducible; deleting it discards that guarantee. If the lock
   really is out of step with `package.json`, regenerate it deliberately as its own
   change (`npm install --package-lock-only`) and commit the result.

2. **Verify Working Directory:**
   ```bash
   pwd  # Should be in src/backend
   ls package.json  # Should exist
   ```

#### Environment Variable Issues

**Problem**: Environment variables not loading correctly.

**Diagnosis:**
```bash
ls -la .env

# WARNING: prints every value, exactly as in section 3.3. If you only need to confirm which
# keys are present, list the names instead:
#   grep -oE '^[A-Za-z_][A-Za-z0-9_]*' .env
cat .env

node -e "require('dotenv').config(); console.log(process.env.PORT);"
```

**Solutions:**
1. **Restore or Create the .env File:**
   The repository commits a working `src/backend/.env`, so the first thing to try is restoring it —
   that brings back `APP_NAME` and every other setting exactly as this guide documents them:
   ```bash
   git checkout -- .env
   ```
   Only if you are working outside a clone, or have deliberately removed the file from version
   control, create one from the template instead. It omits `APP_NAME`, so the startup banner will
   read `node-tutorial-app`:
   ```bash
   [ -f .env ] || cp .env.example .env
   ```

2. **Fix .env Syntax:**
   ```bash
   # dotenv needs a separator it recognises: '=', or ':' followed by a space. Surrounding
   # spaces are allowed, so both lines below set PORT to 3000. Forms it does NOT accept are
   # a colon with no space (PORT:3000), no separator at all (PORT 3000), and a space inside
   # the key (MY PORT=3000) - those lines are ignored entirely.
   PORT=3000          # parsed
   PORT = 3000        # also parsed
   ```

### 8.4 Performance Issues

#### Slow Server Response

**Problem**: Server responses taking > 100ms.

**Diagnosis:**
```bash
time curl http://localhost:3000/hello

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
   npm run dev
   ```

3. **Clear Application Cache:**
   ```bash
   npm cache clean --force
   ```
   Then restart this server only: press `Ctrl+C` in the terminal that started it and run
   `npm start` again. If that terminal is no longer available, find the process holding
   the port with whichever inspector this machine has — none of them is guaranteed to be
   installed, as [§3.2 Port Conflict Resolution](#port-conflict-resolution) explains — and
   signal that single PID:
   ```bash
   lsof -i :3000 -sTCP:LISTEN     # note the PID (needs lsof; ss -lptn 'sport = :3000' also works)
   kill <PID>                     # graceful shutdown of that process only
   npm start
   ```
   Never terminate processes by name (for example `pkill node`): that would kill every
   Node.js process running under your account, including editors, language servers and
   other applications that have nothing to do with this tutorial.

#### Memory Leaks

**Problem**: Node.js process memory usage continuously increasing.

**Diagnosis:**
```bash
ps -o pid,vsz,rss,comm -p $(pgrep node)

node --inspect server.js
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
docker info

ls -la infrastructure/docker/Dockerfile

ls -la .
```

**Solutions:**

1. **Start Docker Daemon:**
   ```bash
   sudo systemctl start docker
   
   ```

2. **Free Disk Space:**
   ```bash
   df -h

   # Remove only dangling (untagged) images
   docker image prune

   docker image rm nodejs-tutorial-app:latest
   ```
   ⚠️ Avoid `docker system prune -a` here. It deletes every image not used by a running
   container, plus stopped containers, unused networks and the entire build cache — on a
   shared machine that removes other projects' images and forces long rebuilds. If you
   genuinely need it, review what would go first with `docker system df` and
   `docker image ls`, and run it only when you are certain nothing else on the host
   depends on those layers.

3. **Network Issues:**
   ```bash
   docker pull node:22-alpine
   ```

#### Container Runtime Issues

**Problem**: Container starts but application not accessible.

**Diagnosis:**
```bash
docker ps

docker logs <container_id>

docker inspect <container_id>
```

**Solutions:**

1. **Port Mapping:**
   ```bash
   docker run -p 3000:3000 nodejs-tutorial-app:latest
   ```

2. **Container Health:**
   ```bash
   docker exec -it <container_id> sh
   curl localhost:3000/hello
   ```

## 9. Advanced Configuration

Advanced configuration options for experienced developers and production-like development
environments.

> **None of this chapter is part of the tutorial as it stands.** Every package installation and
> code sample below (§9.2 onwards) describes an enhancement you would be adding yourself: the
> repository's dependencies are `express` and `dotenv` at runtime plus `jest`, `nodemon` and
> `supertest` for development, and nothing here — structured logging, security middleware,
> performance monitoring, database access — is installed or wired up. §9.1 is the exception, and
> only in part: the variables it uses are ones `config/index.js` really reads — `NODE_ENV` and
> `PORT` change what the application does, while `HOST` only appears in the startup summary. The
> per-environment *files* §9.1 creates are not shipped behaviour. `config/index.js` calls
> `require('dotenv').config()` with no `path` argument, so the loader reads `src/backend/.env` and
> nothing else; `.env.development`, `.env.test` and `.env.production` sit there with no effect
> until you add the loader under "Dynamic Environment Loading", which is itself an enhancement.

### 9.1 Environment-Specific Configuration

#### Multiple Environment Files

Create environment-specific configuration files. On their own these three files change nothing —
the shipped loader reads only `.env` — so they take effect only once you add the dynamic loader
shown at the end of this subsection:

```bash
cp .env.example .env.development
cp .env.example .env.test
cp .env.example .env.production
```

**Environment File Organization:**

```env
NODE_ENV=development
PORT=3000
HOST=localhost

NODE_ENV=test
PORT=3001
HOST=localhost

NODE_ENV=production
PORT=80
HOST=0.0.0.0
```

`NODE_ENV`, `PORT` and `ENABLE_LOGGING` are the settings this application acts on. `HOST` and
`APP_NAME` are read as well, but they only appear in the startup summary: `server.js` calls
`server.listen(config.port)` with no host argument, so the `HOST=0.0.0.0` line above records an
intention rather than changing anything — the server already accepts connections on every
interface, whatever `HOST` says. `config/index.js` also reads `AUTO_RESTART`, `TRUST_PROXY`,
`JSON_LIMIT` and `URLENCODED_LIMIT` into its configuration object, but no code consumes those four
values yet. Every other variable in `.env` is inert. Per-environment log levels are deliberately
absent from these examples: the tutorial's logger has two fixed levels and no filter, so a
`LOG_LEVEL` line here would look like configuration while doing nothing. It becomes meaningful only
alongside the optional Winston enhancement in section 9.3 below.

#### Dynamic Environment Loading (enhancement — not shipped)

The shipped `config/index.js` does not do this. Replacing its bare `require('dotenv').config()`
call with the form below is what makes the per-environment files above load; until then they are
inert:

```javascript
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`)
});
```

### 9.2 Development Server Customization

#### Nodemon Custom Configuration

Create `nodemon.json` in the backend directory:

```json
{
  "watch": ["src", "config"],
  "ext": "js,json,env",
  "ignore": ["node_modules", "logs", "*.test.js"],
  "delay": "1000",
  "env": {
    "NODE_ENV": "development"
  },
  "verbose": true,
  "restartable": "rs"
}
```

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

#### Structured Logging Setup (optional enhancement — not part of this tutorial)

Nothing below is installed or wired up in this repository. The tutorial ships
`utils/logger.js`, a two-level wrapper over `console` with no levels beyond `info` and `error`,
no filtering and no automatic timestamping, and `winston` is not a dependency. Treat this subsection as a
worked example of what you would add if you wanted structured logging — including the
`LOG_LEVEL` variable, which only starts doing something once a logger that reads it exists:

```bash
npm install winston winston-daily-rotate-file
```

**Logging Configuration Example:**

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});
```

### 9.4 Security Enhancements

#### HTTP Security Headers

Install and configure Helmet.js for security headers:

```bash
npm install helmet cors rate-limiter-flexible
```

**Security Configuration:**

```javascript
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  keyProp: 'ip',
  points: 100,
  duration: 60,
});

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
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  cors: cors(corsOptions),
  rateLimiter: rateLimiter
};
```

### 9.5 Performance Monitoring (optional enhancement — not part of this tutorial)

#### Application Performance Monitoring

Nothing in this subsection exists in the repository. `clinic`, `newrelic` and
`@newrelic/native-metrics` are not dependencies, there is no `monitoring/` directory, no
profiling hook, no memory sampler and no `ENABLE_PROFILING` setting — the application measures
neither response time nor memory use, and `config/index.js` reads no variable that would switch
such a thing on. What follows is a worked example of the packages and code you would add if you
wanted application performance monitoring; installing them is a decision you are taking beyond
the tutorial, not a setup step it requires:

```bash
npm install clinic newrelic @newrelic/native-metrics
```

**Performance Monitoring Setup (example code to write yourself — no such file exists):**

```javascript
const clinic = require('clinic');

if (process.env.NODE_ENV === 'development' && process.env.ENABLE_PROFILING) {
  clinic.start({
    tool: 'doctor',
    debug: true
  });
}

const monitorMemory = () => {
  const usage = process.memoryUsage();
  console.log(`Memory Usage: RSS=${Math.round(usage.rss / 1024 / 1024)}MB, Heap=${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
};

if (process.env.NODE_ENV === 'development') {
  setInterval(monitorMemory, 30000);
}
```

### 9.6 Database Integration (Future Enhancement)

#### Database Connection Configuration

Prepare for future database integration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tutorial_db
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/tutorial_db
```

**Database Configuration Module:**

```javascript
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
        // Verify the server certificate against a trusted CA. Never set this to
        // false: that accepts any certificate and removes the protection TLS
        // provides against interception of the database connection.
        rejectUnauthorized: true,
        ca: fs.readFileSync(process.env.DB_CA_CERT_PATH).toString()
      }
    }
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

## 10. Next Steps

After successfully setting up your development environment, consider these next steps for continued learning and development.

### 10.1 Application Enhancement

#### Add More Endpoints

Extend the application with additional endpoints:

```javascript
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

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
npm install joi express-validator helmet
```

#### Extend the Test Suite

The testing framework is already installed and wired up — `jest@30.4.2` and `supertest@7.1.1`
are devDependencies of `src/backend`, `npm test` runs the suite, and `jest.config.js` enforces
90% coverage on `routes/**/*.js` and `middleware/**/*.js`. So this exercise is about adding
cases, not tooling:

```bash
npm test

npm run test:coverage
```

### 10.2 Production Deployment Preparation

#### Environment Configuration

Create production environment files. As it stands the tutorial acts on `NODE_ENV`, `PORT` and
`ENABLE_LOGGING`; it also reads `HOST` and `APP_NAME`, which only reach the startup summary, and
`AUTO_RESTART`, `TRUST_PROXY`, `JSON_LIMIT` and `URLENCODED_LIMIT`, which nothing consumes yet —
setting `HOST` does not change the interface the server listens on. The remaining entries below
belong to the features this section proposes adding (session handling, JWT authentication, CORS, a
level-aware logger) and have no effect until that code exists:

```env
NODE_ENV=production
PORT=80
HOST=0.0.0.0

LOG_LEVEL=warn
SESSION_SECRET=your-secure-session-secret
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com

DATABASE_URL=your-production-database-url
REDIS_URL=your-production-redis-url
```

#### Docker Production Configuration

Create production Dockerfile optimizations:

```dockerfile
FROM node:22-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY src/ ./src/
USER node
EXPOSE 3000
CMD ["node", "src/backend/server.js"]
```

#### CI/CD Pipeline Setup

Prepare for continuous integration:

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm audit
```

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

You have successfully set up a comprehensive Node.js development environment using modern technologies and best practices. This foundation provides:

- **Node.js 22.x LTS** (validated on v22.23.2): long-term support with enhanced security
- **Express 5.x** (5.2.1, resolved from the declared `^5.1.0`): a web framework with promise support
- **Development Tools**: Automated restart, debugging, testing capabilities
- **Production Readiness**: Scalable architecture and deployment options

The tutorial application demonstrates fundamental concepts while establishing patterns that scale to enterprise applications. Continue building upon this foundation to develop robust, production-ready Node.js applications.

**Happy coding! 🚀**