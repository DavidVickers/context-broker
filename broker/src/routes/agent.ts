import express, { Request, Response } from 'express';
import { parseContextId, validateContextId, getSessionByContextId } from '../services/session';

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
      return res.status(400).json({
        error: 'Context ID is required',
      });
    }

    if (!validateContextId(contextId)) {
      return res.status(400).json({
        error: 'Invalid Context ID format',
      });
    }

    const parsed = parseContextId(contextId);
    if (!parsed || parsed.formId !== formId) {
      return res.status(400).json({
        error: 'Context ID form ID mismatch',
      });
    }

    // Get session context
    const session = getSessionByContextId(contextId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
      });
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
    console.error('Error processing agent query:', error);
    res.status(500).json({
      error: 'Failed to process agent query',
      message: error.message,
    });
  }
});

export default router;


