#!/bin/bash
source .env

echo "Testing with these values:"
echo "URL: ${SALESFORCE_LOGIN_URL}"
echo "Username: ${SALESFORCE_USERNAME}"
echo "Client ID: ${SALESFORCE_CLIENT_ID:0:10}..."
echo ""

# Test WITHOUT security token first
echo "=== Test 1: Without Security Token ==="
curl -X POST "${SALESFORCE_LOGIN_URL}/services/oauth2/token" \
  -d "grant_type=password" \
  -d "client_id=${SALESFORCE_CLIENT_ID}" \
  -d "client_secret=${SALESFORCE_CLIENT_SECRET}" \
  -d "username=${SALESFORCE_USERNAME}" \
  -d "password=${SALESFORCE_PASSWORD}"

echo -e "\n\n=== Test 2: With Security Token ==="
curl -X POST "${SALESFORCE_LOGIN_URL}/services/oauth2/token" \
  -d "grant_type=password" \
  -d "client_id=${SALESFORCE_CLIENT_ID}" \
  -d "client_secret=${SALESFORCE_CLIENT_SECRET}" \
  -d "username=${SALESFORCE_USERNAME}" \
  -d "password=${SALESFORCE_PASSWORD}${SALESFORCE_SECURITY_TOKEN}"