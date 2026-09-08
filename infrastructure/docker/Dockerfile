# Multi-stage Dockerfile for Node.js v22 LTS tutorial application
# Base image: node:22-alpine for optimal size and security
# Architecture: Multi-stage build for production optimization

# =============================================================================
# STAGE 1: Builder Stage
# Purpose: Install all dependencies and prepare application for production
# =============================================================================
FROM node:22-alpine AS builder

# Build-time arguments declared with their defaults. No instruction in this
# stage reads either of them; the runtime stage declares its own NODE_ENV and
# PORT and is where they are turned into environment variables.
ARG NODE_ENV=production
ARG PORT=3000

# Create the application directory if it is absent and select it as the working
# directory for the instructions that follow. WORKDIR sets no ownership or
# permissions; the runtime stage assigns those with chown after adding its user.
WORKDIR /usr/src/app

# Copy package management files first for optimal Docker layer caching
# This allows Docker to cache the npm install step when only source code changes
COPY src/backend/package.json src/backend/package-lock.json ./

# Install all dependencies (including devDependencies for potential build steps)
# Using npm ci for faster, reliable, reproducible builds in production environments
# npm ci installs dependencies directly from package-lock.json
RUN npm ci --include=dev \
    && npm cache clean --force

# Copy src/backend as filtered by the root .dockerignore (no node_modules, tests, envs)
# This includes all source code files needed for the application
COPY src/backend/ ./

# =============================================================================
# STAGE 2: Production Stage  
# Purpose: Lean runtime image - a production-only dependency tree, execution as
#          a non-root user, and a build context filtered by the root
#          .dockerignore. What still travels in is named at the copy below.
# =============================================================================
FROM node:22-alpine

# Set build-time arguments that will be converted to environment variables
ARG NODE_ENV=production
ARG PORT=3000

# Set environment variables for production optimization
# NODE_ENV=production enables Express.js production optimizations and security features
# PORT defines the application listening port inside the container
ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

# Create application directory
WORKDIR /usr/src/app

# Copy package management files from builder stage for production dependency installation
COPY --from=builder /usr/src/app/package.json /usr/src/app/package-lock.json ./

# Install only production dependencies to minimize image size and security exposure
# --omit=dev excludes devDependencies from installation
# --only=production ensures only runtime dependencies are installed
RUN npm ci --omit=dev --only=production \
    && npm cache clean --force

# Copy source from the build context; the builder's dev tree would overwrite the install
# The root .dockerignore filters that context first, so dependency trees, tests,
# coverage output, tooling configuration and environment files never arrive here.
# This is a directory copy, so README.md, .gitignore and package-lock.json do
# arrive with the sources; none is read at run time and none is executable.
COPY src/backend/ ./

# Create a non-root user for enhanced container security
# This follows security best practices by avoiding running as root
# Alpine Linux includes a 'node' user by default in the official Node.js images
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Change ownership of application files to the non-root user
RUN chown -R nodejs:nodejs /usr/src/app

# Record the listening port in the image metadata, where tooling and
# orchestration platforms read it. EXPOSE publishes nothing by itself: reaching
# the port from the host needs `docker run -p <host>:<container>`, or `docker
# run -P`, which maps every exposed port to a random free host port.
EXPOSE ${PORT}

# Switch to non-root user before starting the application
# This ensures the application runs with minimal privileges for security
USER nodejs

# Health check: issues HEAD /hello, and is the only consumer that exercises the
# HEAD behaviour Express derives from the single GET route declaration - the
# Kubernetes probes and the CD gate all issue GET - so a HEAD regression turns
# the container unhealthy instead of passing unnoticed. BusyBox wget is
# deliberately not used: on Alpine it builds a GET for every non-POST request
# and --spider suppresses only the response body, never switching the verb.
# The request is bounded by its own 2s socket timeout, inside the 3s HEALTHCHECK
# timeout, and exits 0 on a 2xx/3xx status and 1 on any other status, on a
# connection error and on a timeout. Exec form, so no shell is involved and the
# probe's own process.exit supplies the status rather than an `|| exit 1` idiom.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "-e", "const http=require('http');const req=http.request({host:'127.0.0.1',port:process.env.PORT||3000,path:'/hello',method:'HEAD',timeout:2000},(res)=>{res.resume();process.exit(res.statusCode>=200&&res.statusCode<400?0:1);});req.on('timeout',()=>{req.destroy();process.exit(1);});req.on('error',()=>process.exit(1));req.end();"]

# Define the default command to start the application
# Uses npm start which should be defined in package.json
# CMD is used instead of ENTRYPOINT to allow easy override during development
CMD ["npm", "start"]

# =============================================================================
# Dockerfile Metadata and Documentation
# =============================================================================
# Built for: Node.js 22 LTS tutorial application. Both stages use the floating
#            node:22-alpine tag, so the patch level is whichever 22.x release
#            that tag resolves to at build time, not a pinned version.
# Express.js: 5.1.0 with enhanced security and performance features
# Architecture: Multi-stage build for production optimization
# Security: Runs as non-root uid 1001; runtime dependencies only, installed by
#           npm ci --omit=dev; build context filtered by the root .dockerignore.
#           README.md, .gitignore and package-lock.json ship with the sources
#           and are never read by the running application.
# Performance: Alpine Linux base for minimal image size
# Health monitoring: Built-in health check for container orchestration
# Port configuration: Configurable via PORT environment variable (default: 3000)
# =============================================================================

# Build instructions:
# docker build -t nodejs-tutorial-app -f infrastructure/docker/Dockerfile .
# docker run -p 3000:3000 nodejs-tutorial-app

# Development override example:
# docker run -p 3000:3000 -e NODE_ENV=development nodejs-tutorial-app

# Production deployment with custom port:
# docker run -p 8080:8080 -e PORT=8080 nodejs-tutorial-app