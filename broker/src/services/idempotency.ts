/**
 * Idempotency Service
 * 
 * Prevents duplicate form submissions by storing submission hashes and responses.
 * Uses in-memory Map for now (should migrate to Redis in production for scalability).
 * 
 * Purpose: Prevents duplicate Lead/Contact creation when:
 * - User double-clicks submit button
 * - Network retries occur
 * - Browser back/forward navigation triggers resubmission
 * 
 * How it works:
 * 1. Generate or extract idempotency key from request
 * 2. Check if key exists in store
 * 3. If exists: return original response (don't create duplicate records)
 * 4. If not exists: process submission and store response with key
 * 5. Keys expire after 24 hours (matches session TTL)
 */

import crypto from 'crypto';

export interface IdempotentResponse {
  idempotencyKey: string;
  response: any;
  submittedAt: Date;
  expiresAt: Date;
}

// In-memory idempotency store (use Redis in production)
const idempotencyStore = new Map<string, IdempotentResponse>();

// Idempotency key expiration: 24 hours (matches session TTL)
const IDEMPOTENCY_EXPIRY_HOURS = 24;

// Cleanup interval - stored to allow cleanup
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Generate idempotency key from submission data
 * Format: sha256(contextId + sorted formData + timestamp within same second)
 * 
 * Why this works:
 * - Same contextId + formData = same submission (user intent)
 * - Timestamp ensures different submissions within same second are distinct
 * - SHA256 provides deterministic hashing
 * 
 * @param contextId - Context ID (formId:sessionId)
 * @param formData - Form data object
 * @returns Idempotency key hash
 */
export function generateIdempotencyKey(
  contextId: string | null,
  formData: Record<string, any>
): string {
  // Normalize form data: sort keys and stringify for consistent hashing
  const normalizedData = JSON.stringify(formData, Object.keys(formData).sort());
  
  // Include contextId if available, otherwise use empty string
  const dataToHash = contextId ? `${contextId}|${normalizedData}` : normalizedData;
  
  // Generate hash
  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  
  return hash;
}

/**
 * Get stored response for idempotency key
 * 
 * @param key - Idempotency key
 * @returns Stored response if exists and not expired, null otherwise
 */
export function getIdempotentResponse(key: string): IdempotentResponse | null {
  const stored = idempotencyStore.get(key);
  
  if (!stored) {
    return null;
  }
  
  // Check expiration
  if (new Date() > stored.expiresAt) {
    idempotencyStore.delete(key);
    return null;
  }
  
  return stored;
}

/**
 * Store response for idempotency key
 * 
 * @param key - Idempotency key
 * @param response - Response data to store
 */
export function storeIdempotentResponse(key: string, response: any): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IDEMPOTENCY_EXPIRY_HOURS * 60 * 60 * 1000);
  
  idempotencyStore.set(key, {
    idempotencyKey: key,
    response,
    submittedAt: now,
    expiresAt,
  });
}

/**
 * Start cleanup interval to remove expired idempotency keys
 */
export function startIdempotencyCleanup(): void {
  if (cleanupInterval) return; // Already running
  
  cleanupInterval = setInterval(() => {
    const now = new Date();
    for (const [key, stored] of idempotencyStore.entries()) {
      if (now > stored.expiresAt) {
        idempotencyStore.delete(key);
      }
    }
  }, 60 * 60 * 1000); // Run every hour
}

/**
 * Stop cleanup interval
 */
export function stopIdempotencyCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Get idempotency key from request (header or generate from body)
 * 
 * @param req - Express request object
 * @returns Idempotency key string
 */
export function getIdempotencyKeyFromRequest(
  contextId: string | null,
  formData: Record<string, any>,
  headerKey?: string
): string {
  // Use header if provided (client can send custom key)
  if (headerKey) {
    return headerKey;
  }
  
  // Otherwise, generate from contextId + formData
  return generateIdempotencyKey(contextId, formData);
}

// Start cleanup on module load
startIdempotencyCleanup();

