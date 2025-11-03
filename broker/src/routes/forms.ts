import express, { Request, Response } from 'express';
import { querySalesforce, createSalesforceRecord, getAuthenticatedSalesforceConnectionByContextId, getSalesforceConnection, initializeSalesforce } from '../services/salesforce';
import { parseContextId, validateContextId, getSessionByContextId } from '../services/session';
import { logFormSubmission } from '../services/logger';
import {
  createErrorResponse,
  handleSalesforceError,
  formNotFoundError,
  salesforceConnectionError,
  invalidContextIdError,
  mappingRulesParseError,
  fieldMappingMissingError,
  ErrorType,
} from '../utils/errorResponse';
import { applyTransformations } from '../utils/transformations';

const router = express.Router();

// GET /api/forms/:formId - Get form definition from Salesforce
router.get('/:formId', async (req: Request, res: Response) => {
  const { formId } = req.params; // Move outside try block so it's accessible in catch
  const contextId = req.query.contextId as string;
  
  try {
    // Try authenticated connection first if contextId provided
    // Note: Mock forms are only used as fallback if Salesforce query fails
    if (contextId) {
      try {
        const conn = await getAuthenticatedSalesforceConnectionByContextId(contextId);
        if (conn) {
          console.log(`🔍 Fetching form ${formId} with authenticated connection for contextId: ${contextId}`);
          const query = `SELECT Id, Name, Form_Id__c, Fields_JSON__c, Mapping_Rules__c, Agent_Config__c, Active__c FROM Form_Definition__c WHERE Form_Id__c = '${formId}' OR Name = '${formId}' LIMIT 1`;
          
          const result = await conn.query(query);
          
          if (result.records.length > 0) {
            const formRecord = result.records[0] as any;
            console.log(`✅ Found form definition in Salesforce: ${formRecord.Name}`);
            
            // Parse JSON fields - support both old format (fields array) and new format (sections)
            let fieldsJson = null;
            let mappings = undefined;
            let agentConfig = undefined;

            try {
              // Parse Fields_JSON__c as the complete form structure
              if (formRecord.Fields_JSON__c) {
                const parsed = JSON.parse(formRecord.Fields_JSON__c);
                fieldsJson = parsed;
              }
              mappings = formRecord.Mapping_Rules__c ? JSON.parse(formRecord.Mapping_Rules__c) : undefined;
              agentConfig = formRecord.Agent_Config__c ? JSON.parse(formRecord.Agent_Config__c) : undefined;
            } catch (parseError: any) {
              console.error('❌ Error parsing JSON fields:', parseError);
              console.error('   Fields_JSON__c content:', formRecord.Fields_JSON__c?.substring(0, 200));
              const errorResponse = createErrorResponse(
                ErrorType.PARSING_ERROR,
                `Failed to parse Form_Definition__c JSON fields for form: ${formId}`,
                {
                  formId,
                  recordId: formRecord.Id,
                  field: parseError.message?.includes('Fields_JSON__c') ? 'Fields_JSON__c' : 
                         parseError.message?.includes('Mapping_Rules__c') ? 'Mapping_Rules__c' :
                         parseError.message?.includes('Agent_Config__c') ? 'Agent_Config__c' : 'unknown',
                },
                parseError.message,
                'Fix the JSON syntax in Form_Definition__c fields',
                [
                  'Verify JSON is valid (check for missing quotes, brackets, commas)',
                  'Test JSON with a JSON validator tool',
                  'Check broker logs for detailed error information',
                ]
              );
              return res.status(400).json(errorResponse);
            }

            // Build response - support both old format (fields) and new format (sections)
            const response: any = {
              formId: formRecord.Form_Id__c || formRecord.Name,
              name: formRecord.Name,
              mappings,
              agentConfig,
              active: formRecord.Active__c !== false
            };

            // If Fields_JSON__c contains sections (new format), return it directly
            if (fieldsJson && fieldsJson.sections) {
              response.title = fieldsJson.title || formRecord.Name;
              response.sections = fieldsJson.sections;
              response.formId = fieldsJson.formId || response.formId;
            } 
            // If Fields_JSON__c contains fields array (old format), return it
            else if (fieldsJson && Array.isArray(fieldsJson)) {
              response.fields = fieldsJson;
            }
            // If Fields_JSON__c is an object with fields property (old format)
            else if (fieldsJson && fieldsJson.fields) {
              response.title = fieldsJson.title || fieldsJson.name || formRecord.Name;
              response.formId = fieldsJson.formId || response.formId;
              response.fields = fieldsJson.fields;
            }
            // Fallback: empty fields array
            else {
              response.fields = [];
            }

            return res.json(response);
          }
        }
      } catch (authError) {
        console.log('⚠️  Authenticated query failed, trying unauthenticated:', authError);
      }
    }

    // Try to query Salesforce with unauthenticated connection
    try {
      // Query Form_Definition__c custom object
      // Note: This assumes you've created the Form_Definition__c object in Salesforce
      const query = `SELECT Id, Name, Form_Id__c, Fields_JSON__c, Mapping_Rules__c, Agent_Config__c, Active__c FROM Form_Definition__c WHERE Form_Id__c = '${formId}' OR Name = '${formId}' LIMIT 1`;

      const result = await querySalesforce(query);

      if (result.records.length === 0) {
        // Form not found - return standardized error
        const errorResponse = formNotFoundError(formId, {
          queryType: 'unauthenticated',
        });
        return res.status(404).json(errorResponse);
      }

      const formRecord = result.records[0] as any;

      // Parse JSON fields - support both old format (fields array) and new format (sections)
      let fieldsJson = null;
      let mappings = undefined;
      let agentConfig = undefined;

      try {
        // Parse Fields_JSON__c as the complete form structure
        if (formRecord.Fields_JSON__c) {
          const parsed = JSON.parse(formRecord.Fields_JSON__c);
          fieldsJson = parsed;
          console.log(`📋 Parsed Fields_JSON__c - has sections: ${!!parsed.sections}, has fields: ${!!parsed.fields || Array.isArray(parsed)}`);
        }
      } catch (e: any) {
        console.error('❌ Error parsing Fields_JSON__c:', e);
        console.error('   Fields_JSON__c content:', formRecord.Fields_JSON__c?.substring(0, 200));
        const errorResponse = createErrorResponse(
          ErrorType.PARSING_ERROR,
          `Failed to parse Fields_JSON__c for form: ${formId}`,
          {
            formId,
            recordId: formRecord.Id,
            field: 'Fields_JSON__c',
          },
          e.message,
          'Fix the JSON syntax in Form_Definition__c.Fields_JSON__c field',
          [
            'Verify Fields_JSON__c is valid JSON',
            'Check for missing quotes, brackets, or commas',
            'Test JSON with a JSON validator tool',
          ]
        );
        return res.status(400).json(errorResponse);
      }

      try {
        mappings = formRecord.Mapping_Rules__c ? JSON.parse(formRecord.Mapping_Rules__c) : undefined;
      } catch (e: any) {
        console.error('❌ Error parsing Mapping_Rules__c:', e);
        const errorResponse = mappingRulesParseError(formId, e);
        return res.status(400).json(errorResponse);
      }

      try {
        agentConfig = formRecord.Agent_Config__c ? JSON.parse(formRecord.Agent_Config__c) : undefined;
      } catch (e: any) {
        console.error('❌ Error parsing Agent_Config__c:', e);
        const errorResponse = createErrorResponse(
          ErrorType.PARSING_ERROR,
          `Failed to parse Agent_Config__c for form: ${formId}`,
          {
            formId,
            recordId: formRecord.Id,
            field: 'Agent_Config__c',
          },
          e.message,
          'Fix the JSON syntax in Form_Definition__c.Agent_Config__c field',
          [
            'Verify Agent_Config__c is valid JSON',
            'Check for missing quotes, brackets, or commas',
            'Test JSON with a JSON validator tool',
          ]
        );
        return res.status(400).json(errorResponse);
      }

      // Build response - support both old format (fields) and new format (sections)
      const response: any = {
        formId: formRecord.Form_Id__c || formRecord.Name || formId,
        name: formRecord.Name || 'Unnamed Form',
        mappings,
        agentConfig,
        active: formRecord.Active__c !== false
      };

      // If Fields_JSON__c contains sections (new format), return it directly
      if (fieldsJson && fieldsJson.sections) {
        response.title = fieldsJson.title || formRecord.Name;
        response.sections = fieldsJson.sections;
        response.formId = fieldsJson.formId || response.formId;
        console.log(`✅ Returning new format with ${fieldsJson.sections.length} section(s)`);
      } 
      // If Fields_JSON__c contains fields array (old format), return it
      else if (fieldsJson && Array.isArray(fieldsJson)) {
        response.fields = fieldsJson;
        console.log(`✅ Returning old format with ${fieldsJson.length} field(s)`);
      }
      // If Fields_JSON__c is an object with fields property (old format)
      else if (fieldsJson && fieldsJson.fields) {
        response.title = fieldsJson.title || fieldsJson.name || formRecord.Name;
        response.formId = fieldsJson.formId || response.formId;
        response.fields = fieldsJson.fields;
        console.log(`✅ Returning old format (object) with ${fieldsJson.fields.length} field(s)`);
      }
      // Fallback: empty fields array
      else {
        response.fields = [];
        console.warn(`⚠️  No valid form structure found in Fields_JSON__c`);
      }

      return res.json(response);
    } catch (sfError: any) {
      // Salesforce query failed - return standardized error
      console.error('❌ Salesforce query failed:', sfError);
      const errorResponse = handleSalesforceError(sfError, 'query Form_Definition__c', {
        formId,
        queryType: 'unauthenticated',
      });
      const statusCode = errorResponse.error.type === ErrorType.SALESFORCE_CONNECTION_ERROR ? 503 :
                         errorResponse.error.type === ErrorType.SALESFORCE_AUTH_ERROR ? 401 : 502;
      return res.status(statusCode).json(errorResponse);
    }
  } catch (error: any) {
    console.error('❌ Error fetching form definition:', error);
    
    // Determine error type
    let errorResponse;
    if (error.message?.includes('Salesforce') || error.errorCode) {
      // Salesforce-related error
      errorResponse = handleSalesforceError(error, 'fetch form definition', { formId });
    } else if (error.message?.includes('connection') || error.message?.includes('Connection')) {
      // Connection error
      errorResponse = salesforceConnectionError('fetch form definition', { formId });
    } else {
      // Generic internal error
      errorResponse = createErrorResponse(
        ErrorType.INTERNAL_ERROR,
        `Failed to fetch form definition: ${formId}`,
        { formId },
        error.message,
        'Check broker logs for detailed error information',
        [
          'Verify Salesforce connection is configured',
          'Check broker logs for detailed error stack trace',
          'Ensure Form_Definition__c object exists in Salesforce',
        ]
      );
    }
    
    const statusCode = errorResponse.error.type === ErrorType.SALESFORCE_CONNECTION_ERROR ? 503 :
                       errorResponse.error.type === ErrorType.SALESFORCE_AUTH_ERROR ? 401 : 500;
    return res.status(statusCode).json(errorResponse);
  }
});

// POST /api/forms/:formId/submit - Submit form data to Salesforce
router.post('/:formId/submit', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { formId } = req.params;
    const { contextId, formData: submittedFormData } = req.body;
    
    // Extract actual form data (handle both cases: formData directly or nested)
    const formData = submittedFormData || req.body;
    
    // Validate Context ID if provided
    let sessionId: string | null = null;
    let validatedFormId = formId;
    
    if (contextId) {
      if (!validateContextId(contextId)) {
        const errorResponse = invalidContextIdError(contextId, 'Invalid format - must be formId:sessionId');
        return res.status(400).json(errorResponse);
      }

      const parsed = parseContextId(contextId);
      if (!parsed) {
        const errorResponse = invalidContextIdError(contextId, 'Failed to parse - sessionId must be valid UUID v4');
        return res.status(400).json(errorResponse);
      }

      // Use formId from contextId if it matches, otherwise validate
      if (parsed.formId !== formId) {
        const errorResponse = createErrorResponse(
          ErrorType.VALIDATION_ERROR,
          'Form ID mismatch between URL and Context ID',
          {
            urlFormId: formId,
            contextFormId: parsed.formId,
            contextId,
          },
          `URL formId "${formId}" does not match contextId formId "${parsed.formId}"`,
          'Ensure the formId in the URL matches the formId in the contextId',
          [
            'Check the URL path matches the formId in contextId',
            'Verify contextId was generated for the correct form',
            'Regenerate contextId if formId changed',
          ]
        );
        return res.status(400).json(errorResponse);
      }

      validatedFormId = parsed.formId;
      sessionId = parsed.sessionId;

      // Get session context for additional data
      const session = getSessionByContextId(contextId);
      if (!session) {
        const errorResponse = createErrorResponse(
          ErrorType.SESSION_NOT_FOUND,
          `Session not found for contextId: ${contextId}`,
          {
            contextId,
            sessionId: parsed.sessionId,
            formId: parsed.formId,
          },
          'Session may have expired (24-hour TTL) or was never created',
          'Create a new session by calling POST /api/sessions with your formId',
          [
            'Sessions expire after 24 hours of inactivity',
            'Create a new session if the existing one expired',
            'Verify sessionId was generated correctly on form load',
          ]
        );
        return res.status(404).json(errorResponse);
      }

      // Merge session form data with submitted data (submitted takes precedence)
      Object.assign(formData, session.formData || {});
    }

    // Get form definition first to understand mapping
    console.log(`🔍 POST /submit: validatedFormId = ${validatedFormId}, contextId = ${contextId}`);
    const formQuery = `SELECT Id, Mapping_Rules__c FROM Form_Definition__c WHERE Form_Id__c = '${validatedFormId}' LIMIT 1`;

    // Try to get authenticated connection - prioritize user session, fallback to service account
    let formResult;
    let authConn = null;
    
    // Step 1: Try user OAuth session if contextId provided
    if (contextId) {
      authConn = await getAuthenticatedSalesforceConnectionByContextId(contextId);
      if (authConn) {
        console.log(`✅ Using user OAuth session for contextId: ${contextId}`);
      }
    }
    
    // Step 2: Fallback to service account connection (Connected App credentials)
    if (!authConn) {
      try {
        // Try to get existing connection
        authConn = getSalesforceConnection();
        console.log(`✅ Using existing service account connection (Connected App)`);
      } catch (error: any) {
        // If no connection exists, try to initialize it
        console.log(`🔄 No existing connection, initializing service account...`);
        try {
          authConn = await initializeSalesforce();
          console.log(`✅ Initialized service account connection (Connected App)`);
        } catch (initError: any) {
          console.error(`❌ Failed to initialize service account: ${initError.message}`);
          const errorResponse = salesforceConnectionError('initialize service account', {
            formId: validatedFormId,
            operation: 'form submission',
          });
          return res.status(503).json(errorResponse);
        }
      }
    }
    
    if (!authConn) {
      console.error('❌ No Salesforce connection available');
      const errorResponse = salesforceConnectionError('submit form', {
        formId: validatedFormId,
        contextId,
      });
      return res.status(503).json(errorResponse);
    }
    
    // Verify and log instanceUrl before query
    if (!authConn.instanceUrl) {
      console.error('❌ authConn missing instanceUrl! Connection details:', {
        hasAccessToken: !!authConn.accessToken,
        hasUserInfo: !!authConn.userInfo,
      });
      const errorResponse = createErrorResponse(
        ErrorType.SALESFORCE_CONNECTION_ERROR,
        'Salesforce connection missing instanceUrl',
        {
          formId: validatedFormId,
          contextId,
        },
        'Connection object is missing required instanceUrl property',
        'Re-initialize Salesforce connection or complete OAuth flow',
        [
          'Verify OAuth flow completed successfully',
          'Check broker logs for connection initialization errors',
          'Try re-authenticating: /oauth/authorize?contextId=service_account',
        ]
      );
      return res.status(503).json(errorResponse);
    }
    
    console.log(`🔍 Fetching form mapping`);
    console.log(`🔗 Instance URL: ${authConn.instanceUrl}`);
    console.log(`🔑 Access Token: ${authConn.accessToken ? authConn.accessToken.substring(0, 20) + '...' : 'MISSING'}`);
    console.log(`📝 Query: ${formQuery}`);
    
    try {
      formResult = await authConn.query(formQuery);
      console.log(`✅ Query returned ${formResult.records?.length || 0} records`);
    } catch (queryError: any) {
      console.error('❌ Salesforce query failed:', queryError);
      const errorResponse = handleSalesforceError(queryError, 'query Form_Definition__c', {
        formId: validatedFormId,
        contextId,
      });
      const statusCode = errorResponse.error.type === ErrorType.SALESFORCE_CONNECTION_ERROR ? 503 :
                         errorResponse.error.type === ErrorType.SALESFORCE_AUTH_ERROR ? 401 : 502;
      return res.status(statusCode).json(errorResponse);
    }

    if (formResult.records.length === 0) {
      console.error(`❌ No form definition found for formId: ${validatedFormId}`);
      const errorResponse = formNotFoundError(validatedFormId, {
        operation: 'form submission',
        contextId,
      });
      return res.status(404).json(errorResponse);
    }

    const formRecord = formResult.records[0] as any;
    console.log(`✅ Found form definition: ${formRecord.Id}`);
    let mappings: any = undefined;

    try {
      mappings = formRecord.Mapping_Rules__c ? JSON.parse(formRecord.Mapping_Rules__c) : undefined;
    } catch (e: any) {
      console.error('❌ Error parsing Mapping_Rules__c:', e);
      const errorResponse = mappingRulesParseError(validatedFormId, e);
      return res.status(400).json(errorResponse);
    }

    // Determine target Salesforce object and field mappings from Mapping_Rules__c
    const targetBusinessObject = mappings?.salesforceObject || null; // Lead, Case, Contact, etc.
    const fieldMappings = mappings?.fieldMappings || {};
    const conditionalMappings = mappings?.conditionalMappings || {}; // Conditional mappings
    const transformations = mappings?.transformations || {}; // Transformations (name parsing, etc.)
    
    console.log(`🔍 Mapping analysis:`);
    console.log(`   targetBusinessObject: ${targetBusinessObject}`);
    console.log(`   fieldMappings:`, JSON.stringify(fieldMappings, null, 2));
    console.log(`   conditionalMappings:`, JSON.stringify(conditionalMappings, null, 2));
    console.log(`   formData keys:`, Object.keys(formData));

    // Ensure we have authConn for record creation - use service account if needed
    if (!authConn) {
      try {
        // Try to get existing connection
        authConn = getSalesforceConnection();
        console.log(`✅ Using existing service account connection for record creation`);
      } catch (error: any) {
        // If no connection exists, try to initialize it
        console.log(`🔄 No existing connection, initializing service account for record creation...`);
        try {
          authConn = await initializeSalesforce();
          console.log(`✅ Initialized service account connection for record creation`);
        } catch (initError: any) {
          console.error(`❌ Failed to initialize service account: ${initError.message}`);
          const errorResponse = salesforceConnectionError('initialize service account for record creation', {
            formId: validatedFormId,
            operation: 'form submission',
            contextId,
          });
          return res.status(503).json(errorResponse);
        }
      }
    }

    // STEP 1: Create business object (Lead, Case, Contact, etc.) if mapping exists
    let businessRecordIds: Array<{ id: string; objectType: string }> = [];
    
    // Verify connection before creating records
    if (!authConn.instanceUrl) {
      console.error('❌ authConn missing instanceUrl before record creation!');
      const errorResponse = createErrorResponse(
        ErrorType.SALESFORCE_CONNECTION_ERROR,
        'Salesforce connection missing instanceUrl before record creation',
        {
          formId: validatedFormId,
          contextId,
          operation: 'record creation',
        },
        'Connection object is missing required instanceUrl property',
        'Re-initialize Salesforce connection or complete OAuth flow',
        [
          'Verify OAuth flow completed successfully',
          'Check broker logs for connection initialization errors',
          'Try re-authenticating: /oauth/authorize?contextId=service_account',
        ]
      );
      return res.status(503).json(errorResponse);
    }
    
    if (targetBusinessObject && targetBusinessObject !== 'Form_Submission__c') {
      console.log(`📝 Step 1: Creating ${targetBusinessObject} record...`);
      console.log(`🔗 Using instance URL: ${authConn.instanceUrl}`);
      
      // Helper function to evaluate conditional mapping rule
      const evaluateCondition = (condition: any, formData: Record<string, any>): boolean => {
        if (!condition || typeof condition !== 'object') return false;
        
        const formField = condition.formField || condition.field;
        const operator = condition.operator || 'equals';
        const value = condition.value;
        
        if (!formField) return false;
        
        const fieldValue = formData[formField];
        
        switch (operator) {
          case 'equals':
          case '==':
            return fieldValue === value;
          case 'notEquals':
          case '!=':
            return fieldValue !== value;
          case 'contains':
            return String(fieldValue || '').includes(String(value || ''));
          case 'notContains':
            return !String(fieldValue || '').includes(String(value || ''));
          case 'greaterThan':
          case '>':
            return Number(fieldValue) > Number(value);
          case 'lessThan':
          case '<':
            return Number(fieldValue) < Number(value);
          case 'exists':
          case 'isNotEmpty':
            return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
          case 'isEmpty':
          case 'notExists':
            return fieldValue === null || fieldValue === undefined || fieldValue === '';
          default:
            console.warn(`   ⚠️  Unknown operator: ${operator}, defaulting to equals`);
            return fieldValue === value;
        }
      };
      
      // Step 1: Apply transformations to form data (e.g., split name, format phone)
      const transformedFormData = applyTransformations(formData, transformations);
      if (Object.keys(transformations).length > 0) {
        console.log(`   🔄 Applied ${Object.keys(transformations).length} transformation(s)`);
      }
      
      // Step 2: Map transformed form data to business object fields
      const businessRecord: Record<string, any> = {};
      const unmappedFields: string[] = [];
      
      // Apply static field mappings (use transformed data)
      Object.keys(transformedFormData).forEach((formField) => {
        const salesforceField = fieldMappings[formField];
        if (salesforceField) {
          businessRecord[salesforceField] = transformedFormData[formField];
          console.log(`   Mapping: "${formField}" → "${salesforceField}" = "${transformedFormData[formField]}"`);
        } else {
          unmappedFields.push(formField);
        }
      });
      
      // Note: Transformations like splitName are already applied to transformedFormData above
      // They create fields directly (e.g., FirstName, LastName) that are already in transformedFormData
      // These fields will be mapped via fieldMappings in the loop above
      
      // Step 3: Apply conditional mappings (override static mappings if conditions match)
      Object.keys(conditionalMappings).forEach((salesforceField) => {
        const conditionalRule = conditionalMappings[salesforceField];
        
        if (!conditionalRule || typeof conditionalRule !== 'object') {
          console.warn(`   ⚠️  Invalid conditional mapping for ${salesforceField}`);
          return;
        }
        
        // Support both formats:
        // Format 1: { when: { formField: "value" }, then: { mapFrom: "field" }, else: { mapFrom: "field" } }
        // Format 2: { conditions: [{ if: {...}, then: {...} }] }
        
        let resolvedValue: any = null;
        
        if (conditionalRule.when) {
          // Format 1: Simple when/then/else
          const whenCondition = conditionalRule.when;
          const conditionMet = Object.keys(whenCondition).every(formField => {
            return formData[formField] === whenCondition[formField];
          });
          
          if (conditionMet && conditionalRule.then && conditionalRule.then.mapFrom) {
            const sourceField = conditionalRule.then.mapFrom;
            resolvedValue = formData[sourceField];
            console.log(`   ✅ Conditional mapping: ${salesforceField} = ${sourceField} (condition met)`);
          } else if (!conditionMet && conditionalRule.else && conditionalRule.else.mapFrom) {
            const sourceField = conditionalRule.else.mapFrom;
            resolvedValue = formData[sourceField];
            console.log(`   ✅ Conditional mapping: ${salesforceField} = ${sourceField} (else case)`);
          }
        } else if (conditionalRule.conditions && Array.isArray(conditionalRule.conditions)) {
          // Format 2: Array of if/then conditions (evaluated in order, first match wins)
          for (const condition of conditionalRule.conditions) {
            if (condition.if && condition.then) {
              const conditionMet = evaluateCondition(condition.if, formData);
              
              if (conditionMet && condition.then) {
                if (condition.then.mapFrom) {
                  const sourceField = condition.then.mapFrom;
                  resolvedValue = formData[sourceField];
                  console.log(`   ✅ Conditional mapping: ${salesforceField} = ${sourceField} (condition: ${JSON.stringify(condition.if)})`);
                  break; // First match wins
                } else if (condition.then.value !== undefined) {
                  resolvedValue = condition.then.value;
                  console.log(`   ✅ Conditional mapping: ${salesforceField} = ${condition.then.value} (static value)`);
                  break;
                }
              }
            }
          }
        }
        
        // Apply the resolved value if found
        if (resolvedValue !== null && resolvedValue !== undefined) {
          businessRecord[salesforceField] = resolvedValue;
        } else {
          console.warn(`   ⚠️  No condition met for conditional mapping ${salesforceField}, field may be missing`);
        }
      });
      
      // Note: Name parsing is now handled via transformations in Mapping_Rules__c.transformations
      // Example: { "transformations": { "name": { "type": "splitName", "source": "name", "target": { "firstName": "FirstName", "lastName": "LastName" } } } }
      
      if (unmappedFields.length > 0) {
        console.log(`⚠️  Form fields not mapped to ${targetBusinessObject}:`, unmappedFields);
      }
      
      console.log(`📄 Business record data:`, JSON.stringify(businessRecord, null, 2));
      
      // Check if we have any fields to create
      if (Object.keys(businessRecord).length === 0) {
        console.error(`❌ No fields mapped for ${targetBusinessObject} - cannot create record`);
        console.error(`   Form fields available:`, Object.keys(formData));
        console.error(`   Expected mappings:`, fieldMappings);
        const errorResponse = fieldMappingMissingError(validatedFormId, targetBusinessObject, Object.keys(formData));
        return res.status(400).json(errorResponse);
      }
      
      try {
        // Explicitly ensure instanceUrl is set
        authConn.instanceUrl = authConn.instanceUrl;
        
        console.log(`🔍 Attempting to create ${targetBusinessObject} with data:`, JSON.stringify(businessRecord, null, 2));
        
        const businessResult = await authConn.sobject(targetBusinessObject).create(businessRecord);
        
        console.log(`🔍 Creation result:`, JSON.stringify(businessResult, null, 2));
        
        if (!businessResult.success) {
          console.error(`❌ Salesforce returned success=false:`, businessResult.errors);
          // Log error but continue to create Form_Submission__c for tracking
          console.error(`⚠️  Business record creation failed - continuing with Form_Submission__c creation`);
          // Don't throw - allow Form_Submission__c creation to proceed for tracking
        } else if (!businessResult.id) {
          console.error(`❌ No ID returned from creation! Full result:`, businessResult);
          // Log error but continue - no ID means no relationship can be created
          console.error(`⚠️  No business record ID - will skip relationship creation`);
        } else {
          // CRITICAL: Store the ID immediately after successful creation (before verification)
          // This ensures we have the ID even if verification fails
          const createdBusinessRecordId = businessResult.id;
          const createdBusinessRecordType = targetBusinessObject;
        
          console.log(`✅ Successfully created ${targetBusinessObject} record with ID: ${createdBusinessRecordId}`);
          console.log(`💾 Storing ID: ${createdBusinessRecordId} for relationship creation`);
          
          // Store in businessRecordIds IMMEDIATELY (before verification)
          businessRecordIds.push({
            id: createdBusinessRecordId,
            objectType: createdBusinessRecordType
          });
            console.log(`📊 businessRecordIds after storing ID:`, JSON.stringify(businessRecordIds, null, 2));
          
          // Now verify the record was actually created (non-blocking - we already have the ID)
          try {
            console.log(`🔍 Verifying created ${targetBusinessObject} record: ${createdBusinessRecordId}`);
            const verifyFields = Object.keys(businessRecord).join(', ');
            const verifyQuery = `SELECT Id, ${verifyFields} FROM ${targetBusinessObject} WHERE Id = '${createdBusinessRecordId}' LIMIT 1`;
            console.log(`📝 Verification query: ${verifyQuery}`);
            
            const verifyResult = await authConn.query(verifyQuery);
            
            if (verifyResult.records.length === 0) {
              console.warn(`⚠️  Verification warning: Record ${createdBusinessRecordId} not found in Salesforce! (but ID was returned, continuing anyway)`);
            } else {
              const verifiedRecord = verifyResult.records[0] as any;
              console.log(`✅ Verified ${targetBusinessObject} record exists:`, JSON.stringify(verifiedRecord, null, 2));
              
              // Verify that the data matches what we sent (to ensure we didn't just find a random existing record)
              let dataMatches = true;
              const mismatches: string[] = [];
              for (const [field, value] of Object.entries(businessRecord)) {
                if (verifiedRecord[field] !== value) {
                  dataMatches = false;
                  mismatches.push(`${field}: expected "${value}", got "${verifiedRecord[field]}"`);
                }
              }
              
              if (!dataMatches) {
                console.warn(`⚠️  Verification warning: Record data doesn't match!`);
                console.warn(`   Mismatches:`, mismatches);
                console.warn(`   Expected:`, businessRecord);
                console.warn(`   Actual:`, verifiedRecord);
                console.warn(`   Continuing anyway - record exists with ID: ${createdBusinessRecordId}`);
              }
            }
          } catch (verifyError: any) {
            // Verification failed, but we already have the ID from successful creation
            console.warn(`⚠️  Verification failed: ${verifyError.message}`);
            console.warn(`   Continuing anyway - record was created with ID: ${createdBusinessRecordId}`);
          }
          
          console.log(`✅ ${targetBusinessRecordType} record ID ${createdBusinessRecordId} stored and ready for relationship creation`);
      } catch (error: any) {
        console.error(`❌ Failed to create ${targetBusinessObject}:`, error.message);
        console.error(`   Full error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        if (error.errorCode) {
          console.error(`   Salesforce error code: ${error.errorCode}`);
        }
        if (error.errors) {
          console.error(`   Salesforce errors:`, error.errors);
        }
        if (error.response) {
          console.error(`   HTTP response:`, error.response);
        }
        console.error(`⚠️  ${targetBusinessObject} creation failed - will still create Form_Submission__c but no relationship will be created`);
        // Continue to create Form_Submission__c even if business object creation fails
        // This allows tracking of failed submissions
        // Note: businessRecordIds will be empty, so no relationship will be created
        // Log the error but don't fail the entire submission
      }
    }

    // STEP 2: Create Form_Submission__c record (ALWAYS created for tracking)
    console.log(`📝 Step 2: Creating Form_Submission__c record...`);
    
    const submissionRecord: Record<string, any> = {
      Form_Definition__c: formRecord.Id, // Required Master-Detail
      Form_Id__c: validatedFormId,
      Submission_Data__c: JSON.stringify(formData),
      Submitted_At__c: new Date().toISOString(),
      // Note: Status__c field may not exist - removed for compatibility
    };

    // Add Context ID and Session ID (required for tracking)
    if (contextId) {
      submissionRecord.Context_ID__c = contextId;
    }
    if (sessionId) {
      submissionRecord.Session_ID__c = sessionId;
    }

    console.log(`📄 Submission record data:`, JSON.stringify(submissionRecord, null, 2));
    
    // Check for duplicate Context_ID__c before creating (since it's unique and external ID)
    let submissionId: string | undefined = undefined;
    let existingSubmission = false;
    
    if (submissionRecord.Context_ID__c) {
      try {
        const existingQuery = `SELECT Id, Form_Id__c, Submitted_At__c FROM Form_Submission__c WHERE Context_ID__c = '${submissionRecord.Context_ID__c}' LIMIT 1`;
        const existingResult = await authConn.query(existingQuery);
        
        if (existingResult.records && existingResult.records.length > 0) {
          const existingRecord = existingResult.records[0] as any;
          submissionId = existingRecord.Id;
          existingSubmission = true;
          console.log(`⚠️  Duplicate submission detected - Context_ID__c already exists: ${submissionRecord.Context_ID__c}`);
          console.log(`   Using existing Form_Submission__c record: ${submissionId}`);
        }
      } catch (queryError: any) {
        console.warn(`⚠️  Could not check for duplicate Context_ID__c: ${queryError.message}`);
        // Continue with creation attempt
      }
    }
    
    // Only create if we didn't find an existing record
    if (!existingSubmission) {
      const submissionResult = await authConn.sobject('Form_Submission__c').create(submissionRecord);
      if (!submissionResult.success) {
        // Check if it's a duplicate error (in case the check above missed it)
        const isDuplicateError = submissionResult.errors?.some((err: any) => 
          typeof err === 'string' && (err.includes('duplicate') || err.includes('DUPLICATE') || err.includes('Context_ID__c'))
        ) || submissionResult.errors?.some((err: any) => 
          err?.message && (err.message.includes('duplicate') || err.message.includes('DUPLICATE') || err.message.includes('Context_ID__c'))
        );
        
        if (isDuplicateError && submissionRecord.Context_ID__c) {
          // Try to find the existing record
          try {
            const existingQuery = `SELECT Id, Form_Id__c, Submitted_At__c FROM Form_Submission__c WHERE Context_ID__c = '${submissionRecord.Context_ID__c}' LIMIT 1`;
            const existingResult = await authConn.query(existingQuery);
            
            if (existingResult.records && existingResult.records.length > 0) {
              const existingRecord = existingResult.records[0] as any;
              submissionId = existingRecord.Id;
              existingSubmission = true;
              console.log(`⚠️  Duplicate submission - found existing record: ${submissionId}`);
            } else {
              throw new Error(`Failed to create Form_Submission__c: ${submissionResult.errors?.map((e: any) => typeof e === 'string' ? e : e.message || JSON.stringify(e)).join(', ')}`);
            }
          } catch (queryError: any) {
            throw new Error(`Failed to create Form_Submission__c (duplicate Context_ID__c): ${submissionResult.errors?.map((e: any) => typeof e === 'string' ? e : e.message || JSON.stringify(e)).join(', ')}`);
          }
        } else {
          throw new Error(`Failed to create Form_Submission__c: ${submissionResult.errors?.map((e: any) => typeof e === 'string' ? e : e.message || JSON.stringify(e)).join(', ')}`);
        }
      } else {
        submissionId = submissionResult.id;
        console.log(`✅ Created Form_Submission__c record with ID: ${submissionId}`);
      }
    }
    
    // Ensure submissionId is set
    if (!submissionId) {
      throw new Error('Failed to create or find Form_Submission__c record - submissionId is missing');
    }

    // STEP 3: Create Form_Submission_Relationship__c record(s) for each business object
    const relationshipIds: string[] = [];
    let relationshipError: string | undefined = undefined;
    
    console.log(`\n🔍 STEP 3: Relationship Creation Check`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`   businessRecordIds.length: ${businessRecordIds.length}`);
    console.log(`   businessRecordIds:`, JSON.stringify(businessRecordIds, null, 2));
    console.log(`   submissionId: ${submissionId}`);
    
    // If this is a duplicate submission, check if relationships already exist
    if (existingSubmission && submissionId && businessRecordIds.length > 0) {
      try {
        console.log(`🔍 Checking for existing relationships for duplicate submission...`);
        const relationshipQuery = `SELECT Id, Related_Record_Id__c, Related_Object_Type__c FROM Form_Submission_Relationship__c WHERE Form_Submission__c = '${submissionId}'`;
        const existingRelationships = await authConn.query(relationshipQuery);
        
        if (existingRelationships.records && existingRelationships.records.length > 0) {
          const existingRelIds = existingRelationships.records.map((r: any) => r.Id);
          relationshipIds.push(...existingRelIds);
          console.log(`✅ Found ${existingRelIds.length} existing relationship(s) for this submission`);
          console.log(`   Relationship IDs: ${existingRelIds.join(', ')}`);
        } else {
          console.log(`⚠️  No existing relationships found - will attempt to create new ones`);
        }
      } catch (queryError: any) {
        console.warn(`⚠️  Could not check for existing relationships: ${queryError.message}`);
        // Continue to try creating relationships
      }
    }
    
    // CRITICAL: Verify we have BOTH IDs needed for the relationship
    if (!submissionId) {
      console.error(`❌ CRITICAL: submissionId is missing! Cannot create relationship without Form_Submission__c ID.`);
      relationshipError = 'submissionId is missing';
    } else if (businessRecordIds.length === 0) {
      console.error(`❌ CRITICAL: businessRecordIds is empty! Cannot create relationship without Lead/Contact ID.`);
      relationshipError = 'businessRecordIds is empty';
    }
    
    // Only create relationships if we don't already have them (and we have the IDs)
    if (submissionId && businessRecordIds.length > 0 && relationshipIds.length === 0) {
      console.log(`✅ Both IDs present: Submission ID = ${submissionId}, Business Records = ${businessRecordIds.length}`);
      
      console.log(`📝 Step 3: Creating ${businessRecordIds.length} relationship record(s)...`);
      
      const relationshipRecords = businessRecordIds.map((record) => {
        const relationshipRecord = {
          Form_Submission__c: submissionId,
          Related_Record_Id__c: record.id,
          Related_Object_Type__c: record.objectType,
        };
        console.log(`   Relationship record:`, JSON.stringify(relationshipRecord, null, 2));
        return relationshipRecord;
      });
      
      console.log(`📄 All relationship records (${relationshipRecords.length}):`, JSON.stringify(relationshipRecords, null, 2));
      
      try {
        // Verify connection before creating relationships
        if (!authConn.instanceUrl) {
          console.error('❌ authConn missing instanceUrl for relationship creation!');
          throw new Error('Salesforce connection missing instanceUrl');
        }
        
        console.log(`🔗 Creating relationships using instance URL: ${authConn.instanceUrl}`);
        console.log(`📋 Relationship records to create (${relationshipRecords.length}):`, JSON.stringify(relationshipRecords, null, 2));
        console.log(`🔍 Verifying relationship object exists...`);
        
        // First verify the object exists and we can describe it
        try {
          const relationshipDescribe = await authConn.describe('Form_Submission_Relationship__c');
          console.log(`✅ Form_Submission_Relationship__c object exists`);
          console.log(`   Label: ${relationshipDescribe.label}`);
          
          const allFields = relationshipDescribe.fields.map((f: any) => f.name);
          console.log(`   All fields:`, allFields.join(', '));
          console.log(`   Total fields: ${allFields.length}`);
          
          // Check if our required fields exist
          const requiredFieldNames = ['Form_Submission__c', 'Related_Record_Id__c', 'Related_Object_Type__c'];
          const missingFields = requiredFieldNames.filter(name => !allFields.includes(name));
          
          if (missingFields.length > 0) {
            console.error(`❌ MISSING FIELDS on Form_Submission_Relationship__c:`);
            console.error(`   Missing: ${missingFields.join(', ')}`);
            console.error(`   Available fields: ${allFields.join(', ')}`);
            console.error(`   ⚠️  ACTION REQUIRED: Deploy fields to Salesforce`);
            throw new Error(`Missing required fields on Form_Submission_Relationship__c: ${missingFields.join(', ')}. Available fields: ${allFields.join(', ')}`);
          }
          
          // Check required fields
          const requiredFields = relationshipDescribe.fields.filter((f: any) => !f.nillable && f.createable);
          console.log(`   Required fields:`, requiredFields.map((f: any) => f.name).join(', '));
          console.log(`   ✅ All required fields exist`);
        } catch (describeError: any) {
          console.error(`❌ Cannot describe Form_Submission_Relationship__c object:`, describeError.message);
          console.error(`   This means the object might not exist or we don't have permission`);
          throw new Error(`Form_Submission_Relationship__c object not accessible: ${describeError.message}`);
        }
        
        // Bulk create all relationships
        console.log(`📝 Attempting to create ${relationshipRecords.length} relationship record(s)...`);
        const relationshipResults = await authConn.sobject('Form_Submission_Relationship__c').create(relationshipRecords);
        
        console.log(`🔍 Relationship creation result:`, JSON.stringify(relationshipResults, null, 2));
        
        // Handle both single and array results
        const results = Array.isArray(relationshipResults) ? relationshipResults : [relationshipResults];
        
        console.log(`📊 Processing ${results.length} relationship result(s)...`);
        
        results.forEach((result: any, index: number) => {
          if (result.success && result.id) {
            relationshipIds.push(result.id);
            console.log(`✅ Created relationship ${index + 1}/${results.length} with ID: ${result.id}`);
          } else {
            const errorMsg = result.errors ? (Array.isArray(result.errors) ? result.errors.map((e: any) => typeof e === 'string' ? e : e.message || JSON.stringify(e)).join(', ') : String(result.errors)) : 'Unknown error';
            console.error(`❌ Failed to create relationship ${index + 1}/${results.length}`);
            console.error(`   Error: ${errorMsg}`);
            console.error(`   Full result:`, JSON.stringify(result, null, 2));
            console.error(`   Relationship record attempted:`, relationshipRecords[index]);
            relationshipError = relationshipError ? `${relationshipError}; ${errorMsg}` : errorMsg;
          }
        });
        
        if (relationshipIds.length > 0) {
          console.log(`✅ Successfully created ${relationshipIds.length} relationship(s):`, relationshipIds);
        } else {
          console.error(`❌ No relationships were created successfully`);
        }
        console.log(`═══════════════════════════════════════════════════════════\n`);
      } catch (error: any) {
        relationshipError = error.message || 'Unknown error';
        console.error(`\n❌ CRITICAL: Failed to create relationships!`);
        console.error(`═══════════════════════════════════════════════════════════`);
        console.error(`Error Message: ${error.message}`);
        console.error(`Error Name: ${error.name || 'N/A'}`);
        console.error(`Error Code: ${error.errorCode || 'N/A'}`);
        console.error(`\n📋 Relationship Records Attempted:`);
        console.error(JSON.stringify(relationshipRecords, null, 2));
        console.error(`\n📋 Context:`);
        console.error(`   Submission ID: ${submissionId}`);
        console.error(`   Business Record IDs:`, JSON.stringify(businessRecordIds, null, 2));
        console.error(`   Instance URL: ${authConn.instanceUrl}`);
        console.error(`\n🔍 Full Error Object:`);
        console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        
        // Check for common Salesforce errors
        if (error.errorCode) {
          console.error(`\n💡 Salesforce Error Code: ${error.errorCode}`);
          if (error.errorCode === 'INVALID_TYPE') {
            console.error(`   → Form_Submission_Relationship__c object might not exist or is not accessible`);
            console.error(`   → Verify object is deployed and broker has permission`);
          } else if (error.errorCode === 'REQUIRED_FIELD_MISSING') {
            console.error(`   → A required field is missing`);
            console.error(`   → Check Master-Detail field (Form_Submission__c) is populated`);
          } else if (error.errorCode === 'INVALID_FIELD') {
            console.error(`   → One of the fields doesn't exist`);
            console.error(`   → Verify field names match Salesforce metadata`);
          }
        }
        
        if (error.errors && Array.isArray(error.errors)) {
          console.error(`\n📋 Detailed Errors:`);
          error.errors.forEach((err: any, idx: number) => {
            console.error(`   Error ${idx + 1}:`, JSON.stringify(err, null, 2));
          });
        }
        
        if (error.response) {
          console.error(`\n📋 HTTP Response:`);
          console.error(`   Status: ${error.response.status || 'N/A'}`);
          console.error(`   Body:`, JSON.stringify(error.response.body || error.response, null, 2));
        }
        
        if (error.stack) {
          console.error(`\n📋 Stack Trace:`, error.stack);
        }
        console.error(`═══════════════════════════════════════════════════════════\n`);
        
        // Don't fail the whole submission if relationships fail
      }
    }

    // Build response with detailed debug info
    const response: any = {
      success: true,
      recordId: submissionId,
      businessRecordIds: businessRecordIds.map(r => ({ id: r.id, objectType: r.objectType })),
      relationshipIds: relationshipIds,
      contextId: contextId || null,
      message: existingSubmission 
        ? 'Form submission already exists (duplicate Context_ID__c) - using existing record' 
        : 'Form submitted successfully',
      isDuplicate: existingSubmission,
      debug: {
        businessRecordsCreated: businessRecordIds.length,
        relationshipsCreated: relationshipIds.length,
        relationshipAttempted: businessRecordIds.length > 0,
        existingSubmission: existingSubmission
      }
    };
    
    // Add warning if relationships were attempted but not created
    if (businessRecordIds.length > 0 && relationshipIds.length === 0) {
      const warningMsg = relationshipError || 'Lead was created but relationship record was not created. Check broker logs for errors.';
      response.warning = typeof warningMsg === 'string' ? warningMsg : JSON.stringify(warningMsg);
    }
    
    // Log form submission to database
    const durationMs = Date.now() - startTime;
    const leadId = businessRecordIds.length > 0 && businessRecordIds[0].objectType === 'Lead' 
      ? businessRecordIds[0].id 
      : undefined;
    
    logFormSubmission({
      formId: validatedFormId,
      contextId: contextId || undefined,
      submissionId,
      leadId,
      relationshipIds: relationshipIds.length > 0 ? relationshipIds : undefined,
      formData,
      mappingRules: mappings,
      businessRecordIds: businessRecordIds.length > 0 ? businessRecordIds : undefined,
      success: true,
      warningMessage: response.warning || undefined,
      errorMessage: relationshipError || undefined,
      durationMs
    });
    
    res.json(response);
  } catch (error: any) {
    console.error('❌ Error submitting form:', error);
    
    // Log failed submission
    const durationMs = Date.now() - startTime;
    logFormSubmission({
      formId: req.params.formId,
      contextId: req.body?.contextId,
      formData: req.body?.formData || req.body,
      success: false,
      errorMessage: error.message,
      durationMs
    });
    
    // Determine error type and return standardized error response
    let errorResponse;
    if (error.message?.includes('Salesforce') || error.errorCode || error.response?.status === 503) {
      // Salesforce-related error
      errorResponse = handleSalesforceError(error, 'submit form', {
        formId: req.params.formId,
        contextId: req.body?.contextId,
      });
    } else if (error.message?.includes('connection') || error.message?.includes('Connection')) {
      // Connection error
      errorResponse = salesforceConnectionError('submit form', {
        formId: req.params.formId,
        contextId: req.body?.contextId,
      });
    } else {
      // Generic internal error
      errorResponse = createErrorResponse(
        ErrorType.INTERNAL_ERROR,
        `Failed to submit form: ${req.params.formId}`,
        {
          formId: req.params.formId,
          contextId: req.body?.contextId,
        },
        error.message,
        'Check broker logs for detailed error information',
        [
          'Verify form definition exists in Salesforce',
          'Check Mapping_Rules__c configuration',
          'Verify Salesforce connection is available',
          'Review broker logs for detailed error stack trace',
        ]
      );
    }
    
    const statusCode = errorResponse.error.type === ErrorType.SALESFORCE_CONNECTION_ERROR ? 503 :
                       errorResponse.error.type === ErrorType.SALESFORCE_AUTH_ERROR ? 401 :
                       errorResponse.error.type === ErrorType.FORM_NOT_FOUND ? 404 :
                       errorResponse.error.type === ErrorType.VALIDATION_ERROR ? 400 : 500;
    return res.status(statusCode).json(errorResponse);
  }
});

export default router;


