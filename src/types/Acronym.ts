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