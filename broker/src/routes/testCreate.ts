import { Router, Request, Response } from 'express';
import { getAuthenticatedSalesforceConnectionByContextId } from '../services/salesforce';

const router = Router();

// Test record creation with same pattern
router.post('/test-create', async (req: Request, res: Response) => {
  const contextId = req.query.contextId as string;
  
  if (!contextId) {
    return res.status(400).json({ error: 'contextId required' });
  }

  try {
    const conn = await getAuthenticatedSalesforceConnectionByContextId(contextId);
    if (!conn) {
      return res.status(401).json({ error: 'No authenticated connection found' });
    }

    console.log(`🧪 Testing record creation`);
    console.log(`🔗 Instance URL: ${conn.instanceUrl}`);
    console.log(`🔑 Has access token: ${!!conn.accessToken}`);

    // Get Form_Definition__c ID first
    const formQuery = await conn.query(`SELECT Id FROM Form_Definition__c WHERE Form_Id__c = 'test-drive-form' LIMIT 1`);
    if (formQuery.records.length === 0) {
      return res.status(404).json({ error: 'Form definition not found' });
    }
    const formDefId = (formQuery.records[0] as any).Id;

    const testRecord = {
      Form_Definition__c: formDefId,
      Form_Id__c: 'test-drive-form',
      Context_ID__c: 'test:123',
      Session_ID__c: '123',
      Submission_Data__c: JSON.stringify({ test: true }),
      Submitted_At__c: new Date().toISOString()
    };

    console.log(`📄 Record:`, JSON.stringify(testRecord, null, 2));

    const result = await conn.sobject('Form_Submission__c').create(testRecord);
    
    if (!result.success) {
      throw new Error(`Failed to create: ${result.errors?.join(', ')}`);
    }

    res.json({
      success: true,
      recordId: result.id,
      instanceUrl: conn.instanceUrl
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Test creation failed',
      message: error.message
    });
  }
});

export default router;
