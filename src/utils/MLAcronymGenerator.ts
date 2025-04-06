import * as tf from '@tensorflow/tfjs';
import { Acronym } from '../types/Acronym';
import { SQLiteManager } from './SQLiteManager';
import { TrainingData, MLModel, MLConfig } from '../types/MLTypes';
import { Logs } from '@tensorflow/tfjs';

export class MLAcronymGenerator {
  private sqliteManager: SQLiteManager;
  private model!: MLModel;
  private trainingData: TrainingData[] = [];
  private config: MLConfig = {
    modelPath: 'acronym_model',
    vocabSize: 10000,
    maxLength: 100,
    batchSize: 32,
    learningRate: 0.001,
    epochs: 10
  };

  constructor(sqliteManager: SQLiteManager) {
    this.sqliteManager = sqliteManager;
    this.initializeModel();
  }

  private async initializeModel() {
    // Create a simple LSTM model for text generation
    const model = tf.sequential();
    
    model.add(tf.layers.embedding({
      inputDim: this.config.vocabSize,
      outputDim: 128,
      inputLength: this.config.maxLength
    }));
    
    model.add(tf.layers.lstm({
      units: 256,
      returnSequences: true
    }));
    
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    model.add(tf.layers.lstm({
      units: 128,
      returnSequences: false
    }));
    
    model.add(tf.layers.dense({
      units: this.config.vocabSize,
      activation: 'softmax'
    }));

    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    this.model = {
      predict: async (input: string) => {
        // Tokenize input
        const tokenized = this.tokenize(input);
        const padded = this.padSequence(tokenized);
        const tensor = tf.tensor2d([padded]);
        
        // Get prediction
        const prediction = await model.predict(tensor) as tf.Tensor;
        const indices = await prediction.argMax(1).data();
        
        // Convert back to text
        return this.detokenize(indices);
      },
      train: async (data: TrainingData[]) => {
        // Prepare training data
        const { xs, ys } = this.prepareTrainingData(data);
        
        // Train model
        await model.fit(xs, ys, {
          batchSize: this.config.batchSize,
          epochs: this.config.epochs,
          validationSplit: 0.2,
          callbacks: {
            onEpochEnd: (epoch: number, logs: Logs | undefined) => {
              console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
            }
          }
        });
      }
    };
  }

  private tokenize(text: string): number[] {
    // Simple character-based tokenization
    return text.split('').map(char => char.charCodeAt(0) % this.config.vocabSize);
  }

  private detokenize(indices: Int32Array): string {
    // Convert indices back to characters
    return Array.from(indices)
      .map(index => String.fromCharCode(index % this.config.vocabSize))
      .join('');
  }

  private padSequence(sequence: number[]): number[] {
    // Pad or truncate sequence to maxLength
    if (sequence.length > this.config.maxLength) {
      return sequence.slice(0, this.config.maxLength);
    }
    return [...sequence, ...Array(this.config.maxLength - sequence.length).fill(0)];
  }

  private prepareTrainingData(data: TrainingData[]): { xs: tf.Tensor, ys: tf.Tensor } {
    const sequences = data.map(d => this.tokenize(d.prompt));
    const paddedSequences = sequences.map(s => this.padSequence(s));
    
    const xs = tf.tensor2d(paddedSequences);
    const ys = tf.tensor2d(
      data.map(d => this.tokenize(d.generatedAcronym).map(t => {
        const oneHot = new Array(this.config.vocabSize).fill(0);
        oneHot[t] = 1;
        return oneHot;
      }))
    );

    return { xs, ys };
  }

  public async generateUniqueAcronym(prompt: string): Promise<string> {
    // Check if we already have a similar prompt in our training data
    const similarPrompt = this.findSimilarPrompt(prompt);
    if (similarPrompt) {
      return similarPrompt.generatedAcronym;
    }

    // Generate new acronym using the model
    const generatedAcronym = await this.model.predict(prompt);

    // Check if the acronym already exists
    const existingAcronyms = await this.sqliteManager.getAllAcronyms();
    const isUnique = !existingAcronyms.some(acronym => 
      acronym.acronym === generatedAcronym
    );

    if (!isUnique) {
      // If not unique, generate a new one with a slight modification
      return this.generateUniqueAcronym(prompt + ' ' + Math.random().toString(36).substring(7));
    }

    // Store the training data
    this.trainingData.push({
      prompt,
      generatedAcronym,
      reward: 1.0 // Initial reward
    });

    return generatedAcronym;
  }

  private findSimilarPrompt(prompt: string): TrainingData | null {
    // Simple similarity check using Levenshtein distance
    const threshold = 0.8; // 80% similarity threshold

    for (const data of this.trainingData) {
      const similarity = this.calculateSimilarity(prompt, data.prompt);
      if (similarity >= threshold) {
        return data;
      }
    }

    return null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance implementation
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return 1 - track[str2.length][str1.length] / maxLength;
  }

  public async trainModel() {
    if (this.trainingData.length > 0) {
      await this.model.train(this.trainingData);
    }
  }

  public async saveModel() {
    // Save model and training data
    const modelData = {
      model: await tf.io.withSaveHandler(async (artifacts: tf.io.ModelArtifacts) => {
        // Save model artifacts
        console.log('Saving model artifacts:', artifacts);
      }),
      trainingData: this.trainingData
    };
    
    // Save to IndexedDB or localStorage
    localStorage.setItem('mlAcronymModel', JSON.stringify(modelData));
  }

  public async loadModel() {
    // Load model and training data
    const savedData = localStorage.getItem('mlAcronymModel');
    if (savedData) {
      const { model, trainingData } = JSON.parse(savedData);
      this.trainingData = trainingData;
      // Load model artifacts
      await tf.io.withLoadHandler(async () => {
        return model;
      });
    }
  }

  public async reinforceLearning(acronym: string, isGood: boolean) {
    // Update reward for the acronym in training data
    const data = this.trainingData.find(d => d.generatedAcronym === acronym);
    if (data) {
      data.reward = isGood ? 1.0 : 0.0;
      // Retrain model with updated rewards
      await this.trainModel();
    }
  }
} 