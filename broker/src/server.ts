import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
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

// Rate limiting middleware - prevent single client from flooding broker
// Limits adjusted for real-time UI event monitoring application
// Standard endpoints: 500 requests per 15 minutes (reasonable for API usage)
// UI event endpoints: 5000 events per 15 minutes (realistic for real-time browsing)
const standardApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs (was 100 - too restrictive)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks, UI events, and dev event monitoring
  skip: (req: Request) => {
    const path = req.path;
    // Exclude health, UI events, and ALL dev event monitoring endpoints
    return path === '/api/health' || 
           path.startsWith('/api/agent/ui/event') ||
           path.startsWith('/api/dev/events'); // Matches /api/dev/events/stream, /recent, /stats
  },
});

// High limit for UI events - real-time browsing generates many events
// Realistic limit: 5000 events per 15 minutes (~333 events/min or ~5.5 events/sec)
// This accommodates: snapshots (1/sec), focus changes (frequent), field changes (typing), clicks
// Why: Real-time UI monitoring requires high event throughput for smooth agent interaction
const uiEventLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Allow 5000 UI events per 15 minutes (was 500 - too low for real-time)
  message: 'Too many UI events from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Only apply to UI event endpoint
  skip: (req: Request) => !req.path.startsWith('/api/agent/ui/event'),
});

// Apply standard rate limiting to most API routes
app.use('/api/', standardApiLimiter);

// Apply higher limit specifically to UI event endpoint
app.use('/api/agent/ui/event', uiEventLimiter);

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

// Request logging middleware (skip for SSE streams to avoid interfering)
import { logApiRequest } from './services/logger';
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip logging for SSE streams - they're long-lived connections
  if (req.path.startsWith('/api/dev/events/stream')) {
    return next(); // Skip logging for SSE, but continue to route
  }
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
// IMPORTANT: Dev events route BEFORE other routes to ensure SSE stream works properly
app.use('/api/dev/events', devEventsRoutes); // Development: Event stream & visualization (must be early)
app.use('/api/health', healthRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/forms', agentRoutes); // Agent routes use /api/forms/:formId/agent/*
app.use('/api/agent/ui', agentUIRoutes); // Agent UI commands and events
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

/**
 * Start the Express server on the configured port.
 * 
 * Handles port conflicts gracefully by providing helpful error messages and suggesting
 * solutions. If the configured port is in use, the server will fail with clear instructions.
 * 
 * **Why this matters**: Prevents silent failures and helps developers quickly identify
 * and resolve port conflicts during development.
 * 
 * **Memory Management**: The server listens on a single port - no cleanup needed as
 * the process termination handles port release automatically.
 * 
 * @throws Error with EADDRINUSE code if port is already in use
 */
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 Broker server running on port ${PORT}`);
    console.log(`📡 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔍 Dev Event Monitor: http://localhost:${PORT}/dev-events.html`);
  }).on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use!`);
      console.error(`\n💡 To fix this:`);
      console.error(`   1. Find the process: lsof -ti:${PORT}`);
      console.error(`   2. Kill it: kill -9 $(lsof -ti:${PORT})`);
      console.error(`   3. Or change PORT in .env to use a different port\n`);
      process.exit(1);
    } else {
      console.error(`\n❌ Failed to start server:`, error.message);
      throw error;
    }
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

