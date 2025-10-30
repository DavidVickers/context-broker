import fs from 'fs';
import path from 'path';
import { UserSession } from './tokenManager';

const STORAGE_FILE = path.join(__dirname, '../../data/oauth-sessions.json');

/**
 * Save sessions to disk
 */
export function saveSessions(sessions: UserSession[]): void {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(sessions, null, 2));
    console.log(`💾 Saved ${sessions.length} OAuth sessions to disk`);
  } catch (error: any) {
    console.error('❌ Failed to save sessions:', error.message);
  }
}

/**
 * Load sessions from disk
 */
export function loadSessions(): UserSession[] {
  try {
    if (!fs.existsSync(STORAGE_FILE)) {
      console.log('📂 No saved sessions file found');
      return [];
    }

    const data = fs.readFileSync(STORAGE_FILE, 'utf8');
    const sessions = JSON.parse(data) as UserSession[];
    
    // Filter out expired sessions (older than 24 hours)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    const validSessions = sessions.filter(session => {
      const age = now - session.createdAt;
      return age < maxAge;
    });

    console.log(`📂 Loaded ${validSessions.length} valid OAuth sessions from disk (${sessions.length - validSessions.length} expired)`);
    
    // Save back to clean up expired sessions
    if (validSessions.length !== sessions.length) {
      saveSessions(validSessions);
    }

    return validSessions;
  } catch (error: any) {
    console.error('❌ Failed to load sessions:', error.message);
    return [];
  }
}

/**
 * Clear all saved sessions
 */
export function clearSessions(): void {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      fs.unlinkSync(STORAGE_FILE);
      console.log('🗑️  Cleared saved OAuth sessions');
    }
  } catch (error: any) {
    console.error('❌ Failed to clear sessions:', error.message);
  }
}

