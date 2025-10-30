import express, { Request, Response } from 'express';
import {
  createSession,
  getSession,
  getSessionByContextId,
  updateSessionFormData,
  updateSessionAgentContext,
  validateContextId,
} from '../services/session';

const router = express.Router();

// POST /api/sessions - Create a new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { formId, sessionId } = req.body;

    if (!formId) {
      return res.status(400).json({
        error: 'Form ID is required',
      });
    }

    // If sessionId provided, validate it exists, otherwise create new
    let session;
    if (sessionId) {
      const existing = getSession(sessionId);
      if (existing) {
        session = existing;
      } else {
        session = createSession(formId, sessionId);
      }
    } else {
      session = createSession(formId);
    }

    res.json({
      sessionId: session.sessionId,
      contextId: session.contextId,
      formId: session.formId,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message,
    });
  }
});

// GET /api/sessions/:sessionId - Get session data
router.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
      });
    }

    res.json({
      sessionId: session.sessionId,
      contextId: session.contextId,
      formId: session.formId,
      formData: session.formData || {},
      agentContext: session.agentContext || {},
      startTime: session.startTime.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      error: 'Failed to fetch session',
      message: error.message,
    });
  }
});

// PUT /api/sessions/:sessionId - Update session data
router.put('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { formData, agentContext } = req.body;

    const updates: any = {};

    if (formData !== undefined) {
      updateSessionFormData(sessionId, formData);
      updates.formData = formData;
    }

    if (agentContext !== undefined) {
      updateSessionAgentContext(sessionId, agentContext);
      updates.agentContext = agentContext;
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
      });
    }

    res.json({
      success: true,
      sessionId: session.sessionId,
      contextId: session.contextId,
      ...updates,
    });
  } catch (error: any) {
    console.error('Error updating session:', error);
    res.status(500).json({
      error: 'Failed to update session',
      message: error.message,
    });
  }
});

// GET /api/sessions/context/:contextId - Get session by Context ID
router.get('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const { contextId } = req.params;

    if (!validateContextId(contextId)) {
      return res.status(400).json({
        error: 'Invalid Context ID format',
      });
    }

    const session = getSessionByContextId(contextId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
      });
    }

    res.json({
      sessionId: session.sessionId,
      contextId: session.contextId,
      formId: session.formId,
      formData: session.formData || {},
      agentContext: session.agentContext || {},
      startTime: session.startTime.toISOString(),
      lastActivity: session.lastActivity.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching session by context ID:', error);
    res.status(500).json({
      error: 'Failed to fetch session',
      message: error.message,
    });
  }
});

export default router;


