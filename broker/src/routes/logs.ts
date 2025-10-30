import { Router, Request, Response } from 'express';
import { queryLogs } from '../services/logger';

const router = Router();

// Get recent API logs
router.get('/api', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getRecentApiLogs(limit) as any[];
    res.json({
      count: logs.length,
      logs: logs.map((log: any) => {
        try {
          return {
            ...log,
            request_body: log.request_body ? JSON.parse(log.request_body) : null,
            response_body: log.response_body ? JSON.parse(log.response_body) : null,
          };
        } catch (e) {
          return log;
        }
      })
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get API logs',
      message: error.message
    });
  }
});

// Get API logs by path
router.get('/api/path/:pathPattern', (req: Request, res: Response) => {
  try {
    const pathPattern = req.params.pathPattern;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getApiLogsByPath(pathPattern, limit) as any[];
    res.json({
      count: logs.length,
      logs: logs.map((log: any) => {
        try {
          return {
            ...log,
            request_body: log.request_body ? JSON.parse(log.request_body) : null,
            response_body: log.response_body ? JSON.parse(log.response_body) : null,
          };
        } catch (e) {
          return log;
        }
      })
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get API logs',
      message: error.message
    });
  }
});

// Get form submissions
router.get('/submissions', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getFormSubmissions(limit) as any[];
    res.json({
      count: logs.length,
      submissions: logs.map((log: any) => {
        try {
          return {
            ...log,
            form_data: log.form_data ? JSON.parse(log.form_data) : null,
            mapping_rules: log.mapping_rules ? JSON.parse(log.mapping_rules) : null,
            business_record_ids: log.business_record_ids ? JSON.parse(log.business_record_ids) : null,
            relationship_ids: log.relationship_ids ? JSON.parse(log.relationship_ids) : null,
            success: log.success === 1
          };
        } catch (e) {
          return { ...log, success: log.success === 1 };
        }
      })
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get form submissions',
      message: error.message
    });
  }
});

// Get form submissions with status summary
router.get('/submissions/status', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getFormSubmissions(limit) as any[];
    
    const submissions = logs.map((log: any) => {
      try {
        const businessRecords = log.business_record_ids ? JSON.parse(log.business_record_ids) : null;
        const relationships = log.relationship_ids ? JSON.parse(log.relationship_ids) : null;
        
        // Determine status
        let status = 'unknown';
        if (log.error_message) {
          status = 'failed';
        } else if (businessRecords && businessRecords.length > 0) {
          const hasLead = businessRecords.some((r: any) => r.objectType === 'Lead');
          if (hasLead && (!relationships || relationships.length === 0)) {
            status = 'lead_created_no_relationship';
          } else if (hasLead && relationships && relationships.length > 0) {
            status = 'success';
          } else if (businessRecords.length > 0) {
            status = 'business_record_created';
          }
        } else if (log.submission_id) {
          status = 'submission_only';
        }
        
        return {
          id: log.id,
          timestamp: log.timestamp,
          form_id: log.form_id,
          submission_id: log.submission_id,
          status,
          has_lead: businessRecords?.some((r: any) => r.objectType === 'Lead') || false,
          has_relationship: relationships && relationships.length > 0,
          business_record_ids: businessRecords,
          relationship_ids: relationships,
          warning_message: log.warning_message,
          error_message: log.error_message
        };
      } catch (e) {
        return {
          id: log.id,
          timestamp: log.timestamp,
          form_id: log.form_id,
          status: 'parse_error',
          error: 'Failed to parse submission data'
        };
      }
    });
    
    res.json({
      count: submissions.length,
      submissions
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get submission status',
      message: error.message
    });
  }
});

// Get form submissions by form ID
router.get('/submissions/form/:formId', (req: Request, res: Response) => {
  try {
    const formId = req.params.formId;
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getFormSubmissionsByFormId(formId, limit) as any[];
    res.json({
      count: logs.length,
      submissions: logs.map((log: any) => {
        try {
          return {
            ...log,
            form_data: log.form_data ? JSON.parse(log.form_data) : null,
            mapping_rules: log.mapping_rules ? JSON.parse(log.mapping_rules) : null,
            business_record_ids: log.business_record_ids ? JSON.parse(log.business_record_ids) : null,
            relationship_ids: log.relationship_ids ? JSON.parse(log.relationship_ids) : null,
            success: log.success === 1
          };
        } catch (e) {
          return { ...log, success: log.success === 1 };
        }
      })
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get form submissions',
      message: error.message
    });
  }
});

// Get failed relationships (Lead created but no relationship)
router.get('/submissions/failed-relationships', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getFailedRelationships(limit) as any[];
    res.json({
      count: logs.length,
      submissions: logs.map((log: any) => {
        try {
          return {
            ...log,
            form_data: log.form_data ? JSON.parse(log.form_data) : null,
            mapping_rules: log.mapping_rules ? JSON.parse(log.mapping_rules) : null,
            business_record_ids: log.business_record_ids ? JSON.parse(log.business_record_ids) : null,
            relationship_ids: log.relationship_ids ? JSON.parse(log.relationship_ids) : null,
            success: log.success === 1
          };
        } catch (e) {
          return { ...log, success: log.success === 1 };
        }
      })
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get failed relationships',
      message: error.message
    });
  }
});

// Get errors
router.get('/errors', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = queryLogs.getErrors(limit) as any[];
    res.json({
      count: logs.length,
      errors: logs.map((log: any) => {
        try {
          return {
            ...log,
            request_body: log.request_body ? JSON.parse(log.request_body) : null,
            response_body: log.response_body ? JSON.parse(log.response_body) : null,
          };
        } catch (e) {
          return log;
        }
      })
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get errors',
      message: error.message
    });
  }
});

// Get form submission by Salesforce ID
router.get('/submissions/sf/:submissionId', (req: Request, res: Response) => {
  try {
    const submissionId = req.params.submissionId;
    const log = queryLogs.getFormSubmissionById(submissionId) as any;
    if (!log) {
      return res.status(404).json({
        error: 'Form submission not found',
        submissionId
      });
    }
    try {
      res.json({
        ...log,
        form_data: log.form_data ? JSON.parse(log.form_data) : null,
        mapping_rules: log.mapping_rules ? JSON.parse(log.mapping_rules) : null,
        business_record_ids: log.business_record_ids ? JSON.parse(log.business_record_ids) : null,
        relationship_ids: log.relationship_ids ? JSON.parse(log.relationship_ids) : null,
        success: log.success === 1
      });
    } catch (e) {
      res.json({
        ...log,
        success: log.success === 1
      });
    }
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get form submission',
      message: error.message
    });
  }
});

export default router;
