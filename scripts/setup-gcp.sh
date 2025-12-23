#!/bin/bash

# Phantom Trifid - GCP Initial Setup Script
# This script sets up your GCP project for the first time

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if gcloud is installed
check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed"
        echo ""
        echo "Please install it by following these steps:"
        echo "1. Visit: https://cloud.google.com/sdk/docs/install"
        echo "2. Download the installer for your OS"
        echo "3. Run the installer and follow the instructions"
        echo "4. Run: gcloud init"
        echo ""
        exit 1
    fi
    print_success "gcloud CLI is installed"
}

# Login to GCP
gcp_login() {
    print_header "GCP Authentication"
    
    print_info "Checking if you're logged in to GCP..."
    
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        print_warning "You are not logged in to GCP"
        print_info "Opening browser for authentication..."
        gcloud auth login
    else
        ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
        print_success "Already logged in as: $ACTIVE_ACCOUNT"
    fi
}

# Create or select GCP project
setup_project() {
    print_header "GCP Project Setup"
    
    echo ""
    echo "Do you want to:"
    echo "1. Create a new GCP project"
    echo "2. Use an existing GCP project"
    echo ""
    read -p "Enter your choice (1 or 2): " choice
    
    case $choice in
        1)
            read -p "Enter a project ID (e.g., phantom-trifid-prod): " PROJECT_ID
            print_info "Creating project: $PROJECT_ID"
            
            gcloud projects create "$PROJECT_ID" --set-as-default
            print_success "Project created: $PROJECT_ID"
            
            # Link billing account
            print_warning "You need to link a billing account to this project"
            echo "Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
            read -p "Press Enter after linking billing account..."
            ;;
        2)
            print_info "Available projects:"
            gcloud projects list --format="table(projectId,name)"
            echo ""
            read -p "Enter the project ID you want to use: " PROJECT_ID
            gcloud config set project "$PROJECT_ID"
            print_success "Using project: $PROJECT_ID"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    # Verify project is set
    CURRENT_PROJECT=$(gcloud config get-value project)
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        print_error "Failed to set project"
        exit 1
    fi
}

# Enable required APIs
enable_apis() {
    print_header "Enabling Required APIs"
    
    apis=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "containerregistry.googleapis.com"
        "secretmanager.googleapis.com"
        "storage.googleapis.com"
    )
    
    print_info "This may take a few minutes..."
    
    for api in "${apis[@]}"; do
        print_info "Enabling $api..."
        gcloud services enable "$api" --project="$PROJECT_ID"
    done
    
    print_success "All required APIs are enabled"
}

# Create service account
create_service_account() {
    print_header "Creating Service Account"
    
    SA_NAME="phantom-trifid-sa"
    SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    # Check if service account exists
    if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
        print_warning "Service account already exists: $SA_EMAIL"
    else
        print_info "Creating service account: $SA_NAME"
        gcloud iam service-accounts create "$SA_NAME" \
            --display-name="Phantom Trifid Service Account" \
            --project="$PROJECT_ID"
        print_success "Service account created: $SA_EMAIL"
    fi
    
    # Grant necessary roles
    print_info "Granting roles to service account..."
    
    roles=(
        "roles/run.admin"
        "roles/storage.admin"
        "roles/secretmanager.secretAccessor"
    )
    
    for role in "${roles[@]}"; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$SA_EMAIL" \
            --role="$role" \
            --quiet
    done
    
    print_success "Service account configured successfully"
}

# Create Cloud Storage bucket for database
create_storage_bucket() {
    print_header "Creating Cloud Storage Bucket"
    
    BUCKET_NAME="${PROJECT_ID}-database"
    
    # Check if bucket exists
    if gsutil ls -b "gs://${BUCKET_NAME}" &>/dev/null; then
        print_warning "Bucket already exists: $BUCKET_NAME"
    else
        print_info "Creating bucket: $BUCKET_NAME"
        gsutil mb -p "$PROJECT_ID" -l "asia-northeast3" "gs://${BUCKET_NAME}"
        print_success "Bucket created: $BUCKET_NAME"
    fi
    
    # Upload initial database file
    if [ -f "server/database.json" ]; then
        print_info "Uploading initial database file..."
        gsutil cp server/database.json "gs://${BUCKET_NAME}/database.json"
        print_success "Database file uploaded"
    fi
}

# Summary
print_summary() {
    print_header "Setup Complete!"
    
    echo ""
    print_success "Your GCP project is now ready for deployment"
    echo ""
    echo -e "${BLUE}Project ID:${NC} $PROJECT_ID"
    echo -e "${BLUE}Region:${NC} asia-northeast3 (Seoul)"
    echo -e "${BLUE}Service Account:${NC} ${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    echo -e "${BLUE}Storage Bucket:${NC} ${PROJECT_ID}-database"
    echo ""
    print_info "Next steps:"
    echo "1. Review your server/.env file and ensure all variables are set"
    echo "2. Run: ./deploy.sh"
    echo ""
}

# Main setup flow
main() {
    print_header "Phantom Trifid - GCP Initial Setup"
    
    check_gcloud
    gcp_login
    setup_project
    enable_apis
    create_service_account
    create_storage_bucket
    print_summary
}

# Run main function
main "$@"
