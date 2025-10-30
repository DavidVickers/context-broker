#!/bin/bash

# Deploy broker directory to Heroku
# Usage: ./scripts/deploy-heroku.sh

set -e

echo "🚀 Deploying broker to Heroku..."

# Navigate to repo root
cd "$(dirname "$0")/.."

# Check if Heroku remote exists
if ! git remote | grep -q heroku; then
    echo "❌ Heroku remote not found. Please add it first:"
    echo "   git remote add heroku https://git.heroku.com/your-app-name.git"
    exit 1
fi

# Deploy broker subdirectory to Heroku
git subtree push --prefix=broker heroku main || {
    echo "❌ Deployment failed. Trying force push..."
    git push heroku `git subtree split --prefix=broker main`:main --force
}

echo "✅ Deployment complete!"


