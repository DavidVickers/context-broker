# Forms-Aware Agent - Context Broker

A general-purpose, scalable Forms-Aware Agent that dynamically interacts with websites and forms, built with Salesforce backend, web interface, and broker layer.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Repository Structure](#repository-structure)
- [Deployment](#deployment)
- [Development](#development)

## 🏗️ Architecture Overview

```
[User] → [Frontend (GitHub.io)] → [Broker (Heroku)] → [Salesforce]
```

- **Frontend**: Static website hosted on GitHub Pages
- **Broker**: Node.js/Express API layer on Heroku
- **Salesforce**: Backend logic using Flows and Apex

For detailed architecture recommendations, see [ARCHITECTURE_RECOMMENDATIONS.md](./ARCHITECTURE_RECOMMENDATIONS.md)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- Git
- Salesforce CLI (sfdx)
- Heroku CLI (optional, for manual deployment)

### Initial Setup

1. **Clone and navigate to repository**
   ```bash
   cd "CONTEXT BROKER"
   ```

2. **Set up Frontend**
   ```bash
   cd frontend
   npx create-react-app . --template typescript
   npm install
   ```

3. **Set up Broker**
   ```bash
   cd ../broker
   npm init -y
   npm install express typescript @types/express jsforce dotenv
   npm install --save-dev @types/node nodemon ts-node
   ```

4. **Set up Salesforce**
   ```bash
   cd ../salesforce
   sfdx force:project:create -n .
   ```

5. **Configure Git Remotes**
   ```bash
   # From repo root
   git remote add heroku https://git.heroku.com/your-app-name.git
   git remote add github-origin https://github.com/your-username/your-repo.git
   ```

## 📁 Repository Structure

```
context-broker/
├── frontend/          # React app (deploy to GitHub Pages)
├── broker/            # Express API (deploy to Heroku)
├── salesforce/        # Apex/Flows (deploy to Salesforce)
├── scripts/           # Deployment scripts
└── docs/              # Documentation
```

## 🚢 Deployment

### Option 1: Manual Scripts (Recommended for Demo)

**Deploy Frontend to GitHub Pages:**
```bash
./scripts/deploy-github.sh
```

**Deploy Broker to Heroku:**
```bash
./scripts/deploy-heroku.sh
```

**Deploy Salesforce Code:**
```bash
./scripts/deploy-salesforce.sh [org-alias]
```

### Option 2: Git Subtree (Advanced)

```bash
# Heroku
git subtree push --prefix=broker heroku main

# GitHub Pages (after building)
cd frontend && npm run build && npx gh-pages -d build
```

### Option 3: GitHub Actions (Automated)

See `.github/workflows/` for automated CI/CD pipelines (create as needed).

## 💻 Development

### Local Development

**Frontend:**
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

**Broker:**
```bash
cd broker
npm start
# Runs on http://localhost:3000 (or PORT env var)
```

**Salesforce:**
```bash
cd salesforce
sfdx force:org:create -s -f config/project-scratch-def.json -a dev
sfdx force:source:push
sfdx force:org:open
```

### Environment Variables

Create `.env` files in respective directories:

**broker/.env:**
```
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_USERNAME=your_username
SALESFORCE_SECURITY_TOKEN=your_token
PORT=3000
```

**frontend/.env:**
```
REACT_APP_BROKER_API_URL=http://localhost:3001
```

## 🧠 Cursor AI Context Configuration

This project uses a **layered context system** to help Cursor AI maintain architectural awareness:

1. **`.cursorrules`** - Primary rules file (always loaded)
2. **`CONTEXT.md`** - Essential architecture patterns (critical reference)
3. **`docs/*.md`** - Detailed blueprints (referenced as needed)

**Key Pattern** (from CONTEXT.md):
- Context ID: `{formId}:{sessionId}` format
- Always validate server-side
- Preserve through all async operations

See [Cursor Context Guide](./docs/CURSOR_CONTEXT_GUIDE.md) for details.

## 📚 Documentation

- [Architecture Recommendations](./ARCHITECTURE_RECOMMENDATIONS.md) - Detailed architecture, tech stack, and rationale
- [Form Management Blueprint](./docs/FORM_MANAGEMENT_BLUEPRINT.md) - Session-based form identification
- [UI Agent Blueprint](./docs/UI_AGENT_BLUEPRINT.md) - Design-agnostic UI control system
- [Authentication Blueprint](./docs/AUTHENTICATION_BLUEPRINT.md) - Agent-initiated user authentication
- [SWOT Analysis](./docs/SWOT_ANALYSIS.md) - Strengths, Weaknesses, Opportunities, Threats assessment
- [Setup Guide](./docs/SETUP_GUIDE.md) - Complete setup instructions
- [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - What's been built
- [Quick Reference](./docs/QUICK_REFERENCE.md) - Command reference

## 🔧 Troubleshooting

### Heroku Deployment Issues
- Ensure `Procfile` exists in `broker/` directory
- Check Heroku logs: `heroku logs --tail -a your-app-name`

### GitHub Pages Not Updating
- Verify `gh-pages` branch exists
- Check GitHub Pages settings in repository settings
- Ensure frontend build succeeds

### Salesforce Deployment Errors
- Verify org authentication: `sfdx force:org:list`
- Check Salesforce CLI version: `sfdx --version`
- Review deployment errors in Salesforce Setup → Deployments

## 🤝 Contributing

This is a demo project. Structure it as needed for your use case.

## 📝 License

Add your license here.

