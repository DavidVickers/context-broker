#!/bin/bash

# Deploy frontend to GitHub Pages
# Usage: ./scripts/deploy-github.sh

set -e

echo "🌐 Deploying frontend to GitHub Pages..."

# Navigate to repo root
cd "$(dirname "$0")/.."

cd frontend

# Check if gh-pages package is installed
if ! npm list -g gh-pages &> /dev/null && ! npm list gh-pages &> /dev/null; then
    echo "Installing gh-pages..."
    npm install --save-dev gh-pages
fi

# Build the frontend
echo "Building frontend..."
npm run build

# Deploy to gh-pages branch
echo "Deploying to GitHub Pages..."
npx gh-pages -d build -t true

echo "✅ Deployment complete!"


