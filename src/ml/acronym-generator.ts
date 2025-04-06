import { Acronym } from '../core/types';
import { SQLiteAcronymManager } from '../db/sqlite-manager';

/**
 * A machine learning-based acronym generator that uses reinforcement learning
 * to avoid generating duplicate acronyms and improve over time.
 */
export class MLAcronymGenerator {
  private db: SQLiteAcronymManager;
  private phraseEmbeddings: Map<string, number[]>;
  private acronymEmbeddings: Map<string, number[]>;
  private learningRate: number;
  private minSimilarityThreshold: number;
  private maxAttempts: number;
  private commonWords: Set<string>;
  
  constructor(
    db: SQLiteAcronymManager,
    options: {
      learningRate?: number;
      minSimilarityThreshold?: number;
      maxAttempts?: number;
    } = {}
  ) {
    this.db = db;
    this.phraseEmbeddings = new Map();
    this.acronymEmbeddings = new Map();
    this.learningRate = options.learningRate || 0.1;
    this.minSimilarityThreshold = options.minSimilarityThreshold || 0.7;
    this.maxAttempts = options.maxAttempts || 5;
    
    // Common words to filter out
    this.commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could', 'this', 'that',
      'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'as', 'from', 'up', 'about',
      'into', 'over', 'after', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will',
      'just', 'should', 'now'
    ]);
  }
  
  /**
   * Generate a unique acronym for a phrase using ML-based approach
   */
  async generateUniqueAcronym(phrase: string): Promise<string> {
    // Get existing acronyms to avoid duplicates
    const existingAcronyms = await this.db.getAllAcronyms();
    const existingAcronymSet = new Set(existingAcronyms.map(a => a.acronym));
    
    // Generate embedding for the phrase
    const phraseEmbedding = this.generateEmbedding(phrase);
    this.phraseEmbeddings.set(phrase, phraseEmbedding);
    
    // Try to generate a unique acronym
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      const acronym = this.generateAcronym(phrase, attempt);
      
      // Check if acronym is already in use
      if (existingAcronymSet.has(acronym)) {
        continue;
      }
      
      // Generate embedding for the acronym
      const acronymEmbedding = this.generateEmbedding(acronym);
      
      // Check similarity with existing acronyms
      let isTooSimilar = false;
      for (const existingAcronym of existingAcronyms) {
        const existingEmbedding = this.getOrCreateEmbedding(existingAcronym.acronym);
        const similarity = this.cosineSimilarity(acronymEmbedding, existingEmbedding);
        
        if (similarity > this.minSimilarityThreshold) {
          isTooSimilar = true;
          break;
        }
      }
      
      if (!isTooSimilar) {
        // Store the embedding for future reference
        this.acronymEmbeddings.set(acronym, acronymEmbedding);
        return acronym;
      }
    }
    
    // If all attempts failed, generate a fallback acronym with a random suffix
    const baseAcronym = this.generateAcronym(phrase, 0);
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const fallbackAcronym = `${baseAcronym}${randomSuffix}`;
    
    // Store the embedding for future reference
    this.acronymEmbeddings.set(fallbackAcronym, this.generateEmbedding(fallbackAcronym));
    return fallbackAcronym;
  }
  
  /**
   * Generate an acronym for a phrase with a specific attempt number
   * to allow for variation in generation strategy
   */
  private generateAcronym(phrase: string, attempt: number): string {
    // Split into words and filter out common words and very short words
    const words = phrase.toLowerCase().split(/\s+/);
    const significantWords = words.filter(word => 
      !this.commonWords.has(word) && 
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
    
    // Different strategies based on attempt number
    switch (attempt % 3) {
      case 0:
        // Standard: first letter of each significant word
        return significantWords
          .map(word => word[0])
          .join('')
          .toUpperCase();
        
      case 1:
        // Use first two letters of first word + first letter of others
        if (significantWords.length > 0) {
          return (significantWords[0].substring(0, 2) + 
            significantWords.slice(1).map(word => word[0]).join(''))
            .toUpperCase();
        }
        return this.generateAcronym(phrase, 0);
        
      case 2:
        // Use first letter of first word + first two letters of others
        if (significantWords.length > 0) {
          return (significantWords[0][0] + 
            significantWords.slice(1).map(word => word.substring(0, 2)).join(''))
            .toUpperCase();
        }
        return this.generateAcronym(phrase, 0);
        
      default:
        return this.generateAcronym(phrase, 0);
    }
  }
  
  /**
   * Generate a simple embedding for a string
   * This is a simplified version of word embeddings
   */
  private generateEmbedding(text: string): number[] {
    // Convert text to lowercase and remove special characters
    const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    
    // Create a 26-dimensional vector (one for each letter)
    const embedding = new Array(26).fill(0);
    
    // Count occurrences of each letter
    for (const char of cleanText) {
      const index = char.charCodeAt(0) - 'a'.charCodeAt(0);
      if (index >= 0 && index < 26) {
        embedding[index]++;
      }
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }
  
  /**
   * Get an existing embedding or create a new one
   */
  private getOrCreateEmbedding(text: string): number[] {
    if (this.acronymEmbeddings.has(text)) {
      return this.acronymEmbeddings.get(text)!;
    }
    
    const embedding = this.generateEmbedding(text);
    this.acronymEmbeddings.set(text, embedding);
    return embedding;
  }
  
  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }
    
    return dotProduct;
  }
  
  /**
   * Process a batch of prompts to find repeated phrases and generate acronyms
   * This is more efficient than processing all prompts repeatedly
   */
  async processPromptBatch(prompts: { id: string; content: string }[]): Promise<void> {
    if (prompts.length === 0) return;
    
    // Find repeated phrases
    const repeatedPhrases = this.findRepeatedPhrases(prompts);
    
    // Process the most frequent phrases first (up to 10)
    const phrasesToProcess = [...repeatedPhrases.entries()].slice(0, 10);
    
    for (const [phrase, promptIds] of phrasesToProcess) {
      // Skip if phrase is too short
      if (phrase.length < 10) continue;
      
      // Generate a unique acronym
      const acronym = await this.generateUniqueAcronym(phrase);
      
      // Skip if acronym is too short or too long
      if (acronym.length < 2 || acronym.length > 10) continue;
      
      // Check if acronym already exists
      const existingAcronyms = await this.db.searchAcronyms(acronym);
      if (existingAcronyms.length === 0) {
        await this.db.addAcronym({
          acronym,
          expansion: phrase,
          description: `Generated from repeated phrase in ${promptIds.length} prompts`,
          isEnabled: true,
          tags: ['auto-generated', 'ml-generated']
        });
      }
    }
    
    // Mark all prompts as processed
    for (const prompt of prompts) {
      await this.db.markPromptAsProcessed(prompt.id);
    }
  }
  
  /**
   * Find repeated phrases in a batch of prompts
   */
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
          
          // Skip if phrase is too short
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
  
  /**
   * Reinforce learning by updating embeddings based on user feedback
   * This helps avoid generating similar acronyms in the future
   */
  async reinforceLearning(acronym: string, isGood: boolean): Promise<void> {
    if (!this.acronymEmbeddings.has(acronym)) {
      return;
    }
    
    const embedding = this.acronymEmbeddings.get(acronym)!;
    
    if (isGood) {
      // If the acronym is good, reinforce its embedding
      // This makes it more likely to be used as a reference for future acronyms
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] *= (1 + this.learningRate);
      }
    } else {
      // If the acronym is bad, weaken its embedding
      // This makes it less likely to be used as a reference for future acronyms
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] *= (1 - this.learningRate);
      }
    }
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    // Update the embedding
    this.acronymEmbeddings.set(acronym, embedding);
  }
} 