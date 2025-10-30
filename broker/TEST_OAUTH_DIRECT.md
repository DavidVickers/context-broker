# Test OAuth Authentication Directly

Since your broker isn't showing login attempts, let's verify the OAuth configuration is working by testing the token endpoint directly.

## Manual OAuth Token Request

You can test if your Connected App accepts username/password authentication by making a direct HTTP request:

### Using curl:

```bash
curl -X POST https://test.salesforce.com/services/oauth2/token \
  -d "grant_type=password" \
  -d "client_id=YOUR_CONSUMER_KEY" \
  -d "client_secret=YOUR_CONSUMER_SECRET" \
  -d "username=david@customer_simulation25.org.staging" \
  -d "password=YOUR_PASSWORD+YOUR_SECURITY_TOKEN"
```

Replace:
- `YOUR_CONSUMER_KEY` with your `SALESFORCE_CLIENT_ID`
- `YOUR_CONSUMER_SECRET` with your `SALESFORCE_CLIENT_SECRET`
- `YOUR_PASSWORD+YOUR_SECURITY_TOKEN` with password and token concatenated (no space)

### Expected Response (Success):

```json
{
  "access_token": "00D...",
  "instance_url": "https://your-instance.salesforce.com",
  "id": "https://login.salesforce.com/id/.../...",
  "token_type": "Bearer",
  "issued_at": "...",
  "signature": "..."
}
```

### Expected Response (Error):

```json
{
  "error": "invalid_grant",
  "error_description": "authentication failure"
}
```

## What This Tells Us

1. **If curl works but jsforce doesn't**: There's an issue with how jsforce is making the request
2. **If curl also fails**: The Connected App configuration still has an issue
3. **If curl succeeds**: Your credentials are correct, and we need to adjust the jsforce code

## Common Issues

### If you get "invalid_client":
- Consumer Key or Secret is wrong
- Check they match exactly in `.env` and Connected App

### If you get "invalid_grant":
- Username/password combination is wrong
- Security token might be incorrect
- OR the Connected App doesn't allow password grant type

## Next Steps After Testing

1. Try the curl command above
2. Share the response (success or error)
3. This will help us determine if it's a Connected App issue or jsforce configuration issue

