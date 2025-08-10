#!/bin/bash
# Quick setup script for cloud testing (example only)

set -e

echo "🌩️  Setting up cloud testing environment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install Google Cloud SDK first."
    echo "   Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 > /dev/null; then
    echo "❌ No active gcloud authentication found."
    echo "   Run: gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No active project set."
    echo "   Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Using project: $PROJECT_ID"

# Prompt for bucket name
read -p "📁 Enter bucket name for testing (e.g., outfit-voting-test): " BUCKET_NAME
if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Bucket name is required"
    exit 1
fi

echo "🪣 Creating bucket: $BUCKET_NAME"

# Create bucket (ignore error if it exists)
gsutil mb "gs://$BUCKET_NAME" 2>/dev/null || echo "   Bucket may already exist"

# Make bucket publicly readable
echo "🔓 Setting bucket permissions..."
gsutil iam ch allUsers:objectViewer "gs://$BUCKET_NAME" || echo "   Permission may already be set"

# Create service account
SERVICE_ACCOUNT="outfit-voting-test"
echo "👤 Creating service account: $SERVICE_ACCOUNT"

gcloud iam service-accounts create "$SERVICE_ACCOUNT" \
    --display-name="Outfit Voting Test Account" 2>/dev/null || echo "   Service account may already exist"

# Add storage permissions
echo "🔑 Adding storage permissions..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin" || echo "   Permission may already be set"

# Create service account key
KEY_FILE="./service-account-key.json"
echo "🗝️  Creating service account key: $KEY_FILE"

gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" || echo "   Key creation failed, may already exist"

# Create environment file
ENV_FILE="./.env.cloud"
echo "📝 Creating environment file: $ENV_FILE"

cat > "$ENV_FILE" << EOF
# Cloud testing environment
BUCKET_NAME=$BUCKET_NAME
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
USE_REAL_GCS=true
EOF

echo "✅ Setup complete!"
echo ""
echo "🧪 To run cloud tests:"
echo "   source $ENV_FILE && npm run test:cloud"
echo ""
echo "🧹 To cleanup later:"
echo "   gsutil rb gs://$BUCKET_NAME"
echo "   gcloud iam service-accounts delete $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo ""
echo "⚠️  Remember to add $KEY_FILE and $ENV_FILE to .gitignore!"