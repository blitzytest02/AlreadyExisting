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
# Clone the repository (replace <repository-url> with actual URL)
git clone <repository-url>

# Navigate to the project directory (replace <project-directory> with actual name)
cd <project-directory>
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

```bash
cd src/backend
```

#### Step 2: Review Package Configuration

Examine the `package.json` file to understand the dependencies that will be installed:

**Core Dependencies (Production):**
- `express: ^5.1.0` - Web application framework with latest features
- `dotenv: ^16.3.1` - Environment variable management

**Development Dependencies:**
- `nodemon: ^3.0.0` - Automatic server restart during development
- `supertest: 7.1.1` - HTTP testing library for integration tests

**Package.json Scripts:**
- `start: "node server.js"` - Production server startup
- `dev: "nodemon server.js"` - Development server with auto-reload
- `test: "echo \"No tests specified\""` - Test command placeholder

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
├── express@5.1.0
├── dotenv@16.3.1
├── nodemon@3.0.0
└── supertest@7.1.1
```

### 2.3 Dependency Security Audit

After installation, perform a security audit to ensure all dependencies are secure:

```bash
# Run security audit
npm audit

# Fix any automatically resolvable vulnerabilities
npm audit fix

# Review audit report for manual fixes
npm audit --audit-level=moderate
```

## 3. Configuration

The application uses environment variables for configuration management. This section covers creating and configuring the necessary environment files.

### 3.1 Environment File Creation

#### Step 1: Copy Environment Template

Create your local environment configuration by copying the example file:

```bash
# Ensure you're in the backend directory
cd src/backend

# Copy the environment template
cp .env.example .env
```

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

# HOST - Server binding address
# Default: localhost (local development)
# Docker: 0.0.0.0 (container access)
HOST=localhost
```

**Logging Configuration:**
```env
# LOG_LEVEL - Application logging verbosity
# Values: error, warn, info, debug
# Default: info (appropriate for tutorial)
LOG_LEVEL=info
```

### 3.2 Port Configuration

#### Default Port Settings

The application defaults to port 3000, which is suitable for most development environments:

```env
PORT=3000
```

#### Alternative Port Configuration

If port 3000 is already in use, configure an alternative port:

```env
# Alternative development ports
PORT=3001  # Common alternative
PORT=8000  # Web development alternative
PORT=8080  # Another common alternative
```

#### Port Conflict Resolution

Check for port conflicts before starting the server:

```bash
# Check if port 3000 is in use (Linux/macOS)
lsof -i :3000

# Check if port 3000 is in use (Windows)
netstat -ano | findstr :3000

# Kill process using port 3000 (if needed)
# Linux/macOS:
lsof -ti:3000 | xargs kill -9
# Windows:
# taskkill /PID <PID> /F
```

### 3.3 Environment Validation

Verify your environment configuration:

```bash
# Display current environment variables
cat .env

# Validate environment file syntax
node -e "require('dotenv').config(); console.log('Environment loaded successfully');"
```

## 4. Running the Application

The Node.js tutorial application provides multiple execution modes for different development scenarios.

### 4.1 Production Mode Execution

#### Standard Server Startup

Run the application using the production-like execution mode:

```bash
# Ensure you're in the backend directory
cd src/backend

# Start the server using npm start script
npm start
```

**Expected Console Output:**
```
🚀 HTTP Server successfully started and listening on port 3000
🌐 Server is ready to accept HTTP requests
📍 Local development URL: http://localhost:3000
⚡ Node.js v22.16.0 | Express 5.1.0 | Environment: development
🎯 Tutorial application initialized successfully
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
- `.env` files (Environment variables)

### 4.3 Direct Node.js Execution

#### Alternative Execution Method

You can also run the application directly with Node.js:

```bash
# Direct Node.js execution
node server.js

# With environment variables
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
   • Stop the process using port 3000: lsof -ti:3000 | xargs kill -9
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
# Basic GET request to hello endpoint
curl http://localhost:3000/hello

# Expected response
Hello world

# Detailed curl with headers
curl -v http://localhost:3000/hello

# Expected detailed output includes:
# > GET /hello HTTP/1.1
# > Host: localhost:3000
# < HTTP/1.1 200 OK
# < Content-Type: text/plain; charset=utf-8
# Hello world
```

#### Advanced Testing with Different Tools

**Using wget:**
```bash
# Download response to stdout
wget -qO- http://localhost:3000/hello

# Save response to file
wget -O response.txt http://localhost:3000/hello
```

**Using HTTPie (if installed):**
```bash
# Clean HTTP client
http GET localhost:3000/hello

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: text/plain; charset=utf-8
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

Test server response performance:

```bash
# Measure response time
time curl http://localhost:3000/hello

# Multiple requests for consistency
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
# Test 404 response
curl -i http://localhost:3000/nonexistent

# Expected response:
# HTTP/1.1 404 Not Found
# Content-Type: application/json
# {"error": "Not Found", "message": "The requested resource was not found"}

# Test different HTTP methods on hello endpoint
curl -X POST http://localhost:3000/hello
curl -X PUT http://localhost:3000/hello
curl -X DELETE http://localhost:3000/hello
```

### 5.4 Logging Verification

#### Console Output Analysis

Verify proper logging functionality:

**Successful Request Log:**
```
[INFO] GET /hello - 200 OK (15ms)
[INFO] Client IP: 127.0.0.1
[INFO] User-Agent: curl/7.68.0
```

**Error Request Log:**
```
[WARN] GET /nonexistent - 404 Not Found (5ms)
[ERROR] Invalid endpoint accessed: /nonexistent
```

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
# Ensure you're in the project root directory
cd /path/to/project-root

# Make script executable (if needed)
chmod +x infrastructure/scripts/setup.sh

# Execute the automated setup script
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
# Verify dependencies installation
cd src/backend && npm list --depth=0

# Verify Docker image creation
docker images nodejs-tutorial-app:latest

# Test application startup
npm start
```

#### Container Testing

Test the Docker image created by the script:

```bash
# Run containerized application
docker run -p 3000:3000 nodejs-tutorial-app:latest

# Test containerized endpoint
curl http://localhost:3000/hello
```

### 6.5 Script Troubleshooting

#### Common Script Issues

**Permission Denied:**
```bash
# Fix script permissions
chmod +x infrastructure/scripts/setup.sh
```

**Docker Not Running:**
```bash
# Start Docker daemon (Linux)
sudo systemctl start docker

# On macOS/Windows, start Docker Desktop application
```

**Network Issues During npm Install:**
```bash
# Configure npm registry
npm config set registry https://registry.npmjs.org/

# Clear npm cache
npm cache clean --force
```

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
cd src/backend && npm install

# 4. Start development server
npm run dev
```

#### Development Server Features

**Auto-Reload Capability:**
- Watches for file changes in `.js`, `.json`, `.env` files
- Automatically restarts server on changes
- Maintains console history and logs
- Preserves environment variables across restarts

**Development Logging:**
- Enhanced console output with timestamps
- Request/response logging for debugging
- Error stack traces for development troubleshooting
- Performance metrics for optimization

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
# Install testing dependencies (if not already installed)
npm install --save-dev jest supertest

# Run basic tests (when implemented)
npm test

# Watch mode for continuous testing
npm run test:watch
```

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

1. **Kill Conflicting Process:**
   ```bash
   # Find and kill process (Linux/macOS)
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use Alternative Port:**
   ```bash
   # Start on different port
   PORT=3001 npm start
   
   # Or modify .env file
   echo "PORT=3001" > .env
   ```

3. **Configure Dynamic Port:**
   ```bash
   # Use environment variable
   PORT=0 npm start  # OS assigns available port
   ```

#### Permission Errors

**Problem**: Cannot bind to port due to permissions.

**Solution for Privileged Ports (< 1024):**
```bash
# Use sudo (not recommended for development)
sudo npm start

# Better: Use non-privileged port
PORT=3000 npm start  # Port 3000 doesn't require sudo
```

#### Node.js Version Incompatibility

**Problem**: Express.js 5.1.0 requires Node.js >= 18.0.0.

**Diagnosis:**
```bash
node --version
# If shows v16.x.x or lower, upgrade needed
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
   
   # Reset to default if needed
   npm config set registry https://registry.npmjs.org/
   ```

2. **Clear npm Cache:**
   ```bash
   npm cache clean --force
   npm install
   ```

3. **Use Alternative Registry:**
   ```bash
   # Temporary alternative
   npm install --registry https://registry.npmmirror.com
   ```

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
# Verify node_modules exists
ls -la node_modules/

# Check if express is installed
npm list express
```

**Solutions:**
1. **Reinstall Dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Verify Working Directory:**
   ```bash
   pwd  # Should be in src/backend
   ls package.json  # Should exist
   ```

#### Environment Variable Issues

**Problem**: Environment variables not loading correctly.

**Diagnosis:**
```bash
# Check if .env file exists
ls -la .env

# Verify content
cat .env

# Test environment loading
node -e "require('dotenv').config(); console.log(process.env.PORT);"
```

**Solutions:**
1. **Create .env File:**
   ```bash
   cp .env.example .env
   ```

2. **Fix .env Syntax:**
   ```bash
   # Ensure no spaces around =
   PORT=3000          # Correct
   PORT = 3000        # Incorrect
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

3. **Clear Application Cache:**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Restart Node.js process
   pkill node && npm start
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
   # Remove unused Docker images
   docker system prune -a
   
   # Check available space
   df -h
   ```

3. **Network Issues:**
   ```bash
   # Test Docker Hub connectivity
   docker pull node:22-alpine
   ```

#### Container Runtime Issues

**Problem**: Container starts but application not accessible.

**Diagnosis:**
```bash
# Check running containers
docker ps

# View container logs
docker logs <container_id>

# Inspect container
docker inspect <container_id>
```

**Solutions:**

1. **Port Mapping:**
   ```bash
   # Ensure correct port mapping
   docker run -p 3000:3000 nodejs-tutorial-app:latest
   ```

2. **Container Health:**
   ```bash
   # Check container health
   docker exec -it <container_id> sh
   curl localhost:3000/hello
   ```

## 9. Advanced Configuration

Advanced configuration options for experienced developers and production-like development environments.

### 9.1 Environment-Specific Configuration

#### Multiple Environment Files

Create environment-specific configuration files:

```bash
# Create environment-specific files
cp .env.example .env.development
cp .env.example .env.test
cp .env.example .env.production
```

**Environment File Organization:**

```env
# .env.development
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
HOST=localhost

# .env.test
NODE_ENV=test
PORT=3001
LOG_LEVEL=error
HOST=localhost

# .env.production
NODE_ENV=production
PORT=80
LOG_LEVEL=warn
HOST=0.0.0.0
```

#### Dynamic Environment Loading

```javascript
// config/environment.js
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

#### Structured Logging Setup

Install and configure Winston for production-ready logging:

```bash
# Install Winston logging library
npm install winston winston-daily-rotate-file
```

**Logging Configuration Example:**

```javascript
// utils/logger.js enhancement
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
# Install security middleware
npm install helmet cors rate-limiter-flexible
```

**Security Configuration:**

```javascript
// middleware/security.js
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
  keyProp: 'ip',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

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

### 9.5 Performance Monitoring

#### Application Performance Monitoring

Install performance monitoring tools:

```bash
# Install APM and monitoring tools
npm install clinic newrelic @newrelic/native-metrics
```

**Performance Monitoring Setup:**

```javascript
// monitoring/performance.js
const clinic = require('clinic');

// Performance profiling for development
if (process.env.NODE_ENV === 'development' && process.env.ENABLE_PROFILING) {
  clinic.start({
    tool: 'doctor',
    debug: true
  });
}

// Memory usage monitoring
const monitorMemory = () => {
  const usage = process.memoryUsage();
  console.log(`Memory Usage: RSS=${Math.round(usage.rss / 1024 / 1024)}MB, Heap=${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
};

// Monitor memory every 30 seconds in development
if (process.env.NODE_ENV === 'development') {
  setInterval(monitorMemory, 30000);
}
```

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
        rejectUnauthorized: false
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

Implement comprehensive testing:

```bash
# Install testing dependencies
npm install --save-dev jest supertest @types/jest
```

### 10.2 Production Deployment Preparation

#### Environment Configuration

Create production environment files:

```env
# .env.production
NODE_ENV=production
PORT=80
LOG_LEVEL=warn
HOST=0.0.0.0

# Security settings
SESSION_SECRET=your-secure-session-secret
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=https://yourdomain.com

# Database settings (when needed)
DATABASE_URL=your-production-database-url
REDIS_URL=your-production-redis-url
```

#### Docker Production Configuration

Create production Dockerfile optimizations:

```dockerfile
# Dockerfile.production
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
# .github/workflows/ci.yml
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