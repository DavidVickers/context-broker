import { v4 as uuidv4 } from 'uuid';
import { saveSessions, loadSessions } from './tokenStorage';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  issued_at: number;
  expires_at: number;
  // Some Salesforce responses include instance_url; keep it if present
  instance_url?: string;
}

export interface UserSession {
  sessionId: string;
  contextId: string;
  tokenData: TokenData;
  userId?: string;
  userEmail?: string;
  createdAt: number;
  lastAccessed: number;
}

class TokenManager {
  private sessions: Map<string, UserSession> = new Map();
  private refreshPromises: Map<string, Promise<string | null>> = new Map();

  constructor() {
    // Load persisted sessions on startup
    this.loadPersistedSessions();
  }

  /**
   * Load sessions from disk on startup
   */
  private loadPersistedSessions(): void {
    const savedSessions = loadSessions();
    savedSessions.forEach(session => {
      this.sessions.set(session.sessionId, session);
    });
    console.log(`🔄 Restored ${savedSessions.length} OAuth sessions from persistent storage`);
  }

  /**
   * Persist sessions to disk
   */
  private persistSessions(): void {
    const sessions = Array.from(this.sessions.values());
    saveSessions(sessions);
  }

  /**
   * Store OAuth tokens for a user session
   */
  storeTokens(contextId: string, tokenData: TokenData, userId?: string, userEmail?: string): string {
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresInSeconds = tokenData.expires_in && Number.isFinite(tokenData.expires_in) ? tokenData.expires_in : 3600; // default 1h if missing
    
    const session: UserSession = {
      sessionId,
      contextId,
      tokenData: {
        ...tokenData,
        issued_at: now,
        expires_at: now + (expiresInSeconds * 1000)
      },
      userId,
      userEmail,
      createdAt: now,
      lastAccessed: now
    };

    this.sessions.set(sessionId, session);
    console.log(`🔐 Stored tokens for session ${sessionId} (contextId: ${contextId})`);
    
    // Persist to disk
    this.persistSessions();
    
    return sessionId;
  }

  /**
   * Get valid access token for a session
   */
  async getValidAccessToken(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found`);
      return null;
    }

    // Update last accessed
    session.lastAccessed = Date.now();

    // Check if token is still valid (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    
    if (session.tokenData.expires_at > (now + bufferTime)) {
      console.log(`✅ Using valid access token for session ${sessionId}`);
      return session.tokenData.access_token;
    }

    // Token is expired or about to expire, refresh it
    console.log(`🔄 Token expired for session ${sessionId}, refreshing...`);
    return await this.refreshTokens(sessionId);
  }

  /**
   * Refresh expired tokens using refresh_token
   */
  private async refreshTokens(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`❌ Session ${sessionId} not found for refresh`);
      return null;
    }

    // Check if refresh is already in progress
    if (this.refreshPromises.has(sessionId)) {
      console.log(`⏳ Refresh already in progress for session ${sessionId}`);
      return await this.refreshPromises.get(sessionId)!;
    }

    const refreshPromise = this.performTokenRefresh(session).then((newTokenData) => {
      // Update session with new tokens
      session.tokenData = {
        ...newTokenData,
        issued_at: Date.now(),
        expires_at: Date.now() + (newTokenData.expires_in * 1000)
      };
      session.lastAccessed = Date.now();
      return session.tokenData.access_token;
    });
    this.refreshPromises.set(sessionId, refreshPromise);

    try {
      const accessToken = await refreshPromise;

      console.log(`✅ Tokens refreshed for session ${sessionId}`);
      return accessToken;
      
    } catch (error) {
      console.error(`❌ Token refresh failed for session ${sessionId}:`, error);
      // Remove invalid session
      this.sessions.delete(sessionId);
      return null;
    } finally {
      this.refreshPromises.delete(sessionId);
    }
  }

  /**
   * Perform the actual token refresh API call
   */
  private async performTokenRefresh(session: UserSession): Promise<TokenData> {
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const loginUrl = process.env.SALESFORCE_LOGIN_URL;

    if (!clientId || !clientSecret || !loginUrl) {
      throw new Error('Missing Salesforce OAuth configuration for token refresh');
    }

    const tokenUrl = `${loginUrl}/services/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: session.tokenData.refresh_token
    });

    console.log(`🔄 Refreshing tokens for session ${session.sessionId}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const tokenData: any = await response.json();

    if (!response.ok) {
      console.error('❌ Token refresh failed:');
      console.error('   Status:', response.status);
      console.error('   Response:', tokenData);
      throw new Error(`Token refresh failed: ${tokenData.error || tokenData.error_description || 'Unknown error'}`);
    }

    return tokenData;
  }

  /**
   * Get session by sessionId
   */
  getSession(sessionId: string): UserSession | null {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = Date.now();
    }
    return session || null;
  }

  /**
   * Get session by contextId
   */
  getSessionByContextId(contextId: string): UserSession | null {
    for (const session of this.sessions.values()) {
      if (session.contextId === contextId) {
        session.lastAccessed = Date.now();
        return session;
      }
    }
    return null;
  }

  /**
   * Remove session
   */
  removeSession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ Removed session ${sessionId}`);
      this.persistSessions();
    }
    return deleted;
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  cleanupExpiredSessions(): number {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessed > maxAge) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired sessions`);
      this.persistSessions();
    }

    return cleaned;
  }

  /**
   * Get all active sessions (for debugging)
   */
  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Start cleanup interval
   */
  startCleanup(): void {
    if (this.cleanupInterval) return; // Already running
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanupInterval: NodeJS.Timeout | null = null;
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Start cleanup on module load
tokenManager.startCleanup();
