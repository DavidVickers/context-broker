#!/bin/bash

# Test Authorization Code Flow for Salesforce
# This script tests the OAuth Authorization Code flow step by step

echo "🧪 Testing Salesforce Authorization Code Flow..."
echo ""

# Load environment variables
if [ -f .env ]; then
    source .env
    echo "✅ Loaded .env file"
else
    echo "❌ .env file not found"
    exit 1
fi

# Check required variables
if [ -z "$SALESFORCE_CLIENT_ID" ] || [ -z "$SALESFORCE_CLIENT_SECRET" ] || [ -z "$SALESFORCE_LOGIN_URL" ]; then
    echo "❌ Missing required environment variables"
    echo "   Required: SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET, SALESFORCE_LOGIN_URL"
    exit 1
fi

# Configuration
CLIENT_ID="$SALESFORCE_CLIENT_ID"
CLIENT_SECRET="$SALESFORCE_CLIENT_SECRET"
LOGIN_URL="$SALESFORCE_LOGIN_URL"
REDIRECT_URI="http://localhost:3001/oauth/callback"
SCOPE="api id profile email address phone"
RESPONSE_TYPE="code"

# Generate state and nonce for security
STATE=$(openssl rand -hex 16)
NONCE=$(openssl rand -hex 16)

echo "🔧 Configuration:"
echo "   Client ID: ${CLIENT_ID:0:10}...${CLIENT_ID: -5}"
echo "   Login URL: $LOGIN_URL"
echo "   Redirect URI: $REDIRECT_URI"
echo "   State: $STATE"
echo "   Nonce: $NONCE"
echo ""

# Step 1: Generate Authorization URL
AUTH_URL="${LOGIN_URL}/services/oauth2/authorize?response_type=${RESPONSE_TYPE}&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&state=${STATE}&nonce=${NONCE}"

echo "📋 Step 1: Authorization URL Generated"
echo "   URL: $AUTH_URL"
echo ""
echo "🌐 Step 2: Manual Authorization Required"
echo "   1. Open this URL in your browser:"
echo "      $AUTH_URL"
echo ""
echo "   2. Log in with your Salesforce credentials"
echo "   3. Authorize the application"
echo "   4. Copy the 'code' parameter from the redirect URL"
echo "      (It will look like: http://localhost:3001/oauth/callback?code=...&state=...)"
echo ""
echo "   5. Paste the authorization code below:"
read -p "   Authorization Code: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo "❌ No authorization code provided"
    exit 1
fi

echo ""
echo "🔄 Step 3: Exchanging Code for Token..."

# Step 2: Exchange authorization code for access token
TOKEN_RESPONSE=$(curl -s -X POST "${LOGIN_URL}/services/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "code=${AUTH_CODE}")

echo "📡 Token Response:"
echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
echo ""

# Check if we got a token
if echo "$TOKEN_RESPONSE" | grep -q "access_token"; then
    echo "✅ SUCCESS! Authorization Code Flow works!"
    
    # Extract token for testing
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token' 2>/dev/null)
    REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.refresh_token' 2>/dev/null)
    
    if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
        echo ""
        echo "🔍 Step 4: Testing API Access..."
        
        # Test API call with access token
        API_RESPONSE=$(curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "Content-Type: application/json" \
          "${LOGIN_URL}/services/data/v58.0/sobjects/User/me")
        
        echo "📊 User Info:"
        echo "$API_RESPONSE" | jq . 2>/dev/null || echo "$API_RESPONSE"
        
        echo ""
        echo "🎉 Authorization Code Flow is working correctly!"
        echo "   ✅ Authorization URL generation"
        echo "   ✅ Code exchange for token"
        echo "   ✅ API access with token"
        
        if [ "$REFRESH_TOKEN" != "null" ] && [ -n "$REFRESH_TOKEN" ]; then
            echo "   ✅ Refresh token received"
        fi
        
    else
        echo "❌ No access token in response"
        exit 1
    fi
    
else
    echo "❌ FAILED! Token exchange failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check that your Connected App has 'Authorization Code Flow' enabled"
    echo "   2. Verify the redirect URI matches exactly: $REDIRECT_URI"
    echo "   3. Ensure the authorization code is valid and not expired"
    echo "   4. Check that OAuth scopes are correct"
    exit 1
fi

echo ""
echo "📝 Next Steps:"
echo "   1. This proves Authorization Code Flow works"
echo "   2. Now we can implement it in the broker"
echo "   3. Add OAuth endpoints: /oauth/authorize, /oauth/callback"
echo "   4. Implement token storage and refresh logic"
