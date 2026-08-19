# Multi-stage Dockerfile for Node.js v22 LTS tutorial application
# Base image: node:22-alpine for optimal size and security
# Architecture: Multi-stage build for production optimization

# =============================================================================
# STAGE 1: Builder Stage
# Purpose: Install all dependencies and prepare application for production
# =============================================================================
FROM node:22-alpine AS builder

# Set build-time arguments for environment configuration
ARG NODE_ENV=production
ARG PORT=3000

# Create application directory with proper permissions
WORKDIR /usr/src/app

# Copy package management files first for optimal Docker layer caching
# This allows Docker to cache the npm install step when only source code changes
COPY src/backend/package.json src/backend/package-lock.json ./

# Install all dependencies (including devDependencies for potential build steps)
# Using npm ci for faster, reliable, reproducible builds in production environments
# npm ci installs dependencies directly from package-lock.json
RUN npm ci --include=dev \
    && npm cache clean --force

# Copy the entire src/backend directory into the container
# This includes all source code files needed for the application
COPY src/backend/ ./

# =============================================================================
# STAGE 2: Production Stage  
# Purpose: Create lean, optimized production image with minimal attack surface
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

# Install dependencies for the environment this image is built for
# --omit=dev excludes devDependencies from installation, so the default build
#   (NODE_ENV=production, from the ARG above) ships runtime dependencies only and keeps
#   image size and security exposure to a minimum
# --include=dev applies only when NODE_ENV=development, which is the build argument
#   infrastructure/docker/docker-compose.yml passes for the local development service:
#   that service overrides the command with `npm run dev`, which runs nodemon - a
#   devDependency - from inside the container, and its anonymous /usr/src/app/node_modules
#   volume is seeded from this image rather than from the host
# Any other NODE_ENV value falls back to the lean production install
RUN if [ "${NODE_ENV}" = "development" ]; then \
        npm ci --include=dev; \
    else \
        npm ci --omit=dev; \
    fi \
    && npm cache clean --force

# Copy application source code from builder stage
# This ensures only necessary files are included in the final image
# Copied paths: server.js, app.js, config/, routes/, middleware/, utils/
COPY --from=builder /usr/src/app/server.js /usr/src/app/app.js ./
COPY --from=builder /usr/src/app/config/ ./config/
COPY --from=builder /usr/src/app/routes/ ./routes/
COPY --from=builder /usr/src/app/middleware/ ./middleware/
COPY --from=builder /usr/src/app/utils/ ./utils/

# Create a non-root user for enhanced container security
# This follows security best practices by avoiding running as root
# Alpine Linux includes a 'node' user by default in the official Node.js images
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Change ownership of application files to the non-root user
RUN chown -R nodejs:nodejs /usr/src/app

# Expose the application port to allow external traffic
# This documents which port the container listens on and enables port mapping
EXPOSE ${PORT}

# Switch to non-root user before starting the application
# This ensures the application runs with minimal privileges for security
USER nodejs

# Add health check to monitor container health and application responsiveness
# This enables Docker and orchestration platforms to detect application health
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/hello || exit 1

# Define the default command to start the application
# Uses npm start which should be defined in package.json
# CMD is used instead of ENTRYPOINT to allow easy override during development
CMD ["npm", "start"]

# =============================================================================
# Dockerfile Metadata and Documentation
# =============================================================================
# Built for: Node.js v22.16.0 LTS tutorial application
# Express.js: 5.1.0 with enhanced security and performance features
# Architecture: Multi-stage build for production optimization
# Security: Non-root user execution, minimal attack surface
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