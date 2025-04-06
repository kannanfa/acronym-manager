export interface TrainingData {
  prompt: string;
  generatedAcronym: string;
  reward: number;
}

export interface MLModel {
  predict: (input: string) => Promise<string>;
  train: (data: TrainingData[]) => Promise<void>;
}

export interface MLConfig {
  modelPath: string;
  vocabSize: number;
  maxLength: number;
  batchSize: number;
  learningRate: number;
  epochs: number;
} 