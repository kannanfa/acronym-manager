export interface Acronym {
  id: string;
  acronym: string;
  expansion: string;
  description?: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  tags?: string[];
}

export interface AcronymManager {
  addAcronym(acronym: Omit<Acronym, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Acronym>;
  getAcronym(id: string): Promise<Acronym | null>;
  updateAcronym(id: string, updates: Partial<Acronym>): Promise<Acronym>;
  deleteAcronym(id: string): Promise<void>;
  searchAcronyms(query: string): Promise<Acronym[]>;
  getAllAcronyms(): Promise<Acronym[]>;
  incrementUsage(id: string): Promise<void>;
}

export interface TextInputOptions {
  placeholder?: string;
  autoExpand?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
  onAcronymDetected?: (acronym: Acronym) => void;
  onTextChange?: (text: string) => void;
} 