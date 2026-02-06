import type { RecognitionCandidate, InferenceSource } from './inference';

export type MacroBreakdown = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string;
  title: string;
  type: MealType;
  capturedAt: string;
  macros: MacroBreakdown;
  notes?: string;
  photoUri?: string;
  recognition?: {
    label: string;
    confidence: number;
    portionGrams: number;
    inferenceSource: InferenceSource;
    inferenceLatencyMs: number;
    modelVersion?: string;
    alternatives?: RecognitionCandidate[];
  };
}
