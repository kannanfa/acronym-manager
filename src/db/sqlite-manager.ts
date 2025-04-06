import sqlite3 from 'sqlite3';
import { Acronym, AcronymManager } from '../core/types';
import { v4 as uuidv4 } from 'uuid';
import { MLAcronymGenerator } from '../ml/acronym-generator';

export class SQLiteAcronymManager implements AcronymManager {
  private db: sqlite3.Database;
  private mlGenerator: MLAcronymGenerator | null = null;
  private batchSize: number = 100; // Process prompts in batches for better performance

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

      this.db.run(`
        CREATE TABLE IF NOT EXISTS prompts (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed INTEGER DEFAULT 0
        )
      `);
    });
  }

  async addAcronym(acronym: Omit<Acronym, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Acronym> {
    const id = uuidv4();
    const now = new Date();
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO acronyms (id, acronym, expansion, description, is_enabled, tags)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, acronym.acronym, acronym.expansion, acronym.description, acronym.isEnabled ? 1 : 0, JSON.stringify(acronym.tags)],
        (err) => {
          if (err) reject(err);
          else {
            resolve({
              ...acronym,
              id,
              createdAt: now,
              updatedAt: now,
              usageCount: 0
            });
          }
        }
      );
    });
  }

  async getAcronym(id: string): Promise<Acronym | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM acronyms WHERE id = ?',
        [id],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              id: row.id,
              acronym: row.acronym,
              expansion: row.expansion,
              description: row.description,
              isEnabled: Boolean(row.is_enabled),
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
              usageCount: row.usage_count,
              tags: row.tags ? JSON.parse(row.tags) : undefined
            });
          }
        }
      );
    });
  }

  async updateAcronym(id: string, updates: Partial<Acronym>): Promise<Acronym> {
    const current = await this.getAcronym(id);
    if (!current) throw new Error('Acronym not found');

    const updated = { ...current, ...updates, updatedAt: new Date() };
    
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE acronyms 
         SET acronym = ?, expansion = ?, description = ?, is_enabled = ?, tags = ?, updated_at = ?
         WHERE id = ?`,
        [
          updated.acronym,
          updated.expansion,
          updated.description,
          updated.isEnabled ? 1 : 0,
          JSON.stringify(updated.tags),
          updated.updatedAt.toISOString(),
          id
        ],
        (err) => {
          if (err) reject(err);
          else resolve(updated);
        }
      );
    });
  }

  async deleteAcronym(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM acronyms WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async searchAcronyms(query: string): Promise<Acronym[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM acronyms 
         WHERE acronym LIKE ? OR expansion LIKE ? OR description LIKE ?
         ORDER BY usage_count DESC`,
        [`%${query}%`, `%${query}%`, `%${query}%`],
        (err, rows: any[]) => {
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
        }
      );
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

  async incrementUsage(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE acronyms SET usage_count = usage_count + 1 WHERE id = ?',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async addPrompt(content: string): Promise<string> {
    const id = uuidv4();
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO prompts (id, content) VALUES (?, ?)',
        [id, content],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getUnprocessedPrompts(): Promise<{ id: string; content: string }[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, content FROM prompts WHERE processed = 0 ORDER BY created_at ASC',
        (err: Error | null, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async markPromptAsProcessed(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE prompts SET processed = 1 WHERE id = ?',
        [id],
        (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private generateAcronym(text: string): string {
    // Split into words and filter out common words and very short words
    const words = text.toLowerCase().split(/\s+/);
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could', 'this', 'that',
      'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'as', 'from', 'up', 'about',
      'into', 'over', 'after', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
      'just', 'should', 'now'
    ]);
    
    // Filter out common words and very short words
    const significantWords = words.filter(word => 
      !commonWords.has(word) && 
      word.length > 1 && 
      !/^\d+$/.test(word) // Filter out numbers
    );
    
    // If no significant words, use the first letter of each word
    if (significantWords.length === 0) {
      return words
        .filter(word => word.length > 0)
        .map(word => word[0])
        .join('')
        .toUpperCase();
    }
    
    // Try to create a meaningful acronym
    // First, try to use the first letter of each significant word
    const firstLetterAcronym = significantWords
      .map(word => word[0])
      .join('')
      .toUpperCase();
    
    // If the acronym is too short, try to use more letters
    if (firstLetterAcronym.length < 3 && significantWords.length > 0) {
      // Use the first two letters of the first significant word
      return (significantWords[0].substring(0, 2) + 
        significantWords.slice(1).map(word => word[0]).join(''))
        .toUpperCase();
    }
    
    return firstLetterAcronym;
  }

  private findRepeatedPhrases(prompts: { id: string; content: string }[]): Map<string, string[]> {
    const phrases = new Map<string, string[]>();
    const MIN_PHRASE_LENGTH = 3; // Minimum number of words in a phrase
    const MIN_OCCURRENCES = 2;   // Minimum number of times a phrase must appear
    
    // Process each prompt
    for (const prompt of prompts) {
      // Split into words and filter out very short words
      const words = prompt.content.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 1);
      
      // Use sliding window to find phrases
      for (let windowSize = MIN_PHRASE_LENGTH; windowSize <= Math.min(8, words.length); windowSize++) {
        for (let i = 0; i <= words.length - windowSize; i++) {
          const phrase = words.slice(i, i + windowSize).join(' ');
          
          // Skip if phrase is too short or contains only common words
          if (phrase.length < 10) continue;
          
          // Track which prompts contain this phrase
          if (!phrases.has(phrase)) {
            phrases.set(phrase, []);
          }
          
          // Only add the prompt ID if it's not already in the list
          const promptIds = phrases.get(phrase)!;
          if (!promptIds.includes(prompt.id)) {
            promptIds.push(prompt.id);
          }
        }
      }
    }
    
    // Filter to only include phrases that appear in multiple prompts
    return new Map([...phrases.entries()]
      .filter(([_, ids]) => ids.length >= MIN_OCCURRENCES)
      // Sort by frequency (most frequent first)
      .sort((a, b) => b[1].length - a[1].length));
  }

  async processNewPrompts(): Promise<void> {
    // Get unprocessed prompts
    const unprocessedPrompts = await this.getUnprocessedPrompts();
    if (unprocessedPrompts.length === 0) return;

    // Initialize ML generator if not already initialized
    if (!this.mlGenerator) {
      this.mlGenerator = new MLAcronymGenerator(this);
    }

    // Process prompts in batches for better performance
    for (let i = 0; i < unprocessedPrompts.length; i += this.batchSize) {
      const batch = unprocessedPrompts.slice(i, i + this.batchSize);
      await this.mlGenerator.processPromptBatch(batch);
    }
  }

  async clearAcronyms(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM acronyms', (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Provide feedback to the ML generator about an acronym
   * This helps improve the acronym generation over time
   */
  async provideAcronymFeedback(acronym: string, isGood: boolean): Promise<void> {
    if (this.mlGenerator) {
      await this.mlGenerator.reinforceLearning(acronym, isGood);
    }
  }

  close(): void {
    this.db.close();
  }
} 