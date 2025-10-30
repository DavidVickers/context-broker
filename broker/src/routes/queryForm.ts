import { Router, Request, Response } from 'express';
import { getAuthenticatedSalesforceConnectionByContextId } from '../services/salesforce';

const router = Router();

// Query specific form definition with all fields
router.get('/form-def/:formId', async (req: Request, res: Response) => {
  const { formId } = req.params;
  const contextId = req.query.contextId as string;
  
  if (!contextId) {
    return res.status(400).json({ error: 'contextId required' });
  }

  try {
    const conn = await getAuthenticatedSalesforceConnectionByContextId(contextId);
    if (!conn) {
      return res.status(401).json({ error: 'No authenticated connection found' });
    }

    const query = `SELECT Id, Name, Form_Id__c, Mapping_Rules__c, Fields_JSON__c, Agent_Config__c FROM Form_Definition__c WHERE Form_Id__c = '${formId}' LIMIT 1`;
    const result = await conn.query(query);
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const record = result.records[0] as any;
    
    res.json({
      id: record.Id,
      name: record.Name,
      formId: record.Form_Id__c,
      mappingRules: record.Mapping_Rules__c,
      fieldsJSON: record.Fields_JSON__c,
      agentConfig: record.Agent_Config__c
    });

  } catch (error: any) {
    res.status(500).json({
      error: 'Query failed',
      message: error.message
    });
  }
});

export default router;
