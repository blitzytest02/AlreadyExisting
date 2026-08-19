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
- **Justification**: Node.js v22 with codename 'Jod' has officially moved into Active LTS phase, ensuring critical updates and security support for years to come

**Installation Verification:**
```bash
node --version
# Should display: v22.23.2 - the exact runtime this tutorial is validated against
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
- Downloads Express.js 5.1.0 and related packages
- Creates `node_modules` directory with all dependencies
- Generates `package-lock.json` for version locking
- Installs approximately 50+ packages including transitive dependencies

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

#### Step 1: Copy Environment Template

Create your local environment configuration by copying the example file:

```bash
cd src/backend

cp .env.example .env
```

#### Step 2: Review Environment Template

The `.env.example` file contains comprehensive configuration templates:

**Server Configuration:**
```env
PORT=3000

NODE_ENV=development

HOST=localhost
```

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

Check for port conflicts before starting the server:

```bash
lsof -i :3000

netstat -ano | findstr :3000
```

If the port belongs to a server you started, stop it with `Ctrl+C` in its own terminal. If that terminal is gone, identify the owning process first and then ask it to shut down gracefully:

```bash
# Linux/macOS: confirm which process owns the port, then signal that PID only
lsof -i :3000 -sTCP:LISTEN     # note the PID and command
kill <PID>                     # graceful SIGTERM

# Windows: confirm the PID from the netstat output above, then signal that PID only
```

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
[INFO]: ⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: development
[INFO]: 🎯 Tutorial application initialized successfully
```

Running `NODE_ENV=production npm start` prints only the five server lines, without the
configuration summary and without the `[INFO]:` prefix. The Node.js version comes from
`process.version`; the `Express 5.1.0` token is a fixed string in `server.js`, so use
`npm ls express` to see the version actually installed.

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
❌ Server startup failed: Port 3000 is already in use
💡 Resolution suggestions:
   • Stop the process using port 3000: press Ctrl+C in its terminal, or
     find its PID with `lsof -i :3000 -sTCP:LISTEN` and run `kill <PID>`
   • Use a different port: PORT=3001 npm start
   • Check for other running instances of this application
```

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

Verify the server process is running correctly:

```bash
ps aux | grep node

netstat -tulpn | grep 3000  # Linux
netstat -an | grep 3000     # macOS
netstat -an | findstr 3000  # Windows
```

#### Performance Verification

Test server response performance:

```bash
time curl http://localhost:3000/hello

for i in {1..10}; do
  curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/hello
done
```

**Expected Performance:**
- Response time: < 100ms
- Memory usage: < 50MB
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
[INFO]: HTTP Request - Method: GET Path: /hello?greeting=world Body: {}
```

The request logger runs before routing, so every request produces exactly one line like the samples above: method, path and body only, with no status code, response time, client IP or user agent. The path is `req.originalUrl` exactly as the client sent it — an unmatched target and a query string both appear verbatim, which is worth knowing before you put anything sensitive in a URL. The body is `{}` for any request without one, and that is every request here because no body parser is mounted. The `[INFO]:` prefix is added only when `NODE_ENV` is `development`; other environments log the same message without it. An unmatched path is logged in exactly the same way and is then answered by Express's built-in 404 handler, so no additional log line follows.

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
[INFO] Created node_modules directory with 156 packages
[SUCCESS] Security audit completed - no critical vulnerabilities found
```

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
[INFO] Final image size: 145MB
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
- The path is `req.originalUrl` exactly as the client sent it, query string included, and the
  method is `req.method`. The body is serialized with `JSON.stringify` when it is an object,
  converted with `String` when it is a primitive, and reported as `{}` when there is none —
  which is every request in this tutorial, since no body parser is mounted. Whatever a client
  puts in the URL therefore appears in the console, so keep credentials out of request targets
  when you extend this project
- The `[INFO]:`/`[ERROR]:` prefixes, and the configuration summary printed at startup, appear
  because `NODE_ENV` is `development`
- An error forwarded to the error handler produces one diagnostic entry recording the error's
  message, stack and name together with the request URL, method, headers, params and query, an
  ISO timestamp, the User-Agent and the client address. Most of that stays server-side, but not
  all of it, so take the envelope field by field rather than assuming it is generic. Omitted from
  the client entirely: the message, stack and name, the method, the headers, the params, the
  query, the User-Agent and the client address — and `error` is always the fixed string
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

Nodemon monitors these file types by default:
```json
{
  "ext": "js,json,env",
  "ignore": ["node_modules/", ".git/"],
  "delay": "1000ms"
}
```

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
```bash
lsof -i :3000          # Linux/macOS
netstat -ano | findstr :3000  # Windows
```

**Solutions:**

1. **Stop the Conflicting Process:**
   Prefer `Ctrl+C` in the terminal that owns the process. Otherwise verify which PID holds
   the port and signal only that PID, so an unrelated process is never terminated:
   ```bash
   # Linux/macOS: confirm the owner, then request a graceful shutdown
   lsof -i :3000 -sTCP:LISTEN     # note the PID and command name
   kill <PID>                     # SIGTERM; the process can clean up
   
   # Windows: confirm the PID, then request a graceful shutdown
   netstat -ano | findstr :3000
   taskkill /PID <PID>
   ```
   Only if the verified PID ignores SIGTERM should you escalate to `kill -9 <PID>`
   (Windows: `taskkill /PID <PID> /F`). SIGKILL gives the process no chance to clean up,
   so it is a last resort rather than the first step.

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

**Problem**: Express.js 5.1.0 requires Node.js >= 18.0.0.

**Diagnosis:**
```bash
node --version
```

**Solution:**
```bash

nvm install 22.16.0
nvm use 22.16.0

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
1. **Create .env File:**
   ```bash
   cp .env.example .env
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
   the port and signal that single PID:
   ```bash
   lsof -i :3000 -sTCP:LISTEN     # note the PID
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
> performance monitoring, database access — is installed or wired up. §9.1 is the exception: it
> uses only `NODE_ENV`, `PORT` and `HOST`, which `config/index.js` does read — `NODE_ENV` and
> `PORT` change what the application does, while `HOST` only appears in the startup summary.

### 9.1 Environment-Specific Configuration

#### Multiple Environment Files

Create environment-specific configuration files:

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

#### Dynamic Environment Loading

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
- **Security**: [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

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

- **Node.js v22.16.0 LTS**: Long-term support with enhanced security
- **Express.js 5.1.0**: Latest web framework with promise support
- **Development Tools**: Automated restart, debugging, testing capabilities
- **Production Readiness**: Scalable architecture and deployment options

The tutorial application demonstrates fundamental concepts while establishing patterns that scale to enterprise applications. Continue building upon this foundation to develop robust, production-ready Node.js applications.

**Happy coding! 🚀**