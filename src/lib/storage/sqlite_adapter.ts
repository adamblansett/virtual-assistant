/**
 * Pluggable SQLite Storage Backend Adapter (WAL-mode ACID Persistence).
 *
 * Uses Node.js 22+ built-in `node:sqlite` (`DatabaseSync`) with zero external native addon dependencies,
 * falling back gracefully if `node:sqlite` is unavailable in an older runtime.
 *
 * Activated automatically when `ASSISTANT_STORAGE_BACKEND=sqlite` or via direct adapter calls.
 */

import fs from 'fs';
import path from 'path';

export class PluggableSQLiteAdapter {
  private static dbInstance: any = null;
  private static dbPath = path.join(process.cwd(), 'data', 'app_state.sqlite');

  /**
   * Returns whether the current Node runtime supports `node:sqlite`.
   */
  public static isSupported(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sqlite = require('node:sqlite');
      return typeof sqlite?.DatabaseSync === 'function';
    } catch {
      return false;
    }
  }

  private static getDb(): any {
    if (this.dbInstance) return this.dbInstance;

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(this.dbPath);

    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS relational_memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        fact TEXT NOT NULL,
        source TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.dbInstance = db;
    return db;
  }

  /**
   * Persists the encrypted application state snapshot in SQLite inside an ACID transaction.
   */
  public static saveState(encryptedState: Record<string, any>): boolean {
    if (!this.isSupported()) return false;

    try {
      const db = this.getDb();
      const now = new Date().toISOString();
      const payload = JSON.stringify(encryptedState);

      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        const upsertState = db.prepare(`
          INSERT INTO kv_store (key, value_json, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
        `);
        upsertState.run('app_state', payload, now);

        // Also sync memories into indexed relational table for SQL queries
        if (encryptedState.memories && typeof encryptedState.memories === 'object') {
          db.exec('DELETE FROM relational_memories');
          const insertMem = db.prepare(`
            INSERT INTO relational_memories (id, category, fact, source, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (const mem of Object.values(encryptedState.memories) as any[]) {
            if (mem && mem.id && mem.fact) {
              insertMem.run(
                String(mem.id),
                String(mem.category || 'general'),
                String(mem.fact),
                String(mem.source || 'user'),
                String(mem.updatedAt || now)
              );
            }
          }
        }

        db.exec('COMMIT');
        return true;
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }
    } catch {
      return false;
    }
  }

  /**
   * Loads the persisted application state snapshot from SQLite.
   */
  public static loadState(): Record<string, any> | null {
    if (!this.isSupported()) return null;

    try {
      const db = this.getDb();
      const stmt = db.prepare('SELECT value_json FROM kv_store WHERE key = ?');
      const row = stmt.get('app_state') as { value_json?: string } | undefined;
      if (row && row.value_json) {
        return JSON.parse(row.value_json);
      }
    } catch {
      // Fallback to null
    }
    return null;
  }

  /**
   * Queries relational memories directly via SQLite SQL.
   */
  public static queryMemoriesSql(category?: string): Array<{
    id: string;
    category: string;
    fact: string;
    source: string;
    updated_at: string;
  }> {
    if (!this.isSupported()) return [];

    try {
      const db = this.getDb();
      if (category) {
        const stmt = db.prepare(
          'SELECT id, category, fact, source, updated_at FROM relational_memories WHERE category = ? ORDER BY updated_at DESC'
        );
        return stmt.all(category) as any[];
      }
      const stmt = db.prepare(
        'SELECT id, category, fact, source, updated_at FROM relational_memories ORDER BY updated_at DESC'
      );
      return stmt.all() as any[];
    } catch {
      return [];
    }
  }
}
