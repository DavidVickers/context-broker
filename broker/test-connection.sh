#!/bin/bash

# Quick test script for Salesforce connection

echo "🔍 Testing Salesforce Connection..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Please create .env file from .env.example"
    exit 1
fi

# Check if required env vars are set
source .env 2>/dev/null || true

if [ -z "$SALESFORCE_CLIENT_ID" ]; then
    echo "❌ SALESFORCE_CLIENT_ID not set in .env"
    exit 1
fi

if [ -z "$SALESFORCE_USERNAME" ]; then
    echo "❌ SALESFORCE_USERNAME not set in .env"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Test health endpoint
echo "📡 Testing broker health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health 2>/dev/null)

if [ -z "$HEALTH_RESPONSE" ]; then
    echo "❌ Broker not running on http://localhost:3001"
    echo "   Start it with: npm run dev"
    exit 1
fi

echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# Check Salesforce status
SALESFORCE_STATUS=$(echo "$HEALTH_RESPONSE" | grep -o '"salesforce":"[^"]*"' | cut -d'"' -f4)

if [ "$SALESFORCE_STATUS" = "connected" ]; then
    echo "✅ Salesforce connection: CONNECTED"
else
    echo "❌ Salesforce connection: DISCONNECTED"
    echo "   Check broker console for error messages"
fi

