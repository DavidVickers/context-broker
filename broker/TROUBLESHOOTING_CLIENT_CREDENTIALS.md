# Troubleshooting: Client Credentials Timeout Error

## Error: "Your verification attempt has timed out. Try again."

This error typically occurs when trying to view **Consumer Key** and **Consumer Secret** (Client Credentials) in External Client App settings.

## Quick Fixes (Try in Order)

### 1. **Refresh and Try Again**
- Refresh the Salesforce page (F5 or Cmd+R)
- Navigate back to **App Manager → Your App → Manage Consumer Details**
- Try clicking "Click to reveal" again

### 2. **Clear Browser Cache & Cookies**
- Clear your browser cache and Salesforce cookies
- Or use **Incognito/Private Mode** and log in again
- Retry accessing Client Credentials

### 3. **Check Your Session**
- Your Salesforce session may have expired
- **Sign out** and **sign back in** to Salesforce
- Navigate back to the External Client App

### 4. **Try a Different Browser**
- Switch to a different browser (Chrome, Firefox, Safari, Edge)
- Some browsers have extensions that can interfere with Salesforce UI
- Clear cache in the new browser before trying

### 5. **Disable Browser Extensions**
- Temporarily disable browser extensions (especially ad blockers, password managers)
- Extensions can interfere with Salesforce's JavaScript and API calls
- Retry after disabling

### 6. **Check Network Stability**
- Ensure you have a stable internet connection
- If on a VPN, try disconnecting temporarily
- If on corporate network, there may be firewall/proxy issues

## Alternative: Access via Different Path

### Method 1: Direct URL
1. Note your External Client App's **API Name** (e.g., `Context_Broker_API`)
2. Go directly to: `https://your-instance.salesforce.com/lightning/setup/ConnectedApplication/page?address=%2Fsetup%2Fui%2FviewConnectedAppDetail.apexp%3Fid%3D[APP_ID]`
3. Replace `[APP_ID]` with your app's33-character ID

### Method 2: Via Connected Apps (Legacy)
1. Go to **Setup → App Manager**
2. Look for **"Connected Apps"** in the left sidebar (may still be available)
3. Find your app there and try accessing credentials

### Method 3: API/CLI Access
If the UI continues to fail, you can retrieve credentials via:
- **Salesforce CLI**: `sfdx force:org:display` (shows org info)
- **Metadata API**: Export the Connected App metadata

## If All Else Fails

### Regenerate Credentials
If you cannot access the credentials:

1. **Delete the App** and **create a new one**:
   - Setup → App Manager → Your App → Delete
   - Create a new External Client App with the same name
   - Get new Consumer Key and Secret immediately
   - Update your `.env` file

2. **Contact Salesforce Support**:
   - This could be a known issue with your org
   - Salesforce Support can help diagnose session/timeout issues

## Prevention

- **Get credentials immediately** after creating the app
- **Save credentials** to your `.env` file right away
- **Backup credentials** in a secure location (password manager)
- Note: You can only view the Consumer Secret **once** - after that you'll need to regenerate it

## Related Issues

If you're also experiencing:
- General Salesforce timeout errors: Check **Setup → Security → Session Settings**
- Multi-Factor Authentication issues: Verify your authenticator app is synced
- Permission errors: Ensure you have "Manage Connected Apps" permission

