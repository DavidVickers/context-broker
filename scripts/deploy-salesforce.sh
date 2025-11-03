#!/bin/bash

# Deploy Salesforce code to org
# Usage: ./scripts/deploy-salesforce.sh [org-alias]
# Example: ./scripts/deploy-salesforce.sh my-org

set -e

ORG_ALIAS=${1:-"default"}

echo "☁️  Deploying Salesforce code to org: $ORG_ALIAS"

# Navigate to repo root
cd "$(dirname "$0")/.."

cd salesforce

# Check if sfdx is installed
if ! command -v sfdx &> /dev/null; then
    echo "❌ Salesforce CLI (sfdx) not found. Please install it first."
    exit 1
fi

# Authenticate if not already authenticated
echo "Checking authentication..."
if ! sfdx force:org:list --json | grep -q "\"alias\":\"$ORG_ALIAS\""; then
    echo "Please authenticate first:"
    echo "  sfdx auth:web:login -a $ORG_ALIAS"
    exit 1
fi

# Deploy source to org
echo "Deploying source to Salesforce..."
sfdx force:source:deploy -p force-app/main/default -u "$ORG_ALIAS"

# Optional: Run tests
# sfdx force:source:deploy -p force-app/main/default -u "$ORG_ALIAS" -l RunSpecifiedTests -r YourTestClass

echo "✅ Deployment complete!"






