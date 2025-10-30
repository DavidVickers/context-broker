import { Router, Request, Response } from 'express';
import { querySalesforce, initializeSalesforce } from '../services/salesforce';

const router = Router();

// Debug endpoint to see raw Fields_JSON__c from Salesforce
router.get('/raw/:formId', async (req: Request, res: Response) => {
  const { formId } = req.params;
  
  try {
    const query = `SELECT Id, Name, Form_Id__c, Fields_JSON__c, Mapping_Rules__c, Agent_Config__c FROM Form_Definition__c WHERE Form_Id__c = '${formId}' OR Name = '${formId}' LIMIT 1`;
    
    const result = await querySalesforce(query);
    
    if (result.records.length === 0) {
      return res.status(404).json({
        error: 'Form not found',
        formId,
      });
    }
    
    const record = result.records[0] as any;
    
    // Try to parse and show structure
    let parsedFields = null;
    let parseError = null;
    
    try {
      parsedFields = record.Fields_JSON__c ? JSON.parse(record.Fields_JSON__c) : null;
    } catch (e: any) {
      parseError = e.message;
    }
    
    res.json({
      id: record.Id,
      name: record.Name,
      formId: record.Form_Id__c,
      rawFieldsJSON: record.Fields_JSON__c,
      parsedFieldsJSON: parsedFields,
      parseError: parseError,
      structure: parsedFields ? {
        hasSections: !!parsedFields.sections,
        hasFields: !!parsedFields.fields || Array.isArray(parsedFields),
        sectionsCount: parsedFields.sections ? parsedFields.sections.length : 0,
        fieldsCount: parsedFields.fields ? parsedFields.fields.length : (Array.isArray(parsedFields) ? parsedFields.length : 0),
        firstSectionTitle: parsedFields.sections?.[0]?.title || null,
        firstFieldName: parsedFields.fields?.[0]?.name || (Array.isArray(parsedFields) ? parsedFields[0]?.name : null),
      } : null,
      rawMappingRules: record.Mapping_Rules__c,
      rawAgentConfig: record.Agent_Config__c,
    });
    
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to query form',
      message: error.message,
    });
  }
});

export default router;

