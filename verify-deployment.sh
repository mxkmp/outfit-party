#!/bin/bash

# CI/CD Deployment Verification Script
# This script checks if the repository is properly configured for automated deployment

set -e

echo "🔍 Checking CI/CD deployment configuration..."
echo ""

# Check if workflow file exists
if [ -f ".github/workflows/deploy.yml" ]; then
    echo "✅ GitHub Actions workflow file found"
else
    echo "❌ GitHub Actions workflow file missing"
    exit 1
fi

# Check if backend exists
if [ -d "backend" ] && [ -f "backend/package.json" ] && [ -f "backend/index.js" ]; then
    echo "✅ Backend files found"
else
    echo "❌ Backend files missing"
    exit 1
fi

# Check backend syntax
echo "🔍 Checking backend syntax..."
cd backend
if node -c index.js > /dev/null 2>&1; then
    echo "✅ Backend syntax is valid"
else
    echo "❌ Backend syntax errors found"
    exit 1
fi
cd ..

# Check HTML structure
if grep -q "DOCTYPE html" index.html; then
    echo "✅ HTML structure is valid"
else
    echo "❌ HTML DOCTYPE not found"
    exit 1
fi

# Check JavaScript files
echo "🔍 Checking JavaScript syntax..."
for js_file in js/*.js; do
    if [ -f "$js_file" ]; then
        if node -c "$js_file" > /dev/null 2>&1; then
            echo "✅ $(basename $js_file) syntax OK"
        else
            echo "❌ $(basename $js_file) has syntax errors"
            exit 1
        fi
    fi
done

# Check YAML syntax
if command -v python3 &> /dev/null; then
    if python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" > /dev/null 2>&1; then
        echo "✅ Workflow YAML syntax is valid"
    else
        echo "❌ Workflow YAML syntax errors found"
        exit 1
    fi
else
    echo "⚠️ Python3 not found, skipping YAML validation"
fi

echo ""
echo "🎉 All checks passed! Repository is ready for CI/CD deployment."
echo ""
echo "📝 To enable deployment, configure these GitHub Secrets:"
echo "   - GCP_PROJECT_ID"
echo "   - GCP_SERVICE_ACCOUNT_KEY" 
echo "   - GCP_BUCKET_NAME"
echo ""
echo "📚 See README.md for detailed setup instructions."