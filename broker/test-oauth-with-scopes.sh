#!/bin/bash

# Test OAuth with scopes
echo "🧪 Testing OAuth with Scopes..."

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
SCOPE="openid api refresh_token"

echo "🔧 Configuration with Scopes:"
echo "   Client ID: ${CLIENT_ID:0:10}...${CLIENT_ID: -5}"
echo "   Login URL: $LOGIN_URL"
echo "   Redirect URI: $REDIRECT_URI"
echo "   Scope: $SCOPE"
echo ""

# Generate OAuth URL with scopes
OAUTH_URL="${LOGIN_URL}/services/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}"

echo "📋 OAuth URL with Scopes:"
echo "$OAUTH_URL"
echo ""
echo "🌐 Test this URL in your browser:"
echo "   1. Copy the URL above"
echo "   2. Paste in browser"
echo "   3. Authorize the application"
echo "   4. Copy the new authorization code from the redirect"
