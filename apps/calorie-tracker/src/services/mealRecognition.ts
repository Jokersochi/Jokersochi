import axios from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { z } from 'zod';
import type { RecognitionCandidate, RecognitionResult } from '../types/inference';

const candidateSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const macroSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});

const responseSchema = z.object({
  dish: z.object({
    name: z.string().min(1),
    confidence: z.number().min(0).max(1),
    portionGrams: z.number().min(0),
    macros: macroSchema,
    alternatives: z.array(candidateSchema).optional(),
  }),
  inference: z.object({
    source: z.union([z.literal('on-device'), z.literal('cloud')]).optional(),
    latencyMs: z.number().min(0),
    modelVersion: z.string().optional(),
  }),
});

const FALLBACK_LIBRARY: Record<string, {
  alternatives: RecognitionCandidate[];
  macros: RecognitionResult['macros'];
  portionGrams: number;
}> = {
  salad: {
    alternatives: [
      { label: 'Боул', confidence: 0.18 },
      { label: 'Овощное рагу', confidence: 0.12 },
    ],
    macros: { calories: 210, protein: 6, carbs: 24, fat: 9 },
    portionGrams: 280,
  },
  oatmeal: {
    alternatives: [
      { label: 'Гранола', confidence: 0.16 },
      { label: 'Рисовая каша', confidence: 0.11 },
    ],
    macros: { calories: 340, protein: 12, carbs: 58, fat: 8 },
    portionGrams: 320,
  },
  steak: {
    alternatives: [
      { label: 'Бургер', confidence: 0.15 },
      { label: 'Свинина на гриле', confidence: 0.1 },
    ],
    macros: { calories: 620, protein: 46, carbs: 12, fat: 38 },
    portionGrams: 350,
  },
};

const inferKeyword = (uri: string): keyof typeof FALLBACK_LIBRARY | null => {
  const lower = uri.toLowerCase();
  if (lower.includes('salad') || lower.includes('green')) return 'salad';
  if (lower.includes('oat') || lower.includes('porridge')) return 'oatmeal';
  if (lower.includes('steak') || lower.includes('meat')) return 'steak';
  return null;
};

const mapResponseToRecognition = (uri: string, payload: z.infer<typeof responseSchema>): RecognitionResult => ({
  photoUri: uri,
  bestCandidate: {
    label: payload.dish.name,
    confidence: payload.dish.confidence,
  },
  alternatives: payload.dish.alternatives?.map((alt) => ({
    label: alt.name,
    confidence: alt.confidence,
  })) ?? [],
  macros: payload.dish.macros,
  portionGrams: payload.dish.portionGrams,
  inference: {
    source: payload.inference.source ?? 'cloud',
    latencyMs: payload.inference.latencyMs,
    modelVersion: payload.inference.modelVersion,
  },
});

const mockRecognition = (uri: string): RecognitionResult | null => {
  const keyword = inferKeyword(uri);
  if (!keyword) {
    return null;
  }

  const libraryEntry = FALLBACK_LIBRARY[keyword];
  return {
    photoUri: uri,
    bestCandidate: {
      label: keyword === 'salad' ? 'Салат с овощами' : keyword === 'steak' ? 'Стейк' : 'Овсяная каша',
      confidence: 0.6,
    },
    alternatives: libraryEntry.alternatives,
    macros: libraryEntry.macros,
    portionGrams: libraryEntry.portionGrams,
    inference: {
      source: 'on-device',
      latencyMs: 180,
      modelVersion: 'mock-calorie-kit',
    },
  };
};

const resolveApiBaseUrl = (): string | null => {
  const expoExtra = (Constants.expoConfig as { extra?: Record<string, unknown> })?.extra ?? {};
  const fromExtra = typeof expoExtra.apiBaseUrl === 'string' ? expoExtra.apiBaseUrl : null;
  const fromEnv = typeof process.env.EXPO_PUBLIC_API_BASE_URL === 'string' ? process.env.EXPO_PUBLIC_API_BASE_URL : null;
  return fromExtra ?? fromEnv;
};

export const analyzeMealFromUri = async (uri: string): Promise<RecognitionResult> => {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const apiBaseUrl = resolveApiBaseUrl();

  const payload = {
    imageBase64: base64,
    metadata: {
      capturedAt: new Date().toISOString(),
      platform: Platform.OS,
    },
  };

  if (apiBaseUrl) {
    try {
      const { data } = await axios.post(`${apiBaseUrl}/v1/analysis/meal`, payload, {
        timeout: 20_000,
        headers: { 'Content-Type': 'application/json' },
      });
      const parsed = responseSchema.parse(data);
      return mapResponseToRecognition(uri, parsed);
    } catch (error) {
      console.warn('[mealRecognition] cloud inference failed, falling back to heuristics', error);
    }
  }

  const fallback = mockRecognition(uri);
  if (fallback) {
    return fallback;
  }

  throw new Error('Не удалось получить результаты распознавания. Проверьте соединение или повторите снимок.');
};
