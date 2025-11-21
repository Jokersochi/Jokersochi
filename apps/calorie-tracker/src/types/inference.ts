export type InferenceSource = 'on-device' | 'cloud';

export interface InferenceMeta {
  source: InferenceSource;
  latencyMs: number;
  modelVersion?: string;
}

export interface RecognitionCandidate {
  label: string;
  confidence: number; // 0..1
}

export interface RecognitionResult {
  bestCandidate: RecognitionCandidate;
  alternatives: RecognitionCandidate[];
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  portionGrams: number;
  photoUri: string;
  inference: InferenceMeta;
}
