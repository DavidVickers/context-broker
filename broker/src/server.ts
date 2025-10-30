import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeSalesforce, getSalesforceConnection } from './services/salesforce';
import formRoutes from './routes/forms';
import healthRoutes from './routes/health';
import sessionRoutes from './routes/sessions';
import agentRoutes from './routes/agent';
import agentUIRoutes from './routes/agentUI';
import devEventsRoutes from './routes/devEvents';
import oauthRoutes from './routes/oauth';
import exploreRoutes from './routes/explore';
import debugRoutes from './routes/debug';
import testCreateRoutes from './routes/testCreate';
import queryFormRoutes from './routes/queryForm';
import debugFormsRoutes from './routes/debugForms';
import logsRoutes from './routes/logs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for dev UI
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for dev UI (development only)
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  const path = require('path');
  const publicPath = path.join(__dirname, '../public');
  console.log(`📁 Serving static files from: ${publicPath}`);
  app.use(express.static(publicPath));
  
  // Direct route for dev-events.html
  app.get('/dev-events.html', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'dev-events.html'));
  });
}

// Request logging middleware
import { logApiRequest } from './services/logger';
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalJson = res.json.bind(res);
  
  // Override res.json to capture response
  res.json = function(body: any) {
    const durationMs = Date.now() - startTime;
    
    // Log to database asynchronously (don't block response)
    setImmediate(() => {
      try {
        // Extract context ID and form ID from request
        const contextId = req.query.contextId as string || req.body?.contextId;
        const formId = req.params.formId || req.body?.formId || req.path.match(/\/forms\/([^\/]+)/)?.[1];
        
        logApiRequest({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
          requestBody: req.body,
          responseBody: body,
          contextId,
          formId,
          userAgent: req.get('user-agent'),
          ipAddress: req.ip || req.connection.remoteAddress
        });
      } catch (error) {
        // Don't fail request if logging fails
        console.error('Error logging request:', error);
      }
    });
    
    return originalJson(body);
  };
  
  // Handle errors
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    if (res.statusCode >= 400) {
      setImmediate(() => {
        try {
          const contextId = req.query.contextId as string || req.body?.contextId;
          const formId = req.params.formId || req.body?.formId || req.path.match(/\/forms\/([^\/]+)/)?.[1];
          
          logApiRequest({
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs,
            requestBody: req.body,
            contextId,
            formId,
            userAgent: req.get('user-agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            error: new Error(`HTTP ${res.statusCode}`)
          });
        } catch (error) {
          console.error('Error logging error:', error);
        }
      });
    }
  });
  
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/forms', agentRoutes); // Agent routes use /api/forms/:formId/agent/*
app.use('/api/agent/ui', agentUIRoutes); // Agent UI commands and events
app.use('/api/dev/events', devEventsRoutes); // Development: Event stream & visualization
app.use('/api/explore', exploreRoutes); // Salesforce org exploration
app.use('/api/debug', debugRoutes); // Debug endpoints
app.use('/api/test', testCreateRoutes); // Test endpoints
app.use('/api/query', queryFormRoutes); // Query endpoints
app.use('/api/debug/forms', debugFormsRoutes); // Debug form endpoints
app.use('/api/logs', logsRoutes); // Logging endpoints
app.use('/', oauthRoutes); // OAuth callback routes

// Diagnostic endpoint for environment variables
app.get('/api/test-env', (req: Request, res: Response) => {
  res.json({
    hasInstanceUrl: !!process.env.SALESFORCE_INSTANCE_URL,
    instanceUrl: process.env.SALESFORCE_INSTANCE_URL,
    nodeEnv: process.env.NODE_ENV,
    hasClientId: !!process.env.SALESFORCE_CLIENT_ID,
    hasClientSecret: !!process.env.SALESFORCE_CLIENT_SECRET,
    loginUrl: process.env.SALESFORCE_LOGIN_URL,
    salesforceEnv: process.env.SALESFORCE_ENV
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server (Salesforce is optional)
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Broker server running on port ${PORT}`);
    console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Dev Event Monitor: http://localhost:${PORT}/dev-events.html`);
  });
};

// Initialize Salesforce connection on startup (optional in development)
initializeSalesforce()
  .then((conn) => {
    if (conn) {
      console.log('✅ Salesforce connection initialized');
    }
    startServer();
  })
  .catch((error) => {
    console.log('⚠️  Salesforce not configured - continuing without Salesforce');
    console.log('   (This is normal for development without Salesforce)');
    startServer();
  });

export default app;

