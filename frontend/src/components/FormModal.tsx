import React, { useState, useEffect } from 'react';
import { useModal } from '../hooks/useModal';
import { getFormDefinition, submitForm, FormDefinition } from '../services/api';
import { getOrCreateSession } from '../utils/sessionManager';
import FormRenderer from './FormRenderer';
import './FormModal.css';

const API_BASE_URL = process.env.REACT_APP_BROKER_API_URL || 'http://localhost:3001';

interface FormModalProps {
  formId: string;
  modalId: string;
  title?: string;
  triggerButton?: React.ReactNode;
  onSuccess?: (data: { submissionId?: string; contextId: string; message: string }) => void;
  onError?: (error: string) => void;
  itemContext?: {
    itemId?: string;
    itemMetadata?: Record<string, any>;
  };
}

const FormModal: React.FC<FormModalProps> = ({
  formId,
  modalId,
  title,
  triggerButton,
  onSuccess,
  onError,
  itemContext,
}) => {
  const { isOpen, open, close, modalRef } = useModal({ 
    modalId,
    autoFocus: true,
    restoreFocus: true,
  });
  
  const [formDefinition, setFormDefinition] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);

  // Load form definition from broker when modal opens
  useEffect(() => {
    if (isOpen && !formDefinition && !loading) {
      loadFormDefinition();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Create session when form definition loads
  useEffect(() => {
    if (formDefinition && !contextId && !loading) {
      initializeSession();
    }
  }, [formDefinition]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFormDefinition = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const definition = await getFormDefinition(formId);
      setFormDefinition(definition);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load form definition';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeSession = async () => {
    if (!formDefinition) return;

    try {
      const session = await getOrCreateSession(formId, API_BASE_URL);
      setContextId(session.contextId);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      // Continue without session (form will still work, but agent context won't be maintained)
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    if (!contextId || !formDefinition) {
      setError('Form not ready. Please wait...');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Merge item context into form data if provided
      const finalFormData = itemContext?.itemMetadata 
        ? { ...formData, ...itemContext.itemMetadata }
        : formData;

      const result = await submitForm(formId, finalFormData, contextId);
      
      if (result.success) {
        if (onSuccess) {
          onSuccess({
            submissionId: result.recordId,
            contextId,
            message: result.message || 'Form submitted successfully',
          });
        }
        close();
        // Reset form state
        setFormDefinition(null);
        setContextId(null);
      } else {
        throw new Error(result.message || 'Form submission failed');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to submit form';
      setError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {triggerButton && (
        <div onClick={open}>
          {triggerButton}
        </div>
      )}
      
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="form-modal-overlay"
        hidden={!isOpen}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
        data-assist-modal={modalId}
      >
        <div className="form-modal-content">
          <div className="form-modal-header">
            <h2 id={`${modalId}-title`}>
              {title || formDefinition?.title || formDefinition?.name || 'Form'}
            </h2>
            <button
              onClick={close}
              className="form-modal-close"
              aria-label="Close modal"
              data-assist-field="f:closeModal"
            >
              ×
            </button>
          </div>

          <div className="form-modal-body">
            {loading && (
              <div className="form-modal-loading">
                <p>Loading form...</p>
              </div>
            )}

            {error && !loading && (
              <div className="form-modal-error">
                <p>{error}</p>
                <button onClick={loadFormDefinition}>Retry</button>
              </div>
            )}

            {formDefinition && !loading && contextId && (
              <FormRenderer
                definition={formDefinition}
                onSubmit={handleSubmit}
                loading={submitting}
                initialData={itemContext?.itemMetadata}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FormModal;

