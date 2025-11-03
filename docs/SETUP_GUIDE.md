# Setup Guide

Complete setup instructions for the Forms-Aware Agent project.

## Prerequisites Installation

### 1. Node.js and npm
```bash
# Check if installed
node --version  # Should be v16 or higher
npm --version

# If not installed, download from nodejs.org
```

### 2. Salesforce CLI (sfdx)
```bash
# Install Salesforce CLI
npm install -g @salesforce/cli

# Verify installation
sfdx --version

# Authenticate with Salesforce
sfdx auth:web:login
```

### 3. Heroku CLI (Optional, for manual deployment)
```bash
# Install Heroku CLI
# macOS
brew tap heroku/brew && brew install heroku

# Verify installation
heroku --version

# Login
heroku login
```

### 4. Git
```bash
# Verify Git is installed
git --version
```

## Initial Project Setup

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install
cd ..

# Install broker dependencies
cd broker
npm install
cd ..
```

### Step 2: Configure Environment Variables

#### Broker Configuration

```bash
cd broker
cp .env.example .env
```

Edit `broker/.env` with your Salesforce credentials:
```
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_USERNAME=your_username@example.com
SALESFORCE_SECURITY_TOKEN=your_security_token
SALESFORCE_LOGIN_URL=https://login.salesforce.com
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**How to get Salesforce credentials:**
1. In Salesforce Setup, go to **App Manager** → **New Connected App**
2. Enable OAuth Settings
3. Set Callback URL: `http://localhost:3001/oauth/callback`
4. Select OAuth Scopes: `Full access (full)`, `Perform requests on your behalf at any time (refresh_token, offline_access)`
5. Save and note the Consumer Key (Client ID) and Consumer Secret
6. In your Salesforce user settings, get your Security Token

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```
REACT_APP_BROKER_API_URL=http://localhost:3001
```

### Step 3: Deploy to Salesforce

```bash
cd salesforce

# Create a scratch org (optional, for development)
sfdx force:org:create -s -f config/project-scratch-def.json -a context-broker-dev

# Or authenticate with existing org
sfdx auth:web:login -a my-org

# Deploy to org
sfdx force:source:deploy -p force-app/main/default -u my-org

# Or use the deployment script
cd ..
./scripts/deploy-salesforce.sh my-org
```

### Step 4: Create Connected App in Salesforce

1. In Salesforce Setup → **App Manager** → **New Connected App**
2. Fill in:
   - **Connected App Name**: Context Broker API
   - **API Name**: Context_Broker_API
   - **Contact Email**: your-email@example.com
3. Enable OAuth Settings:
   - **Callback URL**: `http://localhost:3001/oauth/callback` (for local dev)
   - Add production callback URL later for Heroku
   - **Selected OAuth Scopes**: 
     - Full access (full)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
4. Save
5. Note the Consumer Key (use as SALESFORCE_CLIENT_ID)
6. Click "Manage Consumer Details" to reveal Consumer Secret (use as SALESFORCE_CLIENT_SECRET)

## Running Locally

### Start Broker (Terminal 1)
```bash
cd broker
npm run dev
# Server runs on http://localhost:3001
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

### Test the System

1. **Health Check**: Visit `http://localhost:3001/api/health`
2. **Load Form**: In frontend, enter a form ID (you'll need to create a Form_Definition__c record first in Salesforce)
3. **Submit Form**: Fill out and submit the form

## Deployment

### Deploy Broker to Heroku

1. **Create Heroku App**:
```bash
cd broker
heroku create your-app-name
heroku config:set SALESFORCE_CLIENT_ID=your_client_id
heroku config:set SALESFORCE_CLIENT_SECRET=your_client_secret
heroku config:set SALESFORCE_USERNAME=your_username
heroku config:set SALESFORCE_SECURITY_TOKEN=your_token
heroku config:set SALESFORCE_LOGIN_URL=https://login.salesforce.com
heroku config:set FRONTEND_URL=https://your-username.github.io
```

2. **Update Connected App Callback URL**:
   - Add production callback: `https://your-app-name.herokuapp.com/oauth/callback`

3. **Deploy**:
```bash
# From repo root
./scripts/deploy-heroku.sh
```

### Deploy Frontend to GitHub Pages

1. **Update frontend package.json homepage**:
   ```json
   "homepage": "https://your-username.github.io/context-broker"
   ```

2. **Update frontend/.env.production**:
   ```
   REACT_APP_BROKER_API_URL=https://your-app-name.herokuapp.com
   ```

3. **Deploy**:
```bash
# From repo root
./scripts/deploy-github.sh
```

4. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages`
   - Save

## Creating a Test Form

1. In Salesforce, navigate to **Form Definition** tab
2. Click **New**
3. Fill in:
   - **Name**: Test Contact Form
   - **Form ID**: `test-contact-form`
   - **Active**: ✅
   - **Fields JSON**:
     ```json
     [
       {"name":"firstName","label":"First Name","type":"text","required":true},
       {"name":"lastName","label":"Last Name","type":"text","required":true},
       {"name":"email","label":"Email","type":"email","required":true},
       {"name":"phone","label":"Phone","type":"text","required":false}
     ]
     ```
   - **Mapping Rules**:
     ```json
     {
       "salesforceObject":"Contact",
       "fieldMappings":{
         "firstName":"FirstName",
         "lastName":"LastName",
         "email":"Email",
         "phone":"Phone"
       }
     }
     ```
4. Save
5. Test in frontend by entering Form ID: `test-contact-form`

## Troubleshooting

### Broker won't connect to Salesforce
- Verify environment variables are set correctly
- Check Salesforce credentials
- Ensure Connected App is active
- Verify security token is correct (reset if needed)

### Frontend can't reach broker
- Check CORS settings in broker
- Verify `REACT_APP_BROKER_API_URL` is correct
- Check broker is running

### Salesforce deployment fails
- Authenticate with `sfdx auth:web:login`
- Check your org has API access enabled
- Verify metadata syntax is correct

### Heroku deployment fails
- Check Procfile exists in broker/
- Verify all environment variables are set
- Check build logs: `heroku logs --tail -a your-app-name`






