/**
 * Form Data Transformation Utility
 * 
 * Applies transformations to form data based on Mapping_Rules__c.transformations
 * 
 * Supported transformations:
 * - splitName: Split single "name" field into FirstName/LastName
 * - formatPhone: Format phone numbers
 * - formatDate: Format dates
 * - concat: Concatenate multiple fields
 */

/**
 * Apply transformation rules to form data
 * 
 * @param formData - Original form data
 * @param transformations - Transformation rules from Mapping_Rules__c.transformations
 * @returns Transformed form data
 */
export function applyTransformations(
  formData: Record<string, any>,
  transformations?: Record<string, any>
): Record<string, any> {
  if (!transformations || typeof transformations !== 'object') {
    return formData;
  }

  const transformed = { ...formData };

  // Apply each transformation
  for (const [targetField, transformationRule] of Object.entries(transformations)) {
    if (!transformationRule || typeof transformationRule !== 'object') {
      console.warn(`⚠️  Invalid transformation rule for ${targetField}`);
      continue;
    }

    const type = transformationRule.type;
    
    try {
      switch (type) {
        case 'splitName':
          // splitName returns an object with Salesforce field names (e.g., { FirstName: "John", LastName: "Doe" })
          // Merge these fields directly into transformed object
          const splitResult = applySplitNameTransformation(formData, transformationRule);
          if (splitResult && typeof splitResult === 'object') {
            Object.assign(transformed, splitResult);
          }
          break;
        case 'formatPhone':
          transformed[targetField] = applyFormatPhoneTransformation(formData, transformationRule);
          break;
        case 'formatDate':
          transformed[targetField] = applyFormatDateTransformation(formData, transformationRule);
          break;
        case 'concat':
          transformed[targetField] = applyConcatTransformation(formData, transformationRule);
          break;
        default:
          console.warn(`⚠️  Unknown transformation type: ${type} for field ${targetField}`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Failed to apply transformation ${type} to ${targetField}:`, error.message);
    }
  }

  return transformed;
}

/**
 * Split name transformation: Split single "name" field into FirstName/LastName
 * 
 * Transformation rule format:
 * {
 *   "type": "splitName",
 *   "source": "name",
 *   "target": {
 *     "firstName": "FirstName",
 *     "lastName": "LastName"
 *   },
 *   "delimiter": " " (optional, default: whitespace)
 * }
 */
function applySplitNameTransformation(
  formData: Record<string, any>,
  rule: any
): Record<string, string> | null {
  const source = rule.source || 'name';
  const target = rule.target || {};
  const delimiter = rule.delimiter || /\s+/;
  const firstNameField = target.firstName || 'FirstName';
  const lastNameField = target.lastName || 'LastName';

  const sourceValue = formData[source];
  if (!sourceValue || typeof sourceValue !== 'string') {
    return null;
  }

  const trimmed = sourceValue.trim();
  if (!trimmed) {
    return null;
  }

  // Split by delimiter (supports regex or string)
  const nameParts = typeof delimiter === 'string'
    ? trimmed.split(delimiter).filter((part: string) => part.length > 0)
    : trimmed.split(/\s+/).filter((part: string) => part.length > 0);

  if (nameParts.length === 0) {
    return null;
  }

  // If single word, only set LastName
  if (nameParts.length === 1) {
    return {
      [lastNameField]: nameParts[0],
    };
  }

  // Multiple words: first part(s) = FirstName, last = LastName
  return {
    [firstNameField]: nameParts.slice(0, -1).join(' '),
    [lastNameField]: nameParts[nameParts.length - 1],
  };
}

/**
 * Format phone transformation: Format phone numbers to standard format
 * 
 * Transformation rule format:
 * {
 *   "type": "formatPhone",
 *   "source": "phone",
 *   "target": "Phone",
 *   "format": "US" | "E164" | "NATIONAL" (optional, default: "US")
 * }
 */
function applyFormatPhoneTransformation(
  formData: Record<string, any>,
  rule: any
): string | null {
  const source = rule.source;
  const format = rule.format || 'US';

  const sourceValue = formData[source];
  if (!sourceValue) {
    return null;
  }

  // Remove all non-digit characters
  const digitsOnly = String(sourceValue).replace(/\D/g, '');

  if (digitsOnly.length === 0) {
    return null;
  }

  // Format based on type
  switch (format) {
    case 'E164':
      // E.164 format: +12345678901
      return digitsOnly.length === 11 && digitsOnly.startsWith('1')
        ? `+${digitsOnly}`
        : digitsOnly.length === 10
        ? `+1${digitsOnly}`
        : digitsOnly;
    
    case 'NATIONAL':
      // National format: (123) 456-7890
      if (digitsOnly.length === 10) {
        return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      }
      return digitsOnly;
    
    case 'US':
    default:
      // US format: (123) 456-7890 or same as NATIONAL
      if (digitsOnly.length === 10) {
        return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      }
      return digitsOnly;
  }
}

/**
 * Format date transformation: Format dates to Salesforce format
 * 
 * Transformation rule format:
 * {
 *   "type": "formatDate",
 *   "source": "date",
 *   "target": "Date__c",
 *   "inputFormat": "YYYY-MM-DD" (optional)
 *   "outputFormat": "YYYY-MM-DD" (optional, default: ISO 8601)
 * }
 */
function applyFormatDateTransformation(
  formData: Record<string, any>,
  rule: any
): string | null {
  const source = rule.source;
  const inputFormat = rule.inputFormat;
  const outputFormat = rule.outputFormat || 'ISO8601';

  const sourceValue = formData[source];
  if (!sourceValue) {
    return null;
  }

  try {
    const date = new Date(sourceValue);
    if (isNaN(date.getTime())) {
      return null;
    }

    // Return ISO 8601 format for Salesforce (YYYY-MM-DD)
    if (outputFormat === 'ISO8601' || outputFormat === 'YYYY-MM-DD') {
      return date.toISOString().split('T')[0];
    }

    return date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * Concatenate transformation: Concatenate multiple fields into one
 * 
 * Transformation rule format:
 * {
 *   "type": "concat",
 *   "sources": ["firstName", "lastName"],
 *   "target": "FullName",
 *   "separator": " " (optional, default: space)
 * }
 */
function applyConcatTransformation(
  formData: Record<string, any>,
  rule: any
): string | null {
  const sources = rule.sources || [];
  const separator = rule.separator || ' ';

  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  const values = sources
    .map((source: string) => formData[source])
    .filter((value: any) => value !== null && value !== undefined && value !== '');

  if (values.length === 0) {
    return null;
  }

  return values.join(separator);
}

