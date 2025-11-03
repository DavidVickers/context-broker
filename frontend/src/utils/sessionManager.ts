/**
 * Session Manager
 * Handles session creation, storage, and Context ID management
 */

const SESSION_ID_KEY = 'context_broker_session_id';
const FORM_ID_KEY = 'context_broker_form_id';
const SESSION_EXPIRY_HOURS = 24;

export interface SessionInfo {
  sessionId: string;
  formId: string;
  contextId: string;
  expiresAt: Date;
}

/**
 * Generate a UUID v4
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Create Context ID from Form ID and Session ID
 */
export const createContextId = (formId: string, sessionId: string): string => {
  return `${formId}:${sessionId}`;
};

/**
 * Parse Context ID into Form ID and Session ID
 */
export const parseContextId = (contextId: string): { formId: string; sessionId: string } | null => {
  const parts = contextId.split(':');
  if (parts.length !== 2) {
    return null;
  }
  return {
    formId: parts[0],
    sessionId: parts[1],
  };
};

/**
 * Get or create session for a form
 */
export const getOrCreateSession = async (formId: string, apiBaseUrl: string): Promise<SessionInfo> => {
  // Check localStorage for existing session
  const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
  const storedFormId = localStorage.getItem(FORM_ID_KEY);

  // If we have a valid session for this form, reuse it
  if (storedSessionId && storedFormId === formId) {
    const sessionInfo: SessionInfo = {
      sessionId: storedSessionId,
      formId,
      contextId: createContextId(formId, storedSessionId),
      expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
    };

    // Verify session is still valid with server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${apiBaseUrl}/api/sessions/${storedSessionId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return sessionInfo;
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('Session validation failed, creating new session:', error);
      }
    }
  }

  // Create new session
  const sessionId = generateUUID();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${apiBaseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ formId, sessionId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();

    // Store in localStorage
    localStorage.setItem(SESSION_ID_KEY, data.sessionId);
    localStorage.setItem(FORM_ID_KEY, formId);

    return {
      sessionId: data.sessionId,
      formId,
      contextId: data.contextId,
      expiresAt: new Date(data.expiresAt),
    };
  } catch (error) {
    // Fallback to client-side only session if API fails
    console.warn('Session creation failed, using client-side only:', error);
    const contextId = createContextId(formId, sessionId);
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.setItem(FORM_ID_KEY, formId);

    return {
      sessionId,
      formId,
      contextId,
      expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
    };
  }
};

/**
 * Get current session info
 */
export const getCurrentSession = (formId?: string): SessionInfo | null => {
  const sessionId = localStorage.getItem(SESSION_ID_KEY);
  const storedFormId = localStorage.getItem(FORM_ID_KEY);

  if (!sessionId || !storedFormId) {
    return null;
  }

  // If formId provided, verify it matches
  if (formId && storedFormId !== formId) {
    return null;
  }

  return {
    sessionId,
    formId: storedFormId,
    contextId: createContextId(storedFormId, sessionId),
    expiresAt: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000),
  };
};

/**
 * Clear current session
 */
export const clearSession = (): void => {
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(FORM_ID_KEY);
};

/**
 * Update session form data on server (for auto-save)
 */
export const updateSessionData = async (
  sessionId: string,
  formData: Record<string, any>,
  apiBaseUrl: string
): Promise<void> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    await fetch(`${apiBaseUrl}/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ formData }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.warn('Failed to update session data:', error);
    }
    // Non-critical failure, continue
  }
};

export default {
  createContextId,
  parseContextId,
  getOrCreateSession,
  getCurrentSession,
  clearSession,
  updateSessionData,
};



