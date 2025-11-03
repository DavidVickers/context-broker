import express, { Request, Response } from 'express';
import {
  createSession,
  getSession,
  getSessionByContextId,
  updateSessionFormData,
  updateSessionAgentContext,
  validateContextId,
} from '../services/session';
import {
  createErrorResponse,
  invalidContextIdError,
  sessionNotFoundError,
  ErrorType,
} from '../utils/errorResponse';

const router = express.Router();

// POST /api/sessions - Create a new session
router.post('/', async (req: Request, res: Response) => {
  try {
    const { formId, sessionId } = req.body;

    if (!formId) {
      const errorResponse = createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        'Form ID is required',
        {},
        'Form ID must be provided in request body',
        'Include formId in the request body',
        [
          'Verify formId is included in POST body',
          'Check formId is a valid string',
          'Ensure formId matches a Form_Definition__c.Form_Id__c',
        ]
      );
      return res.status(400).json(errorResponse);
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
    console.error('❌ Error creating session:', error);
    const errorResponse = createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'Failed to create session',
      {
        formId: req.body?.formId,
        sessionId: req.body?.sessionId,
      },
      error.message,
      'Check broker logs for detailed error information',
      [
        'Verify formId is valid',
        'Check broker logs for detailed error stack trace',
        'Ensure session service is initialized correctly',
      ]
    );
    return res.status(500).json(errorResponse);
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
    console.error('❌ Error fetching session:', error);
    const errorResponse = createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'Failed to fetch session',
      {
        sessionId: req.params.sessionId,
      },
      error.message,
      'Check broker logs for detailed error information',
      [
        'Verify sessionId format is correct',
        'Check broker logs for detailed error stack trace',
        'Ensure session service is initialized correctly',
      ]
    );
    return res.status(500).json(errorResponse);
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
      const errorResponse = sessionNotFoundError(sessionId);
      return res.status(404).json(errorResponse);
    }

    res.json({
      success: true,
      sessionId: session.sessionId,
      contextId: session.contextId,
      ...updates,
    });
  } catch (error: any) {
    console.error('❌ Error updating session:', error);
    const errorResponse = createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'Failed to update session',
      {
        sessionId: req.params.sessionId,
      },
      error.message,
      'Check broker logs for detailed error information',
      [
        'Verify sessionId format is correct',
        'Check broker logs for detailed error stack trace',
        'Ensure session service is initialized correctly',
      ]
    );
    return res.status(500).json(errorResponse);
  }
});

// GET /api/sessions/context/:contextId - Get session by Context ID
router.get('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const { contextId } = req.params;

    if (!validateContextId(contextId)) {
      const errorResponse = invalidContextIdError(contextId, 'Invalid format - must be formId:sessionId');
      return res.status(400).json(errorResponse);
    }

    const session = getSessionByContextId(contextId);

    if (!session) {
      const errorResponse = sessionNotFoundError('', contextId);
      return res.status(404).json(errorResponse);
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
    console.error('❌ Error fetching session by context ID:', error);
    const errorResponse = createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'Failed to fetch session by context ID',
      {
        contextId: req.params.contextId,
      },
      error.message,
      'Check broker logs for detailed error information',
      [
        'Verify contextId format is correct (formId:sessionId)',
        'Check broker logs for detailed error stack trace',
        'Ensure session service is initialized correctly',
      ]
    );
    return res.status(500).json(errorResponse);
  }
});

export default router;





