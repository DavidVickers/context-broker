#!/bin/bash

# Minimal OAuth test - simplest possible request
echo "🧪 Testing Minimal OAuth Configuration..."

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found"
    exit 1
fi

if [ -z "$SALESFORCE_CLIENT_ID" ]; then
    echo "❌ SALESFORCE_CLIENT_ID not found in .env"
    exit 1
fi

CLIENT_ID="$SALESFORCE_CLIENT_ID"
LOGIN_URL="$SALESFORCE_LOGIN_URL"
REDIRECT_URI="http://localhost:3001/oauth/callback"

echo "🔧 Minimal Configuration:"
echo "   Client ID: ${CLIENT_ID:0:10}...${CLIENT_ID: -5}"
echo "   Login URL: $LOGIN_URL"
echo "   Redirect URI: $REDIRECT_URI"
echo ""

# Generate minimal OAuth URL (no scope, state, or nonce)
MINIMAL_URL="${LOGIN_URL}/services/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}"

echo "📋 Minimal OAuth URL:"
echo "$MINIMAL_URL"
echo ""
echo "🌐 Test this URL in your browser:"
echo "   1. Copy the URL above"
echo "   2. Paste in browser"
echo "   3. See if you get the same error"
echo ""
echo "If this works, the issue is with scopes/state/nonce"
echo "If this fails, the issue is with basic Connected App config"
