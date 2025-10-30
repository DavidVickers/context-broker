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
 * Create a new session
 */
export const createSession = (formId: string, sessionId?: string): SessionData => {
  const id = sessionId || generateSessionId();
  const startTime = new Date();
  const expiresAt = new Date(startTime.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const session: SessionData = {
    sessionId: id,
    formId,
    contextId: createContextId(formId, id),
    startTime,
    lastActivity: startTime,
    expiresAt,
    formData: {},
    agentContext: {},
  };

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

// Run cleanup every hour
setInterval(() => {
  const deleted = cleanupExpiredSessions();
  if (deleted > 0) {
    console.log(`Cleaned up ${deleted} expired sessions`);
  }
}, 60 * 60 * 1000);

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
};


