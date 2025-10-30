import React, { useState, useMemo } from 'react';
import { FormDefinition, FormField, FormSection, ConditionalRule } from '../services/api';
import './FormRenderer.css';

interface FormRendererProps {
  definition: FormDefinition;
  onSubmit: (data: Record<string, any>) => void;
  loading: boolean;
  initialData?: Record<string, any>; // Pre-populate form fields
}

const FormRenderer: React.FC<FormRendererProps> = ({ definition, onSubmit, loading, initialData }) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Normalize form definition: convert old format (fields) to new format (sections)
  const normalizedDefinition = useMemo(() => {
    if (definition.sections && definition.sections.length > 0) {
      // New format: sections already exist
      return definition;
    } else if (definition.fields && definition.fields.length > 0) {
      // Old format: flat fields array - convert to single section
      return {
        ...definition,
        sections: [{
          id: 'main',
          title: definition.title || definition.name || 'Form Fields',
          fields: definition.fields
        }]
      };
    }
    return definition;
  }, [definition]);

  // Check if conditional rule is satisfied
  const evaluateCondition = (rule: ConditionalRule, data: Record<string, any>): boolean => {
    const fieldValue = data[rule.field];
    
    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value;
      case 'notEquals':
        return fieldValue !== rule.value;
      case 'contains':
        return String(fieldValue || '').includes(String(rule.value || ''));
      case 'notContains':
        return !String(fieldValue || '').includes(String(rule.value || ''));
      case 'greaterThan':
        return Number(fieldValue) > Number(rule.value);
      case 'lessThan':
        return Number(fieldValue) < Number(rule.value);
      default:
        return false;
    }
  };

  // Check if field/section should be visible
  const isVisible = (conditions?: { visibility?: ConditionalRule[] }): boolean => {
    if (!conditions || !conditions.visibility || conditions.visibility.length === 0) {
      return true;
    }
    // All visibility rules must be satisfied (AND logic)
    return conditions.visibility.every(rule => evaluateCondition(rule, formData));
  };

  // Check if field is required (base required + conditional required)
  const isRequired = (field: FormField): boolean => {
    if (field.required) return true;
    
    if (field.conditions?.required && field.conditions.required.length > 0) {
      // At least one conditional required rule must be satisfied (OR logic)
      return field.conditions.required.some(rule => evaluateCondition(rule, formData));
    }
    
    return false;
  };

  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all fields in all visible sections
    normalizedDefinition.sections?.forEach(section => {
      if (!isVisible(section.conditions)) return;
      
      section.fields.forEach(field => {
        if (!isVisible(field.conditions)) return;
        
        const value = formData[field.name];

        // Required validation (base + conditional)
        if (isRequired(field) && (!value || value.toString().trim() === '')) {
          newErrors[field.name] = field.validation?.message || `${field.label} is required`;
          return;
        }

        // Email validation
        if (field.type === 'email' && value) {
          const emailRegex = field.validation?.pattern 
            ? new RegExp(field.validation.pattern)
            : /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.name] = field.validation?.message || 'Please enter a valid email address';
          }
        }

        // Number validation
        if (field.type === 'number' && value && isNaN(Number(value))) {
          newErrors[field.name] = field.validation?.message || 'Please enter a valid number';
        }

        // Pattern validation
        if (field.validation?.pattern && value) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            newErrors[field.name] = field.validation?.message || `${field.label} format is invalid`;
          }
        }

        // Length validation
        if (value && typeof value === 'string') {
          if (field.validation?.minLength && value.length < field.validation.minLength) {
            newErrors[field.name] = field.validation?.message || `${field.label} must be at least ${field.validation.minLength} characters`;
          }
          if (field.validation?.maxLength && value.length > field.validation.maxLength) {
            newErrors[field.name] = field.validation?.message || `${field.label} must be no more than ${field.validation.maxLength} characters`;
          }
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: FormField) => {
    // Skip rendering if field is not visible
    if (!isVisible(field.conditions)) {
      return null;
    }

    const value = formData[field.name] || '';
    const error = errors[field.name];
    const fieldRequired = isRequired(field);

    switch (field.type) {
      case 'textarea':
        return (
          <div key={field.name} className="form-field">
            <label>
              {field.label}
              {fieldRequired && <span className="required">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={fieldRequired}
              rows={4}
              className={error ? 'error' : ''}
              placeholder={field.placeholder}
              data-assist-field={`f:${field.name}`}
            />
            {error && <span className="field-error">{error}</span>}
          </div>
        );

      case 'select':
        const options = field.options || field.validation?.options || [];
        return (
          <div key={field.name} className="form-field">
            <label>
              {field.label}
              {isRequired(field) && <span className="required">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={isRequired(field)}
              className={error ? 'error' : ''}
              data-assist-field={`f:${field.name}`}
            >
              <option value="">Select an option</option>
              {options.map((opt: any) => {
                // Support both old format (string) and new format ({value, label})
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                return (
                  <option key={optValue} value={optValue}>{optLabel}</option>
                );
              })}
            </select>
            {error && <span className="field-error">{error}</span>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="form-field checkbox-field">
            <label>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              required={fieldRequired}
              data-assist-field={`f:${field.name}`}
            />
              {field.label}
              {fieldRequired && <span className="required">*</span>}
            </label>
            {error && <span className="field-error">{error}</span>}
          </div>
        );

      default:
        return (
          <div key={field.name} className="form-field">
            <label>
              {field.label}
              {fieldRequired && <span className="required">*</span>}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={fieldRequired}
              className={error ? 'error' : ''}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              data-assist-field={`f:${field.name}`}
            />
            {error && <span className="field-error">{error}</span>}
          </div>
        );
    }
  };

  const formTitle = normalizedDefinition.title || normalizedDefinition.name || 'Form';

  return (
    <div className="form-renderer">
      <h2>{formTitle}</h2>
      <form onSubmit={handleSubmit}>
        {normalizedDefinition.sections?.map(section => {
          // Skip rendering section if it's not visible
          if (!isVisible(section.conditions)) {
            return null;
          }

          return (
            <div key={section.id} className="form-section">
              <h3 className="form-section-title">{section.title}</h3>
              <div className="form-section-fields">
                {section.fields.map(renderField)}
              </div>
            </div>
          );
        })}
        <button 
          type="submit" 
          disabled={loading} 
          className="submit-button"
          data-assist-field="f:submitButton"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default FormRenderer;

