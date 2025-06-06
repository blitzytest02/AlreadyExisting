#!/bin/bash

# Kubernetes Deployment Script for Node.js Tutorial Application
# This script automates the deployment of the containerized application to a Kubernetes cluster
# using kubectl to update the existing deployment with a new Docker image tag

# Set shell options for safety and reliability
set -e  # Exit immediately if a command exits with a non-zero status
set -u  # Treat unset variables as an error and exit immediately

# Color codes for enhanced logging output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Script metadata
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_VERSION="1.0.0"
readonly TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# Logging functions for consistent output formatting
log_info() {
    echo -e "${BLUE}[INFO]${NC} ${TIMESTAMP} - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} ${TIMESTAMP} - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} ${TIMESTAMP} - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ${TIMESTAMP} - $1" >&2
}

# Function to validate required environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    local missing_vars=()
    
    # Check for required environment variables
    if [[ -z "${IMAGE_NAME:-}" ]]; then
        missing_vars+=("IMAGE_NAME")
    fi
    
    if [[ -z "${KUBE_NAMESPACE:-}" ]]; then
        missing_vars+=("KUBE_NAMESPACE")
    fi
    
    if [[ -z "${DEPLOYMENT_NAME:-}" ]]; then
        missing_vars+=("DEPLOYMENT_NAME")
    fi
    
    # Report missing variables
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error "Please set all required environment variables before running this script."
        exit 1
    fi
    
    log_success "All required environment variables are set"
}

# Function to validate kubectl availability and cluster connectivity
validate_kubectl() {
    log_info "Validating kubectl installation and cluster connectivity..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        log_error "Please install kubectl from: https://kubernetes.io/docs/tasks/tools/"
        exit 1
    fi
    
    # Get kubectl version for logging
    local kubectl_version
    kubectl_version=$(kubectl version --client --short 2>/dev/null | grep "Client Version" | cut -d' ' -f3 || echo "unknown")
    log_info "kubectl version: ${kubectl_version}"
    
    # Test cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster"
        log_error "Please ensure your kubeconfig is properly configured"
        exit 1
    fi
    
    log_success "kubectl is available and cluster is accessible"
}

# Function to validate namespace existence
validate_namespace() {
    log_info "Validating Kubernetes namespace: ${KUBE_NAMESPACE}"
    
    if ! kubectl get namespace "${KUBE_NAMESPACE}" &> /dev/null; then
        log_error "Namespace '${KUBE_NAMESPACE}' does not exist"
        log_error "Please create the namespace or check the KUBE_NAMESPACE environment variable"
        exit 1
    fi
    
    log_success "Namespace '${KUBE_NAMESPACE}' exists and is accessible"
}

# Function to validate deployment existence
validate_deployment() {
    log_info "Validating Kubernetes deployment: ${DEPLOYMENT_NAME}"
    
    if ! kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" &> /dev/null; then
        log_error "Deployment '${DEPLOYMENT_NAME}' does not exist in namespace '${KUBE_NAMESPACE}'"
        log_error "Please ensure the deployment exists or check the DEPLOYMENT_NAME environment variable"
        exit 1
    fi
    
    log_success "Deployment '${DEPLOYMENT_NAME}' exists in namespace '${KUBE_NAMESPACE}'"
}

# Function to get current deployment status
get_deployment_status() {
    local ready_replicas
    local total_replicas
    
    ready_replicas=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    total_replicas=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    log_info "Current deployment status: ${ready_replicas:-0}/${total_replicas} replicas ready"
}

# Function to backup current deployment image for rollback capability
backup_current_image() {
    log_info "Backing up current deployment image for rollback capability..."
    
    local current_image
    current_image=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].image}' 2>/dev/null || echo "unknown")
    
    if [[ "${current_image}" != "unknown" ]]; then
        export PREVIOUS_IMAGE="${current_image}"
        log_info "Current image backed up: ${current_image}"
    else
        log_warning "Could not determine current image for backup"
    fi
}

# Function to update the deployment with the new image
update_deployment() {
    log_info "Starting deployment update process..."
    log_info "Updating deployment '${DEPLOYMENT_NAME}' in namespace '${KUBE_NAMESPACE}'"
    log_info "New image: ${IMAGE_NAME}"
    
    # Execute kubectl set image command to update the 'backend' container
    # This targets the backend container as defined in infrastructure/kubernetes/deployment.yaml
    if kubectl set image deployment/"${DEPLOYMENT_NAME}" backend="${IMAGE_NAME}" -n "${KUBE_NAMESPACE}"; then
        log_success "Deployment image update command executed successfully"
    else
        log_error "Failed to execute deployment image update command"
        exit 1
    fi
}

# Function to monitor the rollout status
monitor_rollout() {
    log_info "Monitoring deployment rollout status..."
    log_info "This may take a few minutes depending on your deployment strategy..."
    
    # Set a timeout for the rollout (default: 600 seconds = 10 minutes)
    local timeout="${ROLLOUT_TIMEOUT:-600}"
    log_info "Rollout timeout set to ${timeout} seconds"
    
    # Monitor the rollout status with timeout
    if timeout "${timeout}" kubectl rollout status deployment/"${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" --timeout="${timeout}s"; then
        log_success "Deployment rollout completed successfully"
    else
        local exit_code=$?
        if [[ ${exit_code} -eq 124 ]]; then
            log_error "Deployment rollout timed out after ${timeout} seconds"
        else
            log_error "Deployment rollout failed with exit code ${exit_code}"
        fi
        
        # Get current status for troubleshooting
        log_info "Current deployment status for troubleshooting:"
        kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" || true
        kubectl describe deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" || true
        
        exit 1
    fi
}

# Function to verify deployment health after update
verify_deployment() {
    log_info "Verifying deployment health after update..."
    
    # Wait a short time for metrics to stabilize
    sleep 10
    
    # Check if all replicas are ready
    local ready_replicas
    local total_replicas
    
    ready_replicas=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    total_replicas=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "${ready_replicas:-0}" -eq "${total_replicas}" ]] && [[ "${total_replicas}" -gt 0 ]]; then
        log_success "All ${total_replicas} replicas are ready and healthy"
    else
        log_error "Deployment verification failed: ${ready_replicas:-0}/${total_replicas} replicas ready"
        exit 1
    fi
    
    # Verify the image was updated correctly
    local current_image
    current_image=$(kubectl get deployment "${DEPLOYMENT_NAME}" -n "${KUBE_NAMESPACE}" -o jsonpath='{.spec.template.spec.containers[?(@.name=="backend")].image}' 2>/dev/null || echo "unknown")
    
    if [[ "${current_image}" == "${IMAGE_NAME}" ]]; then
        log_success "Image update verified: ${current_image}"
    else
        log_error "Image update verification failed. Expected: ${IMAGE_NAME}, Actual: ${current_image}"
        exit 1
    fi
}

# Function to display deployment summary
display_summary() {
    log_info "=== Deployment Summary ==="
    log_info "Script: ${SCRIPT_NAME} v${SCRIPT_VERSION}"
    log_info "Timestamp: ${TIMESTAMP}"
    log_info "Namespace: ${KUBE_NAMESPACE}"
    log_info "Deployment: ${DEPLOYMENT_NAME}"
    log_info "New Image: ${IMAGE_NAME}"
    
    if [[ -n "${PREVIOUS_IMAGE:-}" ]]; then
        log_info "Previous Image: ${PREVIOUS_IMAGE}"
    fi
    
    # Display final deployment status
    get_deployment_status
    
    log_success "=== Deployment completed successfully! ==="
}

# Function to handle script cleanup and error handling
cleanup() {
    local exit_code=$?
    
    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Script failed with exit code ${exit_code}"
        log_info "Check the logs above for detailed error information"
        
        if [[ -n "${PREVIOUS_IMAGE:-}" ]]; then
            log_info "To rollback, you can use: kubectl set image deployment/${DEPLOYMENT_NAME} backend=${PREVIOUS_IMAGE} -n ${KUBE_NAMESPACE}"
        fi
    fi
    
    exit ${exit_code}
}

# Main execution function
main() {
    # Set up error handling
    trap cleanup EXIT
    
    # Display script header
    log_info "=== Kubernetes Deployment Script ==="
    log_info "Starting deployment process for Node.js Tutorial Application"
    log_info "Script: ${SCRIPT_NAME} v${SCRIPT_VERSION}"
    log_info "Timestamp: ${TIMESTAMP}"
    
    # Validation phase
    log_info "=== Validation Phase ==="
    validate_environment
    validate_kubectl
    validate_namespace
    validate_deployment
    
    # Pre-deployment status
    log_info "=== Pre-deployment Status ==="
    get_deployment_status
    backup_current_image
    
    # Deployment phase
    log_info "=== Deployment Phase ==="
    update_deployment
    monitor_rollout
    
    # Verification phase
    log_info "=== Verification Phase ==="
    verify_deployment
    
    # Summary
    display_summary
}

# Script entry point
# Only execute main function if script is run directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi