import { openDB, IDBPDatabase } from 'idb';
import { Acronym, AcronymManager } from './types';
import { v4 as uuidv4 } from 'uuid';

export class BrowserAcronymManager implements AcronymManager {
  private dbName = 'acronym-manager';
  private dbVersion = 1;
  private db: IDBPDatabase | null = null;

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    this.db = await openDB(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('acronyms')) {
          const store = db.createObjectStore('acronyms', { keyPath: 'id' });
          store.createIndex('acronym', 'acronym');
        }
      },
    });
  }

  async addAcronym(acronym: Omit<Acronym, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Acronym> {
    await this.ensureDatabase();
    
    const newAcronym: Acronym = {
      id: uuidv4(),
      ...acronym,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };

    await this.db!.add('acronyms', newAcronym);
    return newAcronym;
  }

  async getAcronym(id: string): Promise<Acronym | null> {
    await this.ensureDatabase();
    return this.db!.get('acronyms', id);
  }

  async updateAcronym(id: string, updates: Partial<Acronym>): Promise<Acronym> {
    await this.ensureDatabase();
    
    const acronym = await this.getAcronym(id);
    if (!acronym) {
      throw new Error(`Acronym with id ${id} not found`);
    }

    const updatedAcronym = {
      ...acronym,
      ...updates,
      updatedAt: new Date()
    };

    await this.db!.put('acronyms', updatedAcronym);
    return updatedAcronym;
  }

  async deleteAcronym(id: string): Promise<void> {
    await this.ensureDatabase();
    await this.db!.delete('acronyms', id);
  }

  async searchAcronyms(query: string): Promise<Acronym[]> {
    await this.ensureDatabase();
    
    const allAcronyms = await this.getAllAcronyms();
    const lowerQuery = query.toLowerCase();
    
    return allAcronyms.filter(acronym => 
      acronym.acronym.toLowerCase().includes(lowerQuery) ||
      acronym.expansion.toLowerCase().includes(lowerQuery)
    );
  }

  async getAllAcronyms(): Promise<Acronym[]> {
    await this.ensureDatabase();
    return this.db!.getAll('acronyms');
  }

  async incrementUsage(id: string): Promise<void> {
    await this.ensureDatabase();
    
    const acronym = await this.getAcronym(id);
    if (acronym) {
      await this.updateAcronym(id, {
        usageCount: acronym.usageCount + 1
      });
    }
  }

  private async ensureDatabase() {
    if (!this.db) {
      await this.initializeDatabase();
    }
  }
} 