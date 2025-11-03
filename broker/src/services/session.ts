import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  sessionId: string;
  formId: string;
  contextId: string;
  startTime: Date;
  lastActivity: Date;
  formData?: Record<string, any>;
  agentContext?: Record<string, any>;
  expiresAt: Date;
}

// In-memory session store (use Redis in production)
const sessions = new Map<string, SessionData>();

// Session expiration time: 24 hours
const SESSION_EXPIRY_HOURS = 24;

/**
 * Generate a new session ID
 */
export const generateSessionId = (): string => {
  return uuidv4();
};

/**
 * Create Context ID from Form ID and Session ID
 * Format: {formId}:{sessionId}
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
 * Creates a new session for form interactions with context preservation.
 * 
 * This function initializes a session that tracks user interactions with a specific form.
 * Sessions are stored in-memory (should be migrated to Redis in production for scalability)
 * and automatically expire after 24 hours. Each session maintains form data and agent
 * conversation context, enabling the agent to provide personalized assistance.
 * 
 * **Why this matters**: Sessions enable context preservation across async operations,
 * allowing the agent to remember previous form inputs and conversation history even
 * when the user navigates away or submits the form multiple times.
 * 
 * **Performance Note**: Sessions are stored in a Map for O(1) lookup, but in-memory
 * storage means sessions are lost on server restart. For production, use Redis with
 * TTL matching SESSION_EXPIRY_HOURS.
 * 
 * **Memory Management**: Sessions are cleaned up automatically via the cleanup interval,
 * but explicit session deletion should be called when sessions are no longer needed
 * to prevent unbounded memory growth.
 * 
 * @param formId - The form identifier (e.g., 'contact-form-v1', 'test-drive-form').
 *   Must match the Form_Id__c value in Salesforce Form_Definition__c custom object.
 *   Used to construct the Context ID: `{formId}:{sessionId}`.
 * 
 * @param sessionId - Optional existing session ID (UUID v4 format).
 *   If provided, reuses the given session ID instead of generating a new one.
 *   **Use case**: Client-side session persistence when the frontend already has a
 *   session ID from localStorage and wants to continue an existing session.
 *   If omitted, a new UUID v4 is automatically generated.
 * 
 * @returns SessionData object containing:
 *   - `sessionId`: Unique identifier for this session (UUID v4)
 *   - `formId`: The form identifier this session is associated with
 *   - `contextId`: Composite identifier `{formId}:{sessionId}` used for tracking
 *   - `startTime`: Timestamp when session was created
 *   - `lastActivity`: Timestamp of last activity (updated on each access)
 *   - `expiresAt`: Timestamp when session expires (24 hours from creation)
 *   - `formData`: Empty object initialized for storing form field values
 *   - `agentContext`: Empty object initialized for storing agent conversation data
 * 
 * @throws Never throws directly, but returns invalid session if formId is empty string.
 *   **Edge case**: If formId is empty, contextId will be `:{sessionId}` which may cause
 *   issues downstream. Callers should validate formId before calling this function.
 * 
 * @example
 * // Create new session with auto-generated session ID
 * const session = createSession('contact-form-v1');
 * console.log(session.contextId); // 'contact-form-v1:550e8400-e29b-41d4-a716-446655440000'
 * console.log(session.expiresAt); // Date 24 hours from now
 * 
 * @example
 * // Create session with existing session ID (session restoration)
 * const existingSessionId = '550e8400-e29b-41d4-a716-446655440000';
 * const restoredSession = createSession('contact-form-v1', existingSessionId);
 * console.log(restoredSession.sessionId === existingSessionId); // true
 * 
 * @example
 * // Session lifecycle: Create → Use → Auto-expire
 * const session = createSession('test-drive-form');
 * // Session stored in in-memory Map
 * const retrieved = getSession(session.sessionId);
 * // After 24 hours, session automatically expires and is cleaned up
 */
export const createSession = (formId: string, sessionId?: string): SessionData => {
  // Generate or use provided session ID
  // Why: Allows session restoration from client-side localStorage if user returns
  const id = sessionId || generateSessionId();
  
  // Capture session start time for expiration tracking
  // Why: Need accurate timestamp to calculate expiration (24 hours from creation)
  const startTime = new Date();
  
  // Calculate expiration time: 24 hours from creation
  // Why: Matches SESSION_EXPIRY_HOURS constant - provides reasonable session lifetime
  //      while preventing stale sessions from consuming memory indefinitely
  // Performance: Date arithmetic is O(1) - negligible overhead
  const expiresAt = new Date(startTime.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  // Initialize session data structure
  // Why: Empty objects for formData/agentContext allow for incremental updates
  //      without requiring all data upfront (supports progressive form filling)
  const session: SessionData = {
    sessionId: id,
    formId,
    contextId: createContextId(formId, id), // Construct Context ID: {formId}:{sessionId}
    startTime,
    lastActivity: startTime, // Initialize to start time (will be updated on access)
    expiresAt,
    formData: {}, // Empty initially - populated as user fills form
    agentContext: {}, // Empty initially - populated during agent conversations
  };

  // Store session in in-memory Map for O(1) lookup
  // Memory: Map grows with each session - cleaned up via cleanupExpiredSessions()
  // Production: Should use Redis with TTL instead of in-memory Map
  sessions.set(id, session);
  
  return session;
};

/**
 * Get session by Session ID
 */
export const getSession = (sessionId: string): SessionData | null => {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if expired
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  // Update last activity
  session.lastActivity = new Date();
  return session;
};

/**
 * Get session by Context ID
 */
export const getSessionByContextId = (contextId: string): SessionData | null => {
  const parsed = parseContextId(contextId);
  if (!parsed) {
    return null;
  }
  return getSession(parsed.sessionId);
};

/**
 * Update session data
 */
export const updateSession = (sessionId: string, updates: Partial<SessionData>): SessionData | null => {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  Object.assign(session, updates);
  session.lastActivity = new Date();

  sessions.set(sessionId, session);
  return session;
};

/**
 * Update session form data
 */
export const updateSessionFormData = (sessionId: string, formData: Record<string, any>): SessionData | null => {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  session.formData = { ...session.formData, ...formData };
  session.lastActivity = new Date();

  sessions.set(sessionId, session);
  return session;
};

/**
 * Update session agent context
 */
export const updateSessionAgentContext = (sessionId: string, agentContext: Record<string, any>): SessionData | null => {
  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  session.agentContext = { ...session.agentContext, ...agentContext };
  session.lastActivity = new Date();

  sessions.set(sessionId, session);
  return session;
};

/**
 * Delete session
 */
export const deleteSession = (sessionId: string): boolean => {
  return sessions.delete(sessionId);
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = (): number => {
  const now = new Date();
  let deleted = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
      deleted++;
    }
  }

  return deleted;
};

/**
 * Validate Context ID format
 */
export const validateContextId = (contextId: string): boolean => {
  const parsed = parseContextId(contextId);
  if (!parsed) {
    return false;
  }

  // Validate Session ID is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(parsed.sessionId);
};

// Cleanup interval - stored to allow cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start session cleanup interval
 */
export const startSessionCleanup = (): void => {
  if (cleanupInterval) return; // Already running
  
  cleanupInterval = setInterval(() => {
    const deleted = cleanupExpiredSessions();
    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} expired sessions`);
    }
  }, 60 * 60 * 1000);
};

/**
 * Stop session cleanup interval
 */
export const stopSessionCleanup = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

// Start cleanup on module load
startSessionCleanup();

export default {
  generateSessionId,
  createContextId,
  parseContextId,
  createSession,
  getSession,
  getSessionByContextId,
  updateSession,
  updateSessionFormData,
  updateSessionAgentContext,
  deleteSession,
  cleanupExpiredSessions,
  validateContextId,
  startSessionCleanup,
  stopSessionCleanup,
};



