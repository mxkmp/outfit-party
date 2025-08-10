#!/bin/bash

# Deployment script for Google Cloud Function
set -e

export PROJECT_ID="personal-468620"
export BUCKET_NAME="${PROJECT_ID}-outfit-images"

echo "🚀 Deploying Outfit Voting Backend to Google Cloud..."

# Check if required environment variables are set
if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: PROJECT_ID environment variable is not set"
    echo "Run: export PROJECT_ID=your-project-id"
    exit 1
fi

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Error: BUCKET_NAME environment variable is not set"
    echo "Run: export BUCKET_NAME=your-bucket-name"
    exit 1
fi

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy Cloud Function
echo "☁️ Deploying Cloud Function..."
gcloud functions deploy outfit-voting \
    --runtime nodejs22 \
    --trigger-http \
    --allow-unauthenticated \
    --memory 256MB \
    --timeout 30s \
    --region europe-west3 \
    --set-env-vars BUCKET_NAME=$BUCKET_NAME \
    --project $PROJECT_ID

# Get function URL
FUNCTION_URL=$(gcloud functions describe outfit-voting --region=europe-west3 --project=$PROJECT_ID --format="value(httpsTrigger.url)")

echo ""
echo "✅ Deployment successful!"
echo "📡 Function URL: $FUNCTION_URL"
echo ""
echo "🔗 Next steps:"
echo "1. Update the backend URL in js/cloud-storage.js"
echo "2. Test the backend: curl $FUNCTION_URL/api/health"
echo "3. Deploy frontend to GitHub Pages"

# Test the deployment
echo ""
echo "🧪 Testing deployment..."
curl -s "$FUNCTION_URL/api/health" | grep -q "success" && echo "✅ Health check passed" || echo "❌ Health check failed"
