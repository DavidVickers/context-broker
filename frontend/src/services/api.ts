import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BROKER_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout to prevent indefinite blocking
  headers: {
    'Content-Type': 'application/json',
  },
});

// Support both old format (flat fields) and new format (sections)
export interface FormDefinition {
  formId: string;
  name?: string; // Optional for backward compatibility
  title?: string; // New format
  fields?: FormField[]; // Old format: flat fields array
  sections?: FormSection[]; // New format: sections with fields
  mappings?: {
    salesforceObject: string;
    fieldMappings: Record<string, string>;
  };
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
  conditions?: ConditionalLogic;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    message?: string;
    minLength?: number;
    maxLength?: number;
    [key: string]: any;
  };
  options?: FormOption[]; // For select fields: {value, label}
  conditions?: ConditionalLogic; // Conditional visibility and required
}

export interface FormOption {
  value: string;
  label: string;
}

export interface ConditionalLogic {
  visibility?: ConditionalRule[];
  required?: ConditionalRule[];
}

export interface ConditionalRule {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan';
  value: any;
}

/**
 * Extract error message from standardized error response
 */
const extractErrorMessage = (errorResponse: any): string => {
  // Handle standardized error response format: { error: { userMessage, message, ... } }
  if (errorResponse?.error?.userMessage) {
    return errorResponse.error.userMessage;
  }
  if (errorResponse?.error?.message) {
    return errorResponse.error.message;
  }
  // Fallback for old format or non-standard errors
  if (typeof errorResponse === 'string') {
    return errorResponse;
  }
  if (errorResponse?.error && typeof errorResponse.error === 'string') {
    return errorResponse.error;
  }
  return 'An unexpected error occurred';
};

export const getFormDefinition = async (formId: string): Promise<FormDefinition> => {
  try {
    const response = await api.get(`/api/forms/${formId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const errorMsg = extractErrorMessage(error.response.data);
      throw new Error(errorMsg);
    }
    throw new Error('Network error: Could not connect to broker API');
  }
};

export const submitForm = async (
  formId: string,
  formData: Record<string, any>,
  contextId?: string
): Promise<{ success: boolean; recordId?: string; contextId?: string; message: string }> => {
  try {
    const payload = contextId
      ? { contextId, formData }
      : formData;

    const response = await api.post(`/api/forms/${formId}/submit`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const errorMsg = extractErrorMessage(error.response.data);
      throw new Error(errorMsg);
    }
    throw new Error('Network error: Could not connect to broker API');
  }
};

export const queryAgent = async (
  formId: string,
  contextId: string,
  query: string,
  fieldName?: string
): Promise<{ response: string; suggestions?: any[]; validation?: any }> => {
  try {
    const response = await api.post(`/api/forms/${formId}/agent/query`, {
      contextId,
      query,
      fieldName,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const errorMsg = extractErrorMessage(error.response.data);
      throw new Error(errorMsg);
    }
    throw new Error('Network error: Could not connect to broker API');
  }
};

export default api;

