# How to Delete an External Client App / Connected App in Salesforce

## Quick Steps

1. **Navigate to App Manager**:
   - Go to **Setup** (gear icon → Setup)
   - In Quick Find, search for **"App Manager"**
   - Click on **App Manager**

2. **Find the App**:
   - Locate the External Client App / Connected App you want to delete
   - Click the **dropdown arrow (▼)** next to the app name
   - Select **"View"** (or click directly on the app name)

3. **Delete the App**:
   - On the app detail page, click the **"Delete"** button
   - Confirm the deletion in the popup dialog

## Important Considerations

### Before Deleting:

1. **Check Dependencies**:
   - Ensure the app is not set as the default app for any user profiles
   - Check if any integrations are currently using this app
   - Verify no Salesforce packages depend on this app

2. **Backup Information** (if needed):
   - Copy the **Consumer Key** and **Consumer Secret** if you might need to recreate it
   - Note the OAuth scopes that were configured

### Common Issues:

#### "Cannot delete - App is referenced by another component"
- **Solution**: 
  - Go to **Setup → Users → Profiles** (or Permission Sets)
  - Check each profile/permission set for "Default Connected App"
  - Change any references to this app to a different app
  - Retry deletion

#### "Cannot delete - App is managed by a package"
- **Solution**: 
  - If the app is managed, you cannot delete it directly
  - You would need to uninstall the package that created it

#### Permission Errors
- **Solution**: 
  - Ensure you have **"Manage Connected Apps"** permission
  - System Administrator profile typically has this permission
  - Contact your org administrator if needed

## Alternative: Deactivate Instead of Delete

If you want to keep the app definition but stop it from being used:

1. Go to the app detail page (as above)
2. Click **"Edit"**
3. Uncheck **"Enable OAuth Settings"** (or **"Enable OAuth"** for External Client Apps)
4. Click **"Save"**

This disables the app without deleting it, allowing you to reactivate it later if needed.

## After Deletion

If you deleted the app and need to recreate it:
- You'll need to create a new External Client App / Connected App
- The new app will have a different Consumer Key and Consumer Secret
- Update your `.env` file with the new credentials
- Update any integrations that were using the old app

