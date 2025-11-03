/**
 * Standardized Error Response Utility
 * 
 * Provides consistent error response format across all API routes with:
 * - Error type classification
 * - Clear error messages with actionable guidance
 * - Error codes for programmatic handling
 * - Detailed context for debugging
 */

/**
 * Error type enumeration for categorizing failures
 */
export enum ErrorType {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_CONTEXT_ID = 'INVALID_CONTEXT_ID',
  INVALID_FORM_ID = 'INVALID_FORM_ID',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  
  // Not found errors (404)
  FORM_NOT_FOUND = 'FORM_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  
  // API connectivity errors (502, 503)
  SALESFORCE_API_ERROR = 'SALESFORCE_API_ERROR',
  SALESFORCE_CONNECTION_ERROR = 'SALESFORCE_CONNECTION_ERROR',
  SALESFORCE_AUTH_ERROR = 'SALESFORCE_AUTH_ERROR',
  SALESFORCE_QUERY_ERROR = 'SALESFORCE_QUERY_ERROR',
  SALESFORCE_CREATE_ERROR = 'SALESFORCE_CREATE_ERROR',
  SALESFORCE_UPDATE_ERROR = 'SALESFORCE_UPDATE_ERROR',
  SALESFORCE_PERMISSION_ERROR = 'SALESFORCE_PERMISSION_ERROR',
  
  // Internal errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  
  // Authentication errors (401)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

/**
 * Standardized error response interface
 */
export interface ErrorResponse {
  error: {
    type: ErrorType;
    code: string;
    message: string;
    details?: string;
    context?: {
      formId?: string;
      sessionId?: string;
      contextId?: string;
      recordId?: string;
      objectType?: string;
      field?: string;
      [key: string]: any;
    };
    guidance?: string;
    troubleshooting?: string[];
    timestamp: string;
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  type: ErrorType,
  message: string,
  context?: Record<string, any>,
  details?: string,
  guidance?: string,
  troubleshooting?: string[]
): ErrorResponse {
  return {
    error: {
      type,
      code: type, // Use enum value as code
      message,
      ...(details && { details }),
      ...(context && { context }),
      ...(guidance && { guidance }),
      ...(troubleshooting && troubleshooting.length > 0 && { troubleshooting }),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Salesforce API error handler - categorizes Salesforce errors
 */
export function handleSalesforceError(error: any, operation: string, context?: Record<string, any>): ErrorResponse {
  const errorMessage = error.message || 'Unknown Salesforce error';
  const errorCode = error.errorCode || 'UNKNOWN';
  const statusCode = error.response?.status || 500;
  
  // Determine error type based on error code and status
  let errorType: ErrorType;
  let guidance: string;
  const troubleshooting: string[] = [];
  
  // Authentication/Authorization errors
  if (errorCode === 'INVALID_LOGIN' || errorCode === 'INVALID_CLIENT' || statusCode === 401) {
    errorType = ErrorType.SALESFORCE_AUTH_ERROR;
    guidance = 'Salesforce authentication failed. Check broker credentials and OAuth configuration.';
    troubleshooting.push('Verify SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env');
    troubleshooting.push('Check OAuth Connected App settings in Salesforce');
    troubleshooting.push('Ensure service account has valid refresh token');
    troubleshooting.push('Try re-authenticating: /oauth/authorize?contextId=service_account');
  }
  // Permission errors
  else if (errorCode === 'INSUFFICIENT_ACCESS' || errorCode === 'INVALID_FIELD' || statusCode === 403) {
    errorType = ErrorType.SALESFORCE_PERMISSION_ERROR;
    guidance = `Insufficient permissions to ${operation} in Salesforce.`;
    troubleshooting.push('Verify service account profile has required object/field permissions');
    troubleshooting.push('Check Field-Level Security (FLS) settings for referenced fields');
    troubleshooting.push('Ensure service account has Read/Edit access to Form_Definition__c');
    if (context?.objectType) {
      troubleshooting.push(`Verify service account has Create/Edit access to ${context.objectType}`);
    }
  }
  // Query errors
  else if (operation.includes('query') || errorCode === 'INVALID_QUERY_LOCATOR' || errorCode === 'MALFORMED_QUERY') {
    errorType = ErrorType.SALESFORCE_QUERY_ERROR;
    guidance = `Salesforce query failed: ${errorMessage}`;
    troubleshooting.push('Verify object and field names exist in Salesforce');
    troubleshooting.push('Check SOQL syntax for errors');
    troubleshooting.push('Ensure service account has Read access to queried objects');
  }
  // Create/Update errors
  else if (operation.includes('create') && (errorCode === 'REQUIRED_FIELD_MISSING' || errorCode === 'INVALID_FIELD_FOR_INSERT')) {
    errorType = ErrorType.SALESFORCE_CREATE_ERROR;
    guidance = `Failed to create record in Salesforce: ${errorMessage}`;
    troubleshooting.push('Check Mapping_Rules__c field mappings are correct');
    troubleshooting.push('Verify required fields are included in fieldMappings');
    troubleshooting.push('Ensure mapped fields exist and are accessible');
    if (context?.objectType) {
      troubleshooting.push(`Verify ${context.objectType} object exists and service account has Create permission`);
    }
  }
  // Connection errors
  else if (errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT' || statusCode === 502 || statusCode === 503) {
    errorType = ErrorType.SALESFORCE_CONNECTION_ERROR;
    guidance = 'Cannot connect to Salesforce API. Check network connectivity and Salesforce instance status.';
    troubleshooting.push('Verify SALESFORCE_LOGIN_URL is correct (login.salesforce.com or test.salesforce.com)');
    troubleshooting.push('Check network connectivity to Salesforce');
    troubleshooting.push('Verify Salesforce instance is not down (check status.salesforce.com)');
    troubleshooting.push('Ensure firewall/proxy allows connections to Salesforce');
  }
  // Generic Salesforce API error
  else {
    errorType = ErrorType.SALESFORCE_API_ERROR;
    guidance = `Salesforce API error during ${operation}: ${errorMessage}`;
    troubleshooting.push(`Salesforce error code: ${errorCode}`);
    troubleshooting.push('Check Salesforce API status and limits');
    troubleshooting.push('Review broker logs for detailed error information');
  }
  
  return createErrorResponse(
    errorType,
    `Salesforce ${operation} failed`,
    {
      ...context,
      salesforceErrorCode: errorCode,
      salesforceStatusCode: statusCode,
    },
    errorMessage,
    guidance,
    troubleshooting
  );
}

/**
 * Form not found error
 */
export function formNotFoundError(formId: string, additionalContext?: Record<string, any>): ErrorResponse {
  return createErrorResponse(
    ErrorType.FORM_NOT_FOUND,
    `Form definition not found: ${formId}`,
    {
      formId,
      ...additionalContext,
    },
    `No Form_Definition__c record found with Form_Id__c = '${formId}' or Name = '${formId}'`,
    'Create a Form_Definition__c record in Salesforce with the specified Form_Id__c, or check the formId for typos.',
    [
      `Verify Form_Definition__c record exists with Form_Id__c = '${formId}'`,
      'Check Form_Definition__c.Active__c = true',
      'Ensure Form_Id__c matches exactly (case-sensitive)',
      'Verify service account has Read access to Form_Definition__c object',
      'Check broker logs for Salesforce query errors',
    ]
  );
}

/**
 * Salesforce connection unavailable error
 */
export function salesforceConnectionError(operation: string, additionalContext?: Record<string, any>): ErrorResponse {
  return createErrorResponse(
    ErrorType.SALESFORCE_CONNECTION_ERROR,
    `Salesforce connection unavailable for ${operation}`,
    {
      ...additionalContext,
    },
    'No valid Salesforce connection could be established',
    'Ensure Salesforce credentials are configured and service account is authenticated.',
    [
      'Verify SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env',
      'Complete OAuth flow: /oauth/authorize?contextId=service_account',
      'Check broker logs for authentication errors',
      'Verify service account has valid refresh token stored',
      'Try re-initializing Salesforce connection',
    ]
  );
}

/**
 * Validation error
 */
export function validationError(field: string, message: string, value?: any): ErrorResponse {
  return createErrorResponse(
    ErrorType.VALIDATION_ERROR,
    `Validation failed for ${field}: ${message}`,
    {
      field,
      value,
    },
    message,
    `Provide a valid value for ${field} that meets the validation requirements.`,
  );
}

/**
 * Context ID validation error
 */
export function invalidContextIdError(contextId: string, reason: string): ErrorResponse {
  return createErrorResponse(
    ErrorType.INVALID_CONTEXT_ID,
    `Invalid Context ID format: ${contextId}`,
    {
      contextId,
      reason,
    },
    `Context ID must be in format 'formId:sessionId' where sessionId is a valid UUID v4`,
    'Generate a new Context ID with format {formId}:{uuid}',
    [
      'Context ID format: {formId}:{uuid}',
      'Example: "contact-form:550e8400-e29b-41d4-a716-446655440000"',
      'Ensure sessionId is a valid UUID v4',
      'Check formId matches the form you are submitting to',
    ]
  );
}

/**
 * Session not found error
 */
export function sessionNotFoundError(sessionId: string, contextId?: string): ErrorResponse {
  return createErrorResponse(
    ErrorType.SESSION_NOT_FOUND,
    `Session not found or expired: ${sessionId}`,
    {
      sessionId,
      ...(contextId && { contextId }),
    },
    'Session may have expired (24-hour TTL) or was never created',
    'Create a new session by calling POST /api/sessions with your formId',
    [
      'Sessions expire after 24 hours of inactivity',
      'Create a new session if the existing one expired',
      'Verify sessionId was generated correctly on form load',
      'Check broker session storage (should use Redis in production)',
    ]
  );
}

/**
 * Mapping rules parsing error
 */
export function mappingRulesParseError(formId: string, error: any): ErrorResponse {
  return createErrorResponse(
    ErrorType.PARSING_ERROR,
    `Failed to parse Mapping_Rules__c for form: ${formId}`,
    {
      formId,
      parseError: error.message,
    },
    `Mapping_Rules__c contains invalid JSON or malformed mapping rules`,
    'Fix the JSON syntax in Form_Definition__c.Mapping_Rules__c field',
    [
      'Verify Mapping_Rules__c is valid JSON',
      'Check for missing quotes, brackets, or commas',
      'Ensure fieldMappings object structure is correct',
      'Validate conditionalMappings format if used',
      'Test JSON with a JSON validator tool',
    ]
  );
}

/**
 * Field mapping missing error
 */
export function fieldMappingMissingError(formId: string, targetObject: string, unmappedFields: string[]): ErrorResponse {
  return createErrorResponse(
    ErrorType.CONFIGURATION_ERROR,
    `Missing field mappings for form: ${formId}`,
    {
      formId,
      targetObject,
      unmappedFields,
    },
    `Form fields [${unmappedFields.join(', ')}] have no mapping to ${targetObject} fields`,
    `Add field mappings to Form_Definition__c.Mapping_Rules__c.fieldMappings for the unmapped fields`,
    [
      `Update Mapping_Rules__c with mappings for: ${unmappedFields.join(', ')}`,
      `Verify ${targetObject} has corresponding fields`,
      'Check Field-Level Security allows service account to write to mapped fields',
      'Ensure field API names are correct (case-sensitive)',
    ]
  );
}

