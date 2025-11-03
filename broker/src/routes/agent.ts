import express, { Request, Response } from 'express';
import { parseContextId, validateContextId, getSessionByContextId } from '../services/session';
import {
  createErrorResponse,
  invalidContextIdError,
  sessionNotFoundError,
  ErrorType,
} from '../utils/errorResponse';

const router = express.Router();

interface AgentQuery {
  contextId: string;
  query: string;
  fieldName?: string;
}

interface AgentResponse {
  response: string;
  suggestions?: any[];
  validation?: {
    valid: boolean;
    message?: string;
  };
}

// POST /api/forms/:formId/agent/query - Query agent for form assistance
router.post('/:formId/agent/query', async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const { contextId, query, fieldName }: AgentQuery = req.body;

    if (!contextId) {
      const errorResponse = createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        'Context ID is required',
        {
          formId,
        },
        'Context ID must be provided in request body',
        'Include contextId in the request body',
        [
          'Verify contextId is included in POST body',
          'Check contextId format: formId:sessionId',
          'Ensure contextId was generated correctly on form load',
        ]
      );
      return res.status(400).json(errorResponse);
    }

    if (!validateContextId(contextId)) {
      const errorResponse = invalidContextIdError(contextId, 'Invalid format - must be formId:sessionId');
      return res.status(400).json(errorResponse);
    }

    const parsed = parseContextId(contextId);
    if (!parsed || parsed.formId !== formId) {
      const errorResponse = createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        'Context ID form ID mismatch',
        {
          formId,
          contextId,
          contextFormId: parsed?.formId,
        },
        `URL formId "${formId}" does not match contextId formId "${parsed?.formId}"`,
        'Ensure the formId in the URL matches the formId in the contextId',
        [
          'Check the URL path matches the formId in contextId',
          'Verify contextId was generated for the correct form',
          'Regenerate contextId if formId changed',
        ]
      );
      return res.status(400).json(errorResponse);
    }

    // Get session context
    const session = getSessionByContextId(contextId);
    if (!session) {
      const errorResponse = sessionNotFoundError(parsed.sessionId, contextId);
      return res.status(404).json(errorResponse);
    }

    // TODO: Integrate with actual AI agent (OpenAI, Salesforce Einstein, etc.)
    // For now, return mock responses based on query type

    let agentResponse: AgentResponse = {
      response: '',
      suggestions: [],
      validation: undefined,
    };

    // Mock agent logic (replace with actual agent integration)
    if (fieldName) {
      // Field-specific validation/suggestions
      if (query.toLowerCase().includes('validate') || query.toLowerCase().includes('valid')) {
        agentResponse.validation = {
          valid: true,
          message: `Field ${fieldName} looks good!`,
        };
      } else if (query.toLowerCase().includes('suggest') || query.toLowerCase().includes('hint')) {
        agentResponse.suggestions = [
          `Here's a suggestion for ${fieldName}`,
        ];
      }
      agentResponse.response = `I can help you with the ${fieldName} field.`;
    } else {
      // General form assistance
      agentResponse.response = `I can help you fill out this form. What do you need help with?`;
    }

    // Update session agent context
    if (session) {
      const agentContext = session.agentContext || {};
      agentContext.queries = agentContext.queries || [];
      agentContext.queries.push({
        query,
        response: agentResponse,
        timestamp: new Date().toISOString(),
      });
      session.agentContext = agentContext;
    }

    res.json(agentResponse);
  } catch (error: any) {
    console.error('❌ Error processing agent query:', error);
    const errorResponse = createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'Failed to process agent query',
      {
        formId: req.params.formId,
        contextId: req.body?.contextId,
        query: req.body?.query,
        fieldName: req.body?.fieldName,
      },
      error.message,
      'Check broker logs for detailed error information',
      [
        'Verify formId and contextId are valid',
        'Check broker logs for detailed error stack trace',
        'Ensure agent service is initialized correctly',
      ]
    );
    return res.status(500).json(errorResponse);
  }
});

export default router;





