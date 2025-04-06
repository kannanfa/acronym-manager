import { Acronym } from '../types/Acronym';
import sqlite3 from 'sqlite3';

export class SQLiteManager {
  private db: sqlite3.Database;

  constructor(dbPath: string = 'acronyms.db') {
    this.db = new sqlite3.Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS acronyms (
          id TEXT PRIMARY KEY,
          acronym TEXT NOT NULL UNIQUE,
          expansion TEXT NOT NULL,
          description TEXT,
          is_enabled INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          usage_count INTEGER DEFAULT 0,
          tags TEXT
        )
      `);
    });
  }

  async getAllAcronyms(): Promise<Acronym[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM acronyms ORDER BY usage_count DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          resolve(rows.map(row => ({
            id: row.id,
            acronym: row.acronym,
            expansion: row.expansion,
            description: row.description,
            isEnabled: Boolean(row.is_enabled),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            usageCount: row.usage_count,
            tags: row.tags ? JSON.parse(row.tags) : undefined
          })));
        }
      });
    });
  }
} 