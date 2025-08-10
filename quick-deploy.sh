#!/bin/bash

# Quick deployment script for Outfit Voting App
echo "🚀 Quick Deploy - Outfit Voting App"
echo "==================================="

# Check if setup script exists
if [ ! -f "setup-service-account.sh" ]; then
    echo "❌ setup-service-account.sh not found!"
    exit 1
fi

# Check if user is authenticated with gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Authenticating with Google Cloud..."
    gcloud auth login
fi

# Run the full setup
echo "🔧 Running service account setup..."
./setup-service-account.sh

echo ""
echo "📋 NEXT STEPS:"
echo "=============="
echo "1. Go to your GitHub repository"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Add the three secrets shown above"
echo "4. Push your code to trigger deployment"
echo ""
echo "GitHub Repository URL structure:"
echo "https://github.com/[your-username]/[repository-name]/settings/secrets/actions"
echo ""
echo "After adding secrets, your app will be available at:"
echo "https://[your-username].github.io/[repository-name]"
