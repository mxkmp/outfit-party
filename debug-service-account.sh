#!/bin/bash

# Debug script for Service Account issues
set -e

echo "🔍 Service Account Troubleshooting"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
SERVICE_ACCOUNT_NAME="outfit-voting-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project set in gcloud config${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${BLUE}Project ID: $PROJECT_ID${NC}"
echo -e "${BLUE}Service Account: $SERVICE_ACCOUNT_EMAIL${NC}"
echo ""

# Check authentication
echo "🔐 Checking authentication..."
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
if [ -z "$ACTIVE_ACCOUNT" ]; then
    echo -e "${RED}❌ Not authenticated with gcloud${NC}"
    echo "Run: gcloud auth login"
    exit 1
else
    echo -e "${GREEN}✅ Authenticated as: $ACTIVE_ACCOUNT${NC}"
fi

# Check project permissions
echo ""
echo "🔑 Checking project permissions..."
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✅ Can access project${NC}"
else
    echo -e "${RED}❌ Cannot access project or project doesn't exist${NC}"
    echo "Available projects:"
    gcloud projects list --format="table(projectId,name,projectNumber)"
    exit 1
fi

# Check APIs
echo ""
echo "🔌 Checking required APIs..."
REQUIRED_APIS=(
    "cloudfunctions.googleapis.com"
    "storage.googleapis.com"
    "cloudbuild.googleapis.com"
    "iam.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
        echo -e "${GREEN}✅ $api enabled${NC}"
    else
        echo -e "${RED}❌ $api not enabled${NC}"
        echo "Enable with: gcloud services enable $api"
    fi
done

# Check service account
echo ""
echo "🔧 Checking service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✅ Service account exists${NC}"
    
    # Show service account details
    echo "Service account details:"
    gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID --format="table(email,displayName,disabled)"
    
    # Check IAM bindings
    echo ""
    echo "🔑 Checking IAM bindings..."
    echo "Current bindings for service account:"
    gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:$SERVICE_ACCOUNT_EMAIL"
    
else
    echo -e "${RED}❌ Service account does not exist${NC}"
    echo "Create with: gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME --project=$PROJECT_ID"
fi

# Check service account keys
echo ""
echo "🗝️ Checking service account keys..."
KEY_COUNT=$(gcloud iam service-accounts keys list --iam-account=$SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID --format="value(name)" 2>/dev/null | wc -l)
if [ "$KEY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Service account has $KEY_COUNT key(s)${NC}"
    gcloud iam service-accounts keys list --iam-account=$SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID --format="table(name,keyType,validAfterTime,validBeforeTime)"
else
    echo -e "${YELLOW}⚠️ No keys found for service account${NC}"
fi

# Check local key file
echo ""
echo "📄 Checking local key file..."
if [ -f "service-account-key.json" ]; then
    echo -e "${GREEN}✅ Local key file exists${NC}"
    
    # Validate JSON
    if jq empty service-account-key.json 2>/dev/null; then
        echo -e "${GREEN}✅ Key file is valid JSON${NC}"
        
        # Check key content
        KEY_EMAIL=$(jq -r '.client_email' service-account-key.json 2>/dev/null)
        KEY_PROJECT=$(jq -r '.project_id' service-account-key.json 2>/dev/null)
        
        if [ "$KEY_EMAIL" = "$SERVICE_ACCOUNT_EMAIL" ]; then
            echo -e "${GREEN}✅ Key email matches expected service account${NC}"
        else
            echo -e "${RED}❌ Key email mismatch. Expected: $SERVICE_ACCOUNT_EMAIL, Got: $KEY_EMAIL${NC}"
        fi
        
        if [ "$KEY_PROJECT" = "$PROJECT_ID" ]; then
            echo -e "${GREEN}✅ Key project matches current project${NC}"
        else
            echo -e "${RED}❌ Key project mismatch. Expected: $PROJECT_ID, Got: $KEY_PROJECT${NC}"
        fi
        
    else
        echo -e "${RED}❌ Key file is not valid JSON${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ No local key file found${NC}"
fi

# Test Cloud Storage
echo ""
echo "🪣 Checking Cloud Storage..."
BUCKET_NAME="${PROJECT_ID}-outfit-images"
if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
    echo -e "${GREEN}✅ Bucket exists: $BUCKET_NAME${NC}"
    
    # Check bucket permissions
    echo "Bucket IAM policy:"
    gsutil iam get gs://$BUCKET_NAME | jq '.bindings[] | select(.members[] | contains("allUsers"))'
    
else
    echo -e "${YELLOW}⚠️ Bucket does not exist: $BUCKET_NAME${NC}"
    echo "Create with: gsutil mb -p $PROJECT_ID -c STANDARD -l europe-west3 gs://$BUCKET_NAME"
fi

echo ""
echo "🔧 Recommended fixes:"
echo "===================="

# Provide specific recommendations
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo "1. Create service account:"
    echo "   gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME --project=$PROJECT_ID"
fi

if [ "$KEY_COUNT" -eq 0 ]; then
    echo "2. Create service account key:"
    echo "   gcloud iam service-accounts keys create service-account-key.json --iam-account=$SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID"
fi

echo "3. Re-run the setup script:"
echo "   ./setup-service-account.sh"

echo ""
echo -e "${BLUE}💡 For more detailed logs, run commands with --verbosity=debug${NC}"
