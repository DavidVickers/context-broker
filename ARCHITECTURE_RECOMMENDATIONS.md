# Forms-Aware Agent Architecture & Recommendations

## Project Overview

A general-purpose, scalable Forms-Aware Agent that can dynamically interact with any website/forms, built with Salesforce backend capabilities, a web interface, and a broker layer for communication.

## Architecture Components

### 1. **Salesforce Backend** (Server-side Logic)
- **Technology**: Salesforce Flows + Apex
- **Purpose**: Business logic, data processing, AI/ML integration, form validation
- **Deployment**: Salesforce CLI (sfdx)

### 2. **Web Interface** (Frontend)
- **Recommendation**: **GitHub Pages (GitHub.io)** for free hosting
- **Alternative**: Heroku (if dynamic backend needed)
- **Technology**: React/Vue.js or vanilla HTML/JS
- **Purpose**: User-facing interface to interact with forms
- **Deployment**: GitHub Actions or manual push

### 3. **Broker/API Layer** (Middleware)
- **Recommendation**: **Heroku** (free tier available, easy deployment)
- **Alternative**: AWS Lambda + API Gateway (very low cost if minimal traffic)
- **Technology**: Node.js/Express or Python/Flask
- **Purpose**: 
  - Receives form data from website
  - Communicates with Salesforce APIs
  - Handles authentication (OAuth with Salesforce)
  - Manages webhook callbacks
  - Provides REST API for website ↔ Salesforce communication

## Recommended Tech Stack (Detailed)

### Frontend (Website)
**Choice: React + TypeScript**
- **Why**: Modern, scalable, great ecosystem
- **Deployment**: GitHub Pages (static hosting) via `gh-pages` branch or Actions
- **Alternative**: Next.js if you need SSR (then Heroku becomes necessary)

### Broker Layer
**Choice: Node.js/Express + TypeScript**
- **Why**: 
  - Excellent Salesforce SDK support (`jsforce`)
  - Easy OAuth implementation
  - Fast development
  - Good Heroku compatibility
- **Hosting**: Heroku (free dyno tier available)
- **Database**: Heroku Postgres (add-on, free tier) or use Salesforce as data store

### Salesforce
- **Flows**: For declarative logic, workflow orchestration
- **Apex**: For complex business logic, API endpoints (REST), webhook handlers
- **Custom Objects**: For form metadata, submission tracking
- **Connected Apps**: For OAuth with broker layer

## Architecture Flow

```
[User] → [Website (GitHub.io)] → [Broker Layer (Heroku)] → [Salesforce]
                ↓                                              ↓
         Form Interaction                              Business Logic
                                                          Data Storage
```

### Detailed Flow:
1. User visits website (hosted on GitHub.io)
2. Website loads form configuration/definition
3. User fills form → sends to Broker API (Heroku)
4. Broker authenticates with Salesforce (OAuth)
5. Broker sends data to Salesforce (via REST API or SOAP)
6. Salesforce processes via Flows/Apex
7. Response flows back: Salesforce → Broker → Website
8. User sees confirmation/result

## Monorepo Structure Recommendation

### Single Git Repository Structure

```
context-broker/
├── README.md
├── .gitignore
├── package.json (root workspace config - optional)
│
├── frontend/                  # Website (GitHub.io)
│   ├── package.json
│   ├── src/
│   ├── public/
│   └── .github/workflows/     # GitHub Actions for deployment
│
├── broker/                    # Heroku App
│   ├── package.json
│   ├── server.js
│   ├── Procfile              # Heroku requirement
│   └── .env.example
│
├── salesforce/                # Salesforce Code
│   ├── sfdx-project.json
│   ├── force-app/
│   │   └── main/
│   │       ├── default/
│   │       │   ├── classes/   # Apex classes
│   │       │   ├── flows/     # Flow definitions
│   │       │   └── objects/   # Custom objects
│   └── .sfdx/
│
├── docs/                      # Documentation
│
└── scripts/                   # Deployment scripts
    ├── deploy-heroku.sh
    ├── deploy-salesforce.sh
    └── deploy-github.sh
```

## Selective Deployment Strategy

### Option 1: Git Subtree (Recommended)
Push specific directories to different remotes:

```bash
# Add remotes
git remote add heroku https://git.heroku.com/your-app-name.git
git remote add github-origin https://github.com/username/repo.git

# Deploy to Heroku (broker directory only)
git subtree push --prefix=broker heroku main

# Deploy to GitHub Pages (frontend directory)
git subtree push --prefix=frontend github-origin gh-pages

# Or use deployment scripts (see below)
```

### Option 2: GitHub Actions (Automated)
Create workflows for each deployment:

**.github/workflows/deploy-frontend.yml**
```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        run: |
          cd frontend
          npm install
          npm run build
          # deploy to gh-pages branch
```

**.github/workflows/deploy-broker.yml**
```yaml
name: Deploy Broker
on:
  push:
    branches: [main]
    paths:
      - 'broker/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-app-name"
          heroku_email: "your-email@example.com"
          appdir: "broker"
```

**.github/workflows/deploy-salesforce.yml**
```yaml
name: Deploy Salesforce
on:
  push:
    branches: [main]
    paths:
      - 'salesforce/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: salesforce/setup-sfdx@v1
      - run: |
          cd salesforce
          sfdx force:source:deploy -p force-app
```

### Option 3: Deployment Scripts
Create simple bash scripts for manual deployment:

**scripts/deploy-heroku.sh**
```bash
#!/bin/bash
cd broker
git subtree push --prefix=broker heroku main
```

**scripts/deploy-github.sh**
```bash
#!/bin/bash
cd frontend
npm run build
npm run deploy  # if using gh-pages package
```

**scripts/deploy-salesforce.sh**
```bash
#!/bin/bash
cd salesforce
sfdx force:source:deploy -p force-app -u YOUR_ORG_ALIAS
```

## Setup Instructions

### Initial Setup

1. **Create Repository Structure**
   ```bash
   mkdir -p frontend broker salesforce docs scripts
   ```

2. **Initialize Each Component**
   ```bash
   # Frontend
   cd frontend
   npx create-react-app . --template typescript
   
   # Broker
   cd ../broker
   npm init -y
   npm install express typescript @types/express jsforce dotenv
   
   # Salesforce
   cd ../salesforce
   sfdx force:project:create -n .
   ```

3. **Configure Git Remotes**
   ```bash
   git remote add heroku https://git.heroku.com/your-app-name.git
   git remote add github-origin https://github.com/username/repo.git
   ```

### Environment Configuration

**broker/.env** (create from .env.example)
```
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_SECURITY_TOKEN=your_token
SALESFORCE_LOGIN_URL=https://login.salesforce.com
PORT=3000
NODE_ENV=production
```

**frontend/.env.production**
```
REACT_APP_BROKER_API_URL=https://your-heroku-app.herokuapp.com
```

## Cost Analysis

### Free Tier Options

1. **GitHub Pages**: Free (static sites)
2. **Heroku**: Free dyno (sleeps after inactivity, 550-1000 hours/month)
3. **Salesforce**: Developer Edition (free, limited licenses)

### Low-Cost Alternatives

1. **AWS**:
   - API Gateway: $3.50 per million requests
   - Lambda: 1M free requests/month, then $0.20 per million
   - S3 + CloudFront: ~$0.50/month for small sites
   - **Total for demo scale: < $5/month**

2. **Vercel/Netlify**: Free tier for frontend (better than GitHub Pages if you need serverless functions)

## Why These Recommendations?

### GitHub.io for Frontend
- ✅ **Completely free**
- ✅ Easy deployment (Git-based)
- ✅ Fast CDN
- ✅ HTTPS by default
- ❌ Only static sites (no backend)

### Heroku for Broker
- ✅ **Free tier available**
- ✅ Easy Git-based deployment
- ✅ Built-in Postgres add-on
- ✅ Good Node.js support
- ❌ Sleeps after inactivity (can be mitigated with keep-alive)
- ❌ Slower cold starts on free tier

### Monorepo Approach
- ✅ **Single source of truth**
- ✅ Easier code sharing (types, utilities)
- ✅ Atomic commits across components
- ✅ Unified versioning
- ✅ Simpler CI/CD setup
- ✅ Better for small teams/demos

## Generalization Strategy

To make this **general-purpose** (not form-specific):

1. **Form Schema Storage**: Store form definitions/metadata in Salesforce Custom Objects
2. **Dynamic Form Renderer**: Frontend reads schema and renders forms dynamically
3. **Configurable Mappings**: Broker maps form fields to Salesforce objects dynamically
4. **Webhook System**: Allow external forms to register via webhook

### Salesforce Custom Object Example

**Form_Definition__c**
- Name
- Fields_JSON__c (contains field definitions)
- Mapping_Rules__c (maps form fields to Salesforce fields)
- Active__c

### Frontend Approach
- Load form definition from API
- Render form dynamically based on schema
- Submit to broker with form ID

## Next Steps

1. ✅ Set up repository structure
2. ✅ Initialize each component
3. ✅ Configure deployment pipelines
4. ✅ Set up Salesforce Connected App (OAuth)
5. ✅ Build broker API endpoints
6. ✅ Create dynamic form renderer
7. ✅ Test end-to-end flow

## Additional Considerations

- **Authentication**: Use Salesforce OAuth 2.0 for broker ↔ Salesforce
- **Security**: HTTPS everywhere, validate inputs, sanitize data
- **Error Handling**: Comprehensive error handling across all layers
- **Logging**: Use Heroku logs, Salesforce debug logs, and frontend console
- **Testing**: Unit tests for Apex, integration tests for broker API
- **Documentation**: API documentation for broker, user guide for website


