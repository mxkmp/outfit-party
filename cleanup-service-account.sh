#!/bin/bash

# Clean up script for Service Account
set -e

echo "🧹 Service Account Cleanup"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
SERVICE_ACCOUNT_NAME="outfit-voting-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No project set in gcloud config${NC}"
    exit 1
fi

echo -e "${YELLOW}This will remove:${NC}"
echo "- Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "- All associated IAM bindings"
echo "- Local key files"
echo ""

read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Remove IAM bindings first
echo "🔑 Removing IAM bindings..."
ROLES=(
    "roles/cloudfunctions.admin"
    "roles/storage.admin"
    "roles/iam.serviceAccountUser"
    "roles/cloudbuild.builds.editor"
    "roles/logging.viewer"
)

for role in "${ROLES[@]}"; do
    echo "Removing role: $role"
    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --quiet 2>/dev/null || echo "Role $role not found or already removed"
done

# Delete service account keys
echo "🗝️ Deleting service account keys..."
KEY_IDS=$(gcloud iam service-accounts keys list --iam-account=$SERVICE_ACCOUNT_EMAIL --format="value(name)" 2>/dev/null | grep -v "projects/.*/serviceAccounts/.*/keys/.*")
for key_id in $KEY_IDS; do
    if [[ $key_id != *"/keys/"* ]]; then
        continue
    fi
    echo "Deleting key: $key_id"
    gcloud iam service-accounts keys delete "$key_id" --iam-account=$SERVICE_ACCOUNT_EMAIL --quiet 2>/dev/null || true
done

# Delete service account
echo "🔧 Deleting service account..."
gcloud iam service-accounts delete $SERVICE_ACCOUNT_EMAIL --quiet 2>/dev/null || echo "Service account not found or already deleted"

# Remove local files
echo "📄 Removing local files..."
rm -f service-account-key.json
rm -f github-secrets.txt
rm -f cors.json

echo -e "${GREEN}✅ Cleanup completed${NC}"
echo ""
echo "To start fresh, run:"
echo "./setup-service-account.sh"
