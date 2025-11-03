import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Logger database with 24-hour retention
const LOG_DB_PATH = path.join(__dirname, '../../data/broker-logs.db');
const RETENTION_HOURS = 24;

// Ensure data directory exists
const dataDir = path.dirname(LOG_DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(LOG_DB_PATH);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER,
    duration_ms INTEGER,
    request_body TEXT,
    response_body TEXT,
    error_message TEXT,
    context_id TEXT,
    form_id TEXT,
    user_agent TEXT,
    ip_address TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_timestamp ON api_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_path ON api_logs(path);
  CREATE INDEX IF NOT EXISTS idx_context_id ON api_logs(context_id);
  CREATE INDEX IF NOT EXISTS idx_form_id ON api_logs(form_id);
  CREATE INDEX IF NOT EXISTS idx_status_code ON api_logs(status_code);

  CREATE TABLE IF NOT EXISTS form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    form_id TEXT NOT NULL,
    context_id TEXT,
    submission_id TEXT,
    lead_id TEXT,
    relationship_ids TEXT,
    form_data TEXT,
    mapping_rules TEXT,
    business_record_ids TEXT,
    success INTEGER,
    error_message TEXT,
    warning_message TEXT,
    duration_ms INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_submission_timestamp ON form_submissions(timestamp);
  CREATE INDEX IF NOT EXISTS idx_submission_form_id ON form_submissions(form_id);
  CREATE INDEX IF NOT EXISTS idx_submission_context_id ON form_submissions(context_id);
  CREATE INDEX IF NOT EXISTS idx_submission_lead_id ON form_submissions(lead_id);
`);

// Cleanup old logs (run on initialization and periodically)
const cleanupOldLogs = () => {
  const cutoffTime = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  
  try {
    const apiResult = db.prepare('DELETE FROM api_logs WHERE timestamp < ?').run(cutoffTime);
    const submissionResult = db.prepare('DELETE FROM form_submissions WHERE timestamp < ?').run(cutoffTime);
    
    if (apiResult.changes > 0 || submissionResult.changes > 0) {
      console.log(`🧹 Cleaned up ${apiResult.changes} API logs and ${submissionResult.changes} form submissions older than ${RETENTION_HOURS} hours`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up old logs:', error);
  }
};

// Cleanup interval - stored to allow cleanup
let loggerCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start logger cleanup interval
 */
export const startLoggerCleanup = (): void => {
  if (loggerCleanupInterval) return; // Already running
  
  loggerCleanupInterval = setInterval(cleanupOldLogs, 60 * 60 * 1000);
};

/**
 * Stop logger cleanup interval
 */
export const stopLoggerCleanup = (): void => {
  if (loggerCleanupInterval) {
    clearInterval(loggerCleanupInterval);
    loggerCleanupInterval = null;
  }
};

// Run cleanup on startup
cleanupOldLogs();

// Start cleanup interval
startLoggerCleanup();

export interface LogApiRequest {
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  requestBody?: any;
  responseBody?: any;
  error?: Error;
  contextId?: string;
  formId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LogFormSubmission {
  formId: string;
  contextId?: string;
  submissionId?: string;
  leadId?: string;
  relationshipIds?: string[];
  formData?: any;
  mappingRules?: any;
  businessRecordIds?: Array<{ id: string; objectType: string }>;
  success: boolean;
  errorMessage?: string;
  warningMessage?: string;
  durationMs?: number;
}

// Log API request/response
export const logApiRequest = (log: LogApiRequest) => {
  try {
    const timestamp = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO api_logs (
        timestamp, method, path, status_code, duration_ms,
        request_body, response_body, error_message,
        context_id, form_id, user_agent, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      timestamp,
      log.method,
      log.path,
      log.statusCode || null,
      log.durationMs || null,
      log.requestBody ? JSON.stringify(log.requestBody) : null,
      log.responseBody ? JSON.stringify(log.responseBody) : null,
      log.error?.message || null,
      log.contextId || null,
      log.formId || null,
      log.userAgent || null,
      log.ipAddress || null
    );
  } catch (error) {
    console.error('❌ Error logging API request:', error);
  }
};

// Log form submission details
export const logFormSubmission = (log: LogFormSubmission) => {
  try {
    const timestamp = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO form_submissions (
        timestamp, form_id, context_id, submission_id, lead_id,
        relationship_ids, form_data, mapping_rules, business_record_ids,
        success, error_message, warning_message, duration_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      timestamp,
      log.formId,
      log.contextId || null,
      log.submissionId || null,
      log.leadId || null,
      log.relationshipIds ? JSON.stringify(log.relationshipIds) : null,
      log.formData ? JSON.stringify(log.formData) : null,
      log.mappingRules ? JSON.stringify(log.mappingRules) : null,
      log.businessRecordIds ? JSON.stringify(log.businessRecordIds) : null,
      log.success ? 1 : 0,
      log.errorMessage ? (typeof log.errorMessage === 'string' ? log.errorMessage : JSON.stringify(log.errorMessage)) : null,
      log.warningMessage ? (typeof log.warningMessage === 'string' ? log.warningMessage : JSON.stringify(log.warningMessage)) : null,
      log.durationMs || null
    );
  } catch (error) {
    console.error('❌ Error logging form submission:', error);
  }
};

// Query functions for diagnosis
export const queryLogs = {
  // Get recent API logs
  getRecentApiLogs: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM api_logs 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);
  },

  // Get API logs by path
  getApiLogsByPath: (pathPattern: string, limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM api_logs 
      WHERE path LIKE ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(`%${pathPattern}%`, limit);
  },

  // Get API logs by context ID
  getApiLogsByContextId: (contextId: string, limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM api_logs 
      WHERE context_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(contextId, limit);
  },

  // Get form submissions
  getFormSubmissions: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM form_submissions 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);
  },

  // Get form submissions by form ID
  getFormSubmissionsByFormId: (formId: string, limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM form_submissions 
      WHERE form_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(formId, limit);
  },

  // Get form submissions by context ID
  getFormSubmissionsByContextId: (contextId: string, limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM form_submissions 
      WHERE context_id = ?
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(contextId, limit);
  },

  // Get form submissions with failed relationships
  // Cases: 1) Lead created but no relationship, 2) Business record created but no relationship
  getFailedRelationships: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM form_submissions 
      WHERE (
        (lead_id IS NOT NULL AND (relationship_ids IS NULL OR relationship_ids = '[]'))
        OR (business_record_ids IS NOT NULL 
            AND business_record_ids != '[]' 
            AND business_record_ids != 'null'
            AND (relationship_ids IS NULL OR relationship_ids = '[]'))
      )
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);
  },

  // Get errors
  getErrors: (limit: number = 50) => {
    return db.prepare(`
      SELECT * FROM api_logs 
      WHERE status_code >= 400 OR error_message IS NOT NULL
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(limit);
  },

  // Get form submission details by ID
  getFormSubmissionById: (submissionId: string) => {
    return db.prepare(`
      SELECT * FROM form_submissions 
      WHERE submission_id = ?
      LIMIT 1
    `).get(submissionId);
  },
};

// Export database for advanced queries (typed as any to avoid type issues)
export const getDb = (): any => db;

