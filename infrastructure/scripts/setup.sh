#!/bin/bash

# =============================================================================
# Node.js Tutorial Application - Development Environment Setup Script
# =============================================================================
# 
# Purpose: Automates the setup of the development environment for the Node.js 
#          tutorial application, ensuring all prerequisites are met, installing 
#          backend dependencies, and building the Docker container image for 
#          consistent development and testing environments.
#
# Version: 1.0.0
# Author: Development Team
# Target: Node.js v22.16.0 LTS with Express.js 5.1.0
# 
# Requirements Addressed:
# - Development Environment Setup (TECHNICAL_SPECIFICATIONS.md/3.6.3)
# - Package Installation Commands (TECHNICAL_SPECIFICATIONS.md/3.3.4) 
# - Containerization (TECHNICAL_SPECIFICATIONS.md/3.6.5)
#
# Usage: ./infrastructure/scripts/setup.sh
# Prerequisites: Run from project root directory
# =============================================================================

# Script configuration and global variables
set -euo pipefail  # Exit on error, undefined variables, and pipe failures
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKEND_DIR="${PROJECT_ROOT}/src/backend"
DOCKER_FILE_PATH="${PROJECT_ROOT}/infrastructure/docker/Dockerfile"
DOCKER_IMAGE_NAME="nodejs-tutorial-app"
DOCKER_IMAGE_TAG="latest"

# Color codes for enhanced terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions for consistent output formatting
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# =============================================================================
# Function: check_prerequisites
# Description: Verifies that all necessary tools (Node.js, npm, Docker) are 
#              installed on the system before proceeding with the setup.
#              Validates Node.js version against technical specifications.
# Parameters: None
# Returns: Exits with error code if any prerequisite is not met
# =============================================================================
check_prerequisites() {
    log_info "Checking system prerequisites for Node.js tutorial application setup..."
    
    # Check for Node.js installation and version compatibility
    # Technical Specification requirement: Node.js >= 18.0.0 (Target: v22.16.0 LTS)
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        log_error "Please install Node.js v22.16.0 LTS from: https://nodejs.org/"
        log_error "Minimum required version: 18.0.0"
        exit 1
    fi
    
    # Extract and validate Node.js version
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
    
    if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
        log_error "Node.js version $NODE_VERSION is not supported"
        log_error "Minimum required version: 18.0.0"
        log_error "Recommended version: 22.16.0 LTS"
        log_error "Current version: $NODE_VERSION"
        exit 1
    fi
    
    log_success "Node.js version $NODE_VERSION detected (minimum v18.0.0 required)"
    
    # Check for npm package manager availability
    # Technical Specification requirement: npm >= 8.0.0 (Target: 11.4.1+)
    if ! command -v npm &> /dev/null; then
        log_error "npm package manager is not installed or not in PATH"
        log_error "npm should be bundled with Node.js installation"
        log_error "Please reinstall Node.js or install npm separately"
        exit 1
    fi
    
    # Extract and validate npm version
    NPM_VERSION=$(npm --version)
    NPM_MAJOR_VERSION=$(echo $NPM_VERSION | cut -d. -f1)
    
    if [ "$NPM_MAJOR_VERSION" -lt 8 ]; then
        log_warning "npm version $NPM_VERSION detected. Recommended: 8.0.0+"
        log_warning "Consider upgrading npm with: npm install -g npm@latest"
    else
        log_success "npm version $NPM_VERSION detected (minimum v8.0.0 required)"
    fi
    
    # Check for Docker availability for containerization support
    # Required for building application container image (nodejs-tutorial-app)
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        log_error "Docker is required for building the application container image"
        log_error "Please install Docker from: https://docker.com/get-started"
        log_error "Ensure Docker daemon is running after installation"
        exit 1
    fi
    
    # Verify Docker daemon is running and accessible
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or not accessible"
        log_error "Please start Docker daemon and ensure current user has Docker permissions"
        log_error "Try: sudo systemctl start docker (Linux) or start Docker Desktop"
        exit 1
    fi
    
    DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    log_success "Docker version $DOCKER_VERSION detected and daemon is running"
    
    # Verify project structure and required files exist
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend source directory not found: $BACKEND_DIR"
        log_error "Please ensure script is run from project root directory"
        exit 1
    fi
    
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        log_error "package.json not found in backend directory: $BACKEND_DIR"
        log_error "Required for dependency installation process"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_FILE_PATH" ]; then
        log_error "Dockerfile not found: $DOCKER_FILE_PATH"
        log_error "Required for container image build process"
        exit 1
    fi
    
    log_success "All system prerequisites verified successfully"
    log_info "Project structure validation completed"
}

# =============================================================================
# Function: install_dependencies
# Description: Navigates to the backend source directory and installs the 
#              Node.js dependencies using npm. Handles package.json processing
#              and validates successful installation.
# Parameters: None
# Returns: Exits with error code if dependency installation fails
# =============================================================================
install_dependencies() {
    log_info "Starting Node.js dependency installation process..."
    log_info "Target directory: $BACKEND_DIR"
    log_info "Installing dependencies from package.json specification"
    
    # Navigate to backend source directory for dependency installation
    # This directory contains package.json with Express.js 5.1.0 and related dependencies
    cd "$BACKEND_DIR" || {
        log_error "Failed to change directory to: $BACKEND_DIR"
        log_error "Please verify backend source directory exists and is accessible"
        exit 1
    }
    
    log_info "Changed working directory to: $(pwd)"
    
    # Display package.json information for transparency
    if [ -f "package.json" ]; then
        PACKAGE_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | cut -d'"' -f4)
        PACKAGE_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | cut -d'"' -f4)
        log_info "Installing dependencies for: $PACKAGE_NAME v$PACKAGE_VERSION"
    fi
    
    # Execute npm install command to download and install dependencies
    # Installs production dependencies: express ^5.1.0, dotenv ^16.3.1
    # Installs development dependencies: nodemon ^3.0.0, supertest 7.1.1
    log_info "Executing: npm install"
    log_info "This may take several minutes depending on network speed..."
    
    # Run npm install with enhanced error handling and output capture
    if npm install --progress=true --loglevel=info; then
        log_success "npm dependencies installed successfully"
        
        # Verify node_modules directory was created and populated
        if [ -d "node_modules" ]; then
            MODULES_COUNT=$(find node_modules -mindepth 1 -maxdepth 1 -type d | wc -l)
            log_info "Created node_modules directory with $MODULES_COUNT packages"
        fi
        
        # Display installed package information
        if [ -f "package-lock.json" ]; then
            log_info "package-lock.json created for dependency version locking"
        fi
        
    else
        log_error "npm install command failed"
        log_error "Common causes and solutions:"
        log_error "  - Network connectivity issues: Check internet connection"
        log_error "  - npm registry accessibility: Try 'npm config set registry https://registry.npmjs.org/'"
        log_error "  - Disk space: Ensure sufficient disk space for node_modules"
        log_error "  - Permissions: Ensure write permissions in project directory"
        log_error "  - Corrupt cache: Try 'npm cache clean --force' and retry"
        exit 1
    fi
    
    # Perform security audit on installed dependencies
    log_info "Running security audit on installed dependencies..."
    if npm audit --audit-level=moderate; then
        log_success "Security audit completed - no critical vulnerabilities found"
    else
        log_warning "Security audit detected potential vulnerabilities"
        log_warning "Review with: npm audit"
        log_warning "Fix with: npm audit fix (if automatic fixes available)"
    fi
    
    # Return to project root directory for subsequent operations
    cd "$PROJECT_ROOT" || {
        log_error "Failed to return to project root directory: $PROJECT_ROOT"
        exit 1
    }
    
    log_success "Dependency installation process completed successfully"
}

# =============================================================================
# Function: build_docker_image
# Description: Builds the Docker image for the application using the specified 
#              Dockerfile. Creates a containerized version of the Node.js 
#              tutorial application for consistent deployment environments.
# Parameters: None
# Returns: Exits with error code if Docker image build fails
# =============================================================================
build_docker_image() {
    log_info "Starting Docker image build process..."
    log_info "Building containerized version of Node.js tutorial application"
    log_info "Dockerfile location: $DOCKER_FILE_PATH"
    log_info "Target image: $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"
    
    # Ensure we're in the project root directory for Docker build context
    # Docker build context includes all necessary files for multi-stage build
    cd "$PROJECT_ROOT" || {
        log_error "Failed to change directory to project root: $PROJECT_ROOT"
        log_error "Docker build requires project root as build context"
        exit 1
    }
    
    log_info "Changed working directory to: $(pwd)"
    log_info "Docker build context: $(pwd)"
    
    # Verify Dockerfile exists and is readable
    if [ ! -f "$DOCKER_FILE_PATH" ]; then
        log_error "Dockerfile not found at: $DOCKER_FILE_PATH"
        log_error "Cannot proceed with container image build"
        exit 1
    fi
    
    log_info "Dockerfile verified: $DOCKER_FILE_PATH"
    
    # Display Docker build configuration
    log_info "Build configuration:"
    log_info "  - Base image: node:22-alpine (multi-stage build)"
    log_info "  - Target platform: Production-optimized Node.js environment"
    log_info "  - Image name: $DOCKER_IMAGE_NAME"
    log_info "  - Image tag: $DOCKER_IMAGE_TAG"
    log_info "  - Build context: Current directory and subdirectories"
    
    # Execute Docker build command with comprehensive configuration
    # Uses multi-stage Dockerfile for production-optimized image
    # Dockerfile creates lean, secure image with non-root user execution
    log_info "Executing Docker build command..."
    log_info "This process may take several minutes for first-time builds..."
    
    if docker build \
        --file "$DOCKER_FILE_PATH" \
        --tag "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG" \
        --progress=plain \
        . ; then
        
        log_success "Docker image built successfully: $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"
        
        # Verify image was created and display information
        if docker images "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep -v "REPOSITORY"; then
            log_info "Docker image details displayed above"
        fi
        
        # Display image size and layers information
        IMAGE_SIZE=$(docker images "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG" --format "{{.Size}}")
        log_info "Final image size: $IMAGE_SIZE"
        
        # Provide usage instructions for the built image
        log_info "Docker image usage instructions:"
        log_info "  - Run container: docker run -p 3000:3000 $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"
        log_info "  - Run in background: docker run -d -p 3000:3000 $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"
        log_info "  - View logs: docker logs <container_id>"
        log_info "  - Stop container: docker stop <container_id>"
        
    else
        log_error "Docker image build failed"
        log_error "Common causes and solutions:"
        log_error "  - Docker daemon not running: Start Docker service"
        log_error "  - Insufficient disk space: Free up disk space"
        log_error "  - Network issues: Check Docker Hub connectivity"
        log_error "  - Dockerfile syntax: Verify Dockerfile syntax"
        log_error "  - Build context issues: Ensure all required files are accessible"
        log_error "  - Base image issues: Verify node:22-alpine image availability"
        exit 1
    fi
    
    log_success "Docker image build process completed successfully"
}

# =============================================================================
# Main Execution Flow
# Description: Orchestrates the complete development environment setup process
#              by calling each setup function in the correct sequence and 
#              providing comprehensive status reporting.
# =============================================================================

# Script execution banner and environment information
echo "============================================================================="
echo "Node.js Tutorial Application - Development Environment Setup"
echo "============================================================================="
echo "Script version: 1.0.0"
echo "Execution timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "Project root: $PROJECT_ROOT"
echo "Backend directory: $BACKEND_DIR"
echo "Docker configuration: $DOCKER_FILE_PATH"
echo "Target image: $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"
echo "============================================================================="

# Phase 1: Prerequisites Verification
# Validates system environment and required tools installation
log_info "Phase 1/3: Prerequisites Verification"
check_prerequisites

echo ""

# Phase 2: Dependency Installation  
# Installs Node.js packages required for application execution
log_info "Phase 2/3: Node.js Dependency Installation"
install_dependencies

echo ""

# Phase 3: Container Image Build
# Creates Docker image for consistent deployment environments
log_info "Phase 3/3: Docker Image Build"
build_docker_image

echo ""

# Setup completion summary and next steps
echo "============================================================================="
log_success "Development environment setup completed successfully!"
echo "============================================================================="

log_info "Setup Summary:"
log_info "  ✓ System prerequisites verified (Node.js, npm, Docker)"
log_info "  ✓ Backend dependencies installed (Express.js 5.1.0 + related packages)"
log_info "  ✓ Docker image built ($DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG)"
log_info "  ✓ Environment ready for development and testing"

echo ""
log_info "Next Steps - Application Usage:"
log_info "  1. Start development server:"
log_info "     cd $BACKEND_DIR && npm start"
log_info "  2. Start with auto-reload (development):"
log_info "     cd $BACKEND_DIR && npm run dev"
log_info "  3. Run containerized version:"
log_info "     docker run -p 3000:3000 $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"
log_info "  4. Test application endpoint:"
log_info "     curl http://localhost:3000/hello"
log_info "     or visit http://localhost:3000/hello in browser"

echo ""
log_info "Development Resources:"
log_info "  - Application logs: Console output"
log_info "  - Package management: npm commands in $BACKEND_DIR"
log_info "  - Container management: docker commands with $DOCKER_IMAGE_NAME"
log_info "  - Technical documentation: TECHNICAL_SPECIFICATIONS.md"

echo ""
log_success "Setup process completed at $(date '+%Y-%m-%d %H:%M:%S %Z')"
log_success "Node.js tutorial application development environment is ready!"

echo "============================================================================="

# Exit successfully
exit 0