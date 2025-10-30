import { Router, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { tokenManager } from '../services/tokenManager';

const router = Router();
router.use(bodyParser.json());

// Debug endpoint to list all OAuth sessions
router.get('/sessions', (req: Request, res: Response) => {
  try {
    const sessions = tokenManager.getAllSessions();
    
    const sessionInfo = sessions.map(session => ({
      sessionId: session.sessionId,
      contextId: session.contextId,
      userId: session.userId,
      userEmail: session.userEmail,
      createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : 'N/A',
      lastAccessed: session.lastAccessed ? new Date(session.lastAccessed).toISOString() : 'N/A',
      tokenExpires: session.tokenData?.expires_at ? new Date(session.tokenData.expires_at).toISOString() : 'N/A',
      hasAccessToken: !!(session.tokenData?.access_token),
      hasRefreshToken: !!(session.tokenData?.refresh_token),
      isExpired: session.tokenData?.expires_at ? Date.now() > session.tokenData.expires_at : true
    }));

    res.json({
      totalSessions: sessions.length,
      sessions: sessionInfo
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get sessions',
      message: error.message
    });
  }
});

// Inject a session manually (dev only)
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const { contextId, access_token, refresh_token, instance_url, expires_in } = req.body || {};
    if (!contextId || !access_token) {
      return res.status(400).json({ error: 'contextId and access_token are required' });
    }

    const tokenData: any = {
      access_token,
      refresh_token: refresh_token || '',
      token_type: 'Bearer',
      expires_in: typeof expires_in === 'number' ? expires_in : 3600,
      scope: 'api openid refresh_token',
      issued_at: Date.now(),
      expires_at: Date.now() + ((typeof expires_in === 'number' ? expires_in : 3600) * 1000),
      instance_url: instance_url || process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com'
    };

    const sessionId = tokenManager.storeTokens(contextId, tokenData);
    return res.json({ sessionId, contextId });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to inject session', message: error.message });
  }
});

// Test Salesforce connection with a specific session
router.get('/test-connection/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  try {
    const conn = await tokenManager.getValidAccessToken(sessionId);
    if (!conn) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    res.json({
      sessionId,
      hasValidToken: true,
      message: 'Session has valid access token'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to test connection',
      message: error.message
    });
  }
});

export default router;
