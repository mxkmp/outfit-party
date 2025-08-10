#!/bin/bash

# Service Account Creation Script for Outfit Voting App
set -e

echo "🔐 Creating Service Account for Outfit Voting App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ Google Cloud CLI is not installed${NC}"
        echo "Please install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️ jq is not installed. Installing...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install jq || {
                echo -e "${RED}❌ Failed to install jq. Please install it manually: brew install jq${NC}"
                exit 1
            }
        elif command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y jq
        else
            echo -e "${RED}❌ Please install jq manually${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Get or validate project ID
get_project_id() {
    # Try to get current project
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [ -z "$CURRENT_PROJECT" ]; then
        echo -e "${YELLOW}📋 No project set in gcloud config${NC}"
        echo "Available projects:"
        gcloud projects list --format="table(projectId,name,projectNumber)"
        echo ""
        read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    else
        echo -e "${BLUE}Current project: $CURRENT_PROJECT${NC}"
        read -p "Use current project '$CURRENT_PROJECT'? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PROJECT_ID=$CURRENT_PROJECT
        else
            echo "Available projects:"
            gcloud projects list --format="table(projectId,name,projectNumber)"
            echo ""
            read -p "Enter your Google Cloud Project ID: " PROJECT_ID
        fi
    fi
    
    # Set the project
    gcloud config set project $PROJECT_ID
    echo -e "${GREEN}✅ Project set to: $PROJECT_ID${NC}"
}

# Create service account
create_service_account() {
    SERVICE_ACCOUNT_NAME="outfit-voting-deploy"
    SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    echo "🔧 Creating service account..."
    
    # Check if service account already exists
    if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
        echo -e "${YELLOW}⚠️ Service account already exists: $SERVICE_ACCOUNT_EMAIL${NC}"
        read -p "Do you want to continue with existing service account? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Exiting..."
            exit 1
        fi
    else
        # Create service account
        echo "Creating service account: $SERVICE_ACCOUNT_EMAIL"
        gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
            --display-name="Outfit Voting Deployment Service Account" \
            --description="Service account for deploying outfit voting app to Cloud Functions and Cloud Storage" \
            --project=$PROJECT_ID
        
        # Wait a moment for the service account to propagate
        echo "Waiting for service account to propagate..."
        sleep 5
        
        # Verify creation
        if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
            echo -e "${GREEN}✅ Service account created successfully: $SERVICE_ACCOUNT_EMAIL${NC}"
        else
            echo -e "${RED}❌ Failed to create service account${NC}"
            exit 1
        fi
    fi
}

# Assign IAM roles
assign_roles() {
    echo "🔑 Assigning IAM roles..."
    
    SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    
    # Verify service account exists before assigning roles
    if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
        echo -e "${RED}❌ Service account does not exist: $SERVICE_ACCOUNT_EMAIL${NC}"
        echo "Please ensure the service account was created successfully."
        exit 1
    fi
    
    # Required roles for deployment
    ROLES=(
        "roles/cloudfunctions.admin"
        "roles/storage.admin"
        "roles/iam.serviceAccountUser"
        "roles/cloudbuild.builds.editor"
        "roles/logging.viewer"
    )
    
    for role in "${ROLES[@]}"; do
        echo "Assigning role: $role to $SERVICE_ACCOUNT_EMAIL"
        
        # Add retry logic for role assignment
        max_retries=3
        retry_count=0
        
        while [ $retry_count -lt $max_retries ]; do
            if gcloud projects add-iam-policy-binding $PROJECT_ID \
                --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
                --role="$role" \
                --project=$PROJECT_ID \
                --quiet; then
                echo -e "${GREEN}✅ Successfully assigned $role${NC}"
                break
            else
                retry_count=$((retry_count + 1))
                if [ $retry_count -lt $max_retries ]; then
                    echo -e "${YELLOW}⚠️ Retry $retry_count/$max_retries for role $role${NC}"
                    sleep 3
                else
                    echo -e "${RED}❌ Failed to assign role $role after $max_retries attempts${NC}"
                    exit 1
                fi
            fi
        done
    done
    
    echo -e "${GREEN}✅ All IAM roles assigned successfully${NC}"
}

# Enable required APIs
enable_apis() {
    echo "🔌 Enabling required APIs..."
    
    APIS=(
        "cloudfunctions.googleapis.com"
        "storage.googleapis.com"
        "cloudbuild.googleapis.com"
        "cloudresourcemanager.googleapis.com"
        "iam.googleapis.com"
    )
    
    for api in "${APIS[@]}"; do
        echo "Enabling: $api"
        gcloud services enable $api --quiet
    done
    
    echo -e "${GREEN}✅ APIs enabled${NC}"
}

# Create service account key
create_service_account_key() {
    echo "🗝️ Creating service account key..."
    
    SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    KEY_FILE="service-account-key.json"
    
    # Verify service account exists
    if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
        echo -e "${RED}❌ Service account does not exist: $SERVICE_ACCOUNT_EMAIL${NC}"
        exit 1
    fi
    
    # Remove existing key file if exists
    if [ -f "$KEY_FILE" ]; then
        echo -e "${YELLOW}⚠️ Removing existing key file${NC}"
        rm "$KEY_FILE"
    fi
    
    # Create new key with retry logic
    max_retries=3
    retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL \
            --project=$PROJECT_ID; then
            echo -e "${GREEN}✅ Service account key created: $KEY_FILE${NC}"
            break
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                echo -e "${YELLOW}⚠️ Retry $retry_count/$max_retries for key creation${NC}"
                sleep 3
            else
                echo -e "${RED}❌ Failed to create service account key after $max_retries attempts${NC}"
                exit 1
            fi
        fi
    done
    
    # Verify key file was created
    if [ ! -f "$KEY_FILE" ]; then
        echo -e "${RED}❌ Key file was not created${NC}"
        exit 1
    fi
    
    # Validate JSON format
    if ! jq empty "$KEY_FILE" 2>/dev/null; then
        echo -e "${RED}❌ Invalid JSON in key file${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Service account key validated${NC}"
}

# Create storage bucket
create_storage_bucket() {
    echo "🪣 Creating storage bucket..."
    
    BUCKET_NAME="${PROJECT_ID}-outfit-images"
    REGION="europe-west3"
    
    # Check if bucket exists
    if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
        echo -e "${YELLOW}⚠️ Bucket already exists: $BUCKET_NAME${NC}"
    else
        # Create bucket
        gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$BUCKET_NAME
        echo -e "${GREEN}✅ Bucket created: $BUCKET_NAME${NC}"
    fi
    
    # Set public access for images
    echo "Setting public access for bucket..."
    gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME
    
    # Set CORS policy
    echo "Setting CORS policy..."
    cat > cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF
    
    gsutil cors set cors.json gs://$BUCKET_NAME
    rm cors.json
    
    echo -e "${GREEN}✅ Bucket configured with public access and CORS${NC}"
}

# Generate GitHub secrets
generate_github_secrets() {
    echo "📋 Generating GitHub Secrets..."
    
    SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
    BUCKET_NAME="${PROJECT_ID}-outfit-images"
    KEY_FILE="service-account-key.json"
    
    echo ""
    echo -e "${BLUE}=== GITHUB REPOSITORY SECRETS ===${NC}"
    echo ""
    echo -e "${YELLOW}Add these secrets to your GitHub repository:${NC}"
    echo -e "${YELLOW}Settings → Secrets and variables → Actions → New repository secret${NC}"
    echo ""
    
    echo -e "${GREEN}Secret Name: GCP_PROJECT_ID${NC}"
    echo -e "Value: ${PROJECT_ID}"
    echo ""
    
    echo -e "${GREEN}Secret Name: GCP_BUCKET_NAME${NC}"
    echo -e "Value: ${BUCKET_NAME}"
    echo ""
    
    echo -e "${GREEN}Secret Name: GCP_SERVICE_ACCOUNT_KEY${NC}"
    echo "Value (copy the entire JSON content):"
    echo -e "${BLUE}---START JSON---${NC}"
    cat $KEY_FILE
    echo ""
    echo -e "${BLUE}---END JSON---${NC}"
    echo ""
    
    # Create a secrets file for reference
    cat > github-secrets.txt << EOF
GitHub Repository Secrets for Outfit Voting App
===============================================

GCP_PROJECT_ID: $PROJECT_ID
GCP_BUCKET_NAME: $BUCKET_NAME

GCP_SERVICE_ACCOUNT_KEY:
$(cat $KEY_FILE)
EOF
    
    echo -e "${GREEN}✅ Secrets saved to github-secrets.txt${NC}"
}

# Update cloud-storage.js with project ID
update_frontend_config() {
    echo "🔧 Updating frontend configuration..."
    
    if [ -f "js/cloud-storage.js" ]; then
        # Update the project ID in the cloud-storage.js file
        sed -i.bak "s/your-outfit-voting-project/$PROJECT_ID/g" js/cloud-storage.js
        echo -e "${GREEN}✅ Updated js/cloud-storage.js with project ID${NC}"
    else
        echo -e "${YELLOW}⚠️ js/cloud-storage.js not found, skipping frontend update${NC}"
    fi
}

# Test deployment
test_deployment() {
    echo "🧪 Testing deployment..."
    
    if [ -f "backend/package.json" ]; then
        cd backend
        
        # Install dependencies
        echo "Installing backend dependencies..."
        npm install
        
        # Test syntax
        echo "Testing backend syntax..."
        node -c index.js
        
        cd ..
        echo -e "${GREEN}✅ Backend tests passed${NC}"
    else
        echo -e "${YELLOW}⚠️ Backend not found, skipping tests${NC}"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Outfit Voting App - Service Account Setup${NC}"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    get_project_id
    enable_apis
    create_service_account
    assign_roles
    create_service_account_key
    create_storage_bucket
    update_frontend_config
    test_deployment
    generate_github_secrets
    
    echo ""
    echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Copy the secrets from above to your GitHub repository"
    echo "2. Push your code to GitHub to trigger the deployment"
    echo "3. Check GitHub Actions for deployment status"
    echo ""
    echo -e "${YELLOW}Files created:${NC}"
    echo "- service-account-key.json (keep secure!)"
    echo "- github-secrets.txt (for reference)"
    echo ""
    echo -e "${RED}⚠️ SECURITY NOTE:${NC}"
    echo -e "${RED}Keep service-account-key.json secure and don't commit it to git!${NC}"
    echo -e "${RED}Add it to .gitignore if not already done.${NC}"
}

# Run main function
main "$@"
