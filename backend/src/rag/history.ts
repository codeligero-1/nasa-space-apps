/**
 * Conversation History Service for PET AI
 * Stores chat history per astronaut session in the backend
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { getDb } from '../db/connection.js';

export interface ChatMessage {
  id: string;
  astronaut_id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface HistoryOptions {
  astronautId: string;
  sessionId: string;
  limit?: number;
}

const HISTORY_TABLE = 'pet_ai_conversations';

/**
 * Initialize the conversation history table (run once)
 */
export async function initializeHistoryTable(db?: any): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isProduction && supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Create table if not exists
    const { error } = await supabase.rpc('create_pet_ai_conversations_table', {});

    if (error && !error.message.includes('already exists')) {
      console.warn('[history] RPC not available, table may need manual creation:', error.message);
    }
    return;
  }

  // Development: Use SQLite
  if (db) {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
          id TEXT PRIMARY KEY,
          astronaut_id TEXT NOT NULL,
          session_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
          content TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${HISTORY_TABLE}_astronaut ON ${HISTORY_TABLE}(astronaut_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${HISTORY_TABLE}_session ON ${HISTORY_TABLE}(session_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${HISTORY_TABLE}_created ON ${HISTORY_TABLE}(created_at)`);
      console.log('[history] SQLite history table initialized');
    } catch (error) {
      console.error('[history] Failed to initialize SQLite history table:', error);
    }
    return;
  }

  console.warn('[history] No database configured, skipping table initialization');
}

/**
 * Save a message to conversation history
 */
export async function saveMessage(
  astronautId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  db?: any
): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isProduction && supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from(HISTORY_TABLE)
      .insert({
        astronaut_id: astronautId,
        session_id: sessionId,
        role,
        content,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('[history] Failed to save message:', error);
      throw new Error(`Failed to save message: ${error.message}`);
    }
    return;
  }

  // Development: Use SQLite
  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO ${HISTORY_TABLE} (id, astronaut_id, session_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `);
      stmt.run([crypto.randomUUID(), astronautId, sessionId, role, content]);
      stmt.free();
      const { saveDb } = await import('../db/connection.js');
      saveDb();
    } catch (error) {
      console.error('[history] Failed to save message to SQLite:', error);
      throw new Error(`Failed to save message: ${error}`);
    }
    return;
  }

  console.warn('[history] No database configured, skipping message save');
}

/**
 * Get conversation history for an astronaut session
 */
export async function getHistory(
  options: HistoryOptions,
  db?: any
): Promise<ChatMessage[]> {
  const { astronautId, sessionId, limit = 20 } = options;

  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isProduction && supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .select('*')
      .eq('astronaut_id', astronautId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[history] Failed to get history:', error);
      throw new Error(`Failed to get history: ${error.message}`);
    }

    return data || [];
  }

  // Development: Use SQLite
  if (db) {
    try {
      const result = db.exec(`
        SELECT * FROM ${HISTORY_TABLE}
        WHERE astronaut_id = ? AND session_id = ?
        ORDER BY created_at ASC
        LIMIT ?
      `, [astronautId, sessionId, limit]);

      if (!result.length || !result[0].values.length) {
        return [];
      }

      const columns = result[0].columns;
      return result[0].values.map((row: any[]) => {
        const msg: any = {};
        columns.forEach((c: string, i: number) => {
          msg[c] = row[i];
        });
        return msg;
      });
    } catch (error) {
      console.error('[history] Failed to get history from SQLite:', error);
      throw new Error(`Failed to get history: ${error}`);
    }
  }

  console.warn('[history] No database configured, returning empty history');
  return [];
}

/**
 * Clear conversation history for a session
 */
export async function clearHistory(
  astronautId: string,
  sessionId: string,
  db?: any
): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isProduction && supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from(HISTORY_TABLE)
      .delete()
      .eq('astronaut_id', astronautId)
      .eq('session_id', sessionId);

    if (error) {
      console.error('[history] Failed to clear history:', error);
      throw new Error(`Failed to clear history: ${error.message}`);
    }
    return;
  }

  // Development: Use SQLite
  if (db) {
    try {
      const stmt = db.prepare(`
        DELETE FROM ${HISTORY_TABLE}
        WHERE astronaut_id = ? AND session_id = ?
      `);
      stmt.run([astronautId, sessionId]);
      stmt.free();
      const { saveDb } = await import('../db/connection.js');
      saveDb();
    } catch (error) {
      console.error('[history] Failed to clear history from SQLite:', error);
      throw new Error(`Failed to clear history: ${error}`);
    }
    return;
  }

  console.warn('[history] No database configured, skipping history clear');
}

/**
 * Get all sessions for an astronaut
 */
export async function getSessions(astronautId: string, db?: any): Promise<string[]> {
  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isProduction && supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from(HISTORY_TABLE)
      .select('session_id')
      .eq('astronaut_id', astronautId);

    if (error) {
      console.error('[history] Failed to get sessions:', error);
      return [];
    }

    const sessions = new Set<string>();
    data?.forEach(row => sessions.add(row.session_id));

    return Array.from(sessions);
  }

  // Development: Use SQLite
  if (db) {
    try {
      const result = db.exec(`
        SELECT DISTINCT session_id FROM ${HISTORY_TABLE}
        WHERE astronaut_id = ?
      `, [astronautId]);

      if (!result.length || !result[0].values.length) {
        return [];
      }

      return result[0].values.map((row: any[]) => row[0]);
    } catch (error) {
      console.error('[history] Failed to get sessions from SQLite:', error);
      return [];
    }
  }

  return [];
}

/**
 * Format history for LLM context
 */
export function formatHistoryForContext(messages: ChatMessage[]): string {
  if (!messages.length) {
    return '';
  }

  return messages
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
}