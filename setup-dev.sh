#!/bin/bash

# Local development setup script
set -e

echo "🛠️ Setting up local development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version 18 or later is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Setup backend
echo "📦 Setting up backend dependencies..."
cd backend
npm install
cd ..

# Create local environment file
if [ ! -f ".env.local" ]; then
    echo "📝 Creating local environment file..."
    cat > .env.local << EOF
# Local development environment
NODE_ENV=development
PROJECT_ID=your-project-id
BUCKET_NAME=your-bucket-name
FUNCTION_REGION=europe-west3
BACKEND_URL=http://localhost:8080
EOF
    echo "✅ Created .env.local file"
    echo "🔧 Please update the values in .env.local with your actual project settings"
else
    echo "✅ .env.local already exists"
fi

# Check if Google Cloud CLI is installed
if command -v gcloud &> /dev/null; then
    echo "✅ Google Cloud CLI found"
    echo "Current project: $(gcloud config get-value project 2>/dev/null || echo 'Not set')"
else
    echo "⚠️ Google Cloud CLI not found. Install it for deployment capabilities."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.local with your project settings"
echo "2. Run 'cd backend && npm start' to start the backend locally"
echo "3. Run 'python -m http.server 8080' in the root directory to serve frontend"
echo "4. Open http://localhost:8080 in your browser"
echo ""
echo "For deployment:"
echo "1. Follow instructions in setup-gcp.md"
echo "2. Run ./deploy-backend.sh to deploy backend"
echo "3. Push to GitHub for automatic frontend deployment"
