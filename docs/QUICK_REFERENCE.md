# Quick Reference Guide

## 🚀 Quick Commands

### Development
```bash
# Start broker (Terminal 1)
cd broker && npm run dev

# Start frontend (Terminal 2)
cd frontend && npm start
```

### Deployment
```bash
# Deploy broker to Heroku
./scripts/deploy-heroku.sh

# Deploy frontend to GitHub Pages
./scripts/deploy-github.sh

# Deploy Salesforce code
./scripts/deploy-salesforce.sh [org-alias]
```

### Salesforce CLI
```bash
# Authenticate
sfdx auth:web:login -a my-org

# List orgs
sfdx force:org:list

# Deploy
sfdx force:source:deploy -p force-app -u my-org

# Open org
sfdx force:org:open -u my-org
```

### Heroku
```bash
# View logs
heroku logs --tail -a your-app-name

# Set env vars
heroku config:set KEY=value -a your-app-name

# List env vars
heroku config -a your-app-name
```

## 📁 Important Files

- **`.cursorrules`** - Project context for AI assistance
- **`ARCHITECTURE_RECOMMENDATIONS.md`** - Complete architecture guide
- **`docs/SETUP_GUIDE.md`** - Detailed setup instructions
- **`broker/.env`** - Broker environment variables (create from .env.example)
- **`frontend/.env.local`** - Frontend environment variables

## 🔑 Environment Variables Checklist

### Broker (.env)
- [ ] SALESFORCE_CLIENT_ID
- [ ] SALESFORCE_CLIENT_SECRET
- [ ] SALESFORCE_USERNAME
- [ ] SALESFORCE_SECURITY_TOKEN
- [ ] SALESFORCE_LOGIN_URL
- [ ] PORT
- [ ] FRONTEND_URL

### Frontend (.env.local)
- [ ] REACT_APP_BROKER_API_URL

## 🌐 API Endpoints

### Broker API
- `GET /api/health` - Health check
- `GET /api/forms/:formId` - Get form definition
- `POST /api/forms/:formId/submit` - Submit form data

## 📝 Form Definition Schema

```json
{
  "formId": "unique-id",
  "name": "Form Name",
  "fields": [
    {
      "name": "fieldName",
      "label": "Field Label",
      "type": "text|email|number|select|textarea|checkbox",
      "required": true,
      "validation": {}
    }
  ],
  "mappings": {
    "salesforceObject": "Contact",
    "fieldMappings": {
      "firstName": "FirstName",
      "email": "Email"
    }
  }
}
```

## 🔍 Common Issues

**Broker won't connect**: Check Salesforce credentials in .env  
**Frontend API errors**: Verify REACT_APP_BROKER_API_URL  
**Salesforce deployment fails**: Authenticate with sfdx first  
**Heroku deployment fails**: Check Procfile and env vars


