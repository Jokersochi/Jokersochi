import { useMemo, useReducer } from 'react';
import type { MacroBreakdown, MealEntry, MealType } from '../types/meal';

const initialMeals: MealEntry[] = [
  {
    id: 'seed-1',
    title: 'Овсянка с ягодами',
    type: 'breakfast',
    capturedAt: new Date(new Date().setHours(8, 15, 0, 0)).toISOString(),
    macros: { calories: 360, protein: 18, carbs: 52, fat: 9 },
    notes: 'Добавлен греческий йогурт',
    recognition: {
      label: 'Овсяная каша',
      confidence: 0.82,
      portionGrams: 320,
      inferenceSource: 'cloud',
      inferenceLatencyMs: 940,
      modelVersion: 'foodnet-v0.4.2',
      alternatives: [
        { label: 'Гранола', confidence: 0.11 },
        { label: 'Рисовая каша', confidence: 0.07 },
      ],
    },
  },
  {
    id: 'seed-2',
    title: 'Куриная грудка с киноа',
    type: 'lunch',
    capturedAt: new Date(new Date().setHours(13, 5, 0, 0)).toISOString(),
    macros: { calories: 520, protein: 42, carbs: 48, fat: 16 },
    recognition: {
      label: 'Куриное филе с киноа',
      confidence: 0.88,
      portionGrams: 410,
      inferenceSource: 'on-device',
      inferenceLatencyMs: 420,
      modelVersion: 'foodnet-lite-v1.1',
    },
  },
  {
    id: 'seed-3',
    title: 'Творожный перекус',
    type: 'snack',
    capturedAt: new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
    macros: { calories: 210, protein: 20, carbs: 18, fat: 7 },
    recognition: {
      label: 'Творог с ягодами',
      confidence: 0.76,
      portionGrams: 180,
      inferenceSource: 'cloud',
      inferenceLatencyMs: 1050,
    },
  },
];

const createId = () => `meal-${Math.random().toString(36).slice(2, 9)}`;

type AddMealPayload = {
  title: string;
  type: MealType;
  macros: MacroBreakdown;
  notes?: string;
  photoUri?: string;
  recognition?: MealEntry['recognition'];
};

type MealAction = { type: 'add'; payload: AddMealPayload };

function mealReducer(state: MealEntry[], action: MealAction): MealEntry[] {
  switch (action.type) {
    case 'add':
      return [
        {
          id: createId(),
          capturedAt: new Date().toISOString(),
          photoUri: action.payload.photoUri,
          recognition: action.payload.recognition,
          ...action.payload,
        },
        ...state,
      ];
    default:
      return state;
  }
}

const sumMacros = (entries: MealEntry[]): MacroBreakdown =>
  entries.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.macros.calories,
      protein: acc.protein + meal.macros.protein,
      carbs: acc.carbs + meal.macros.carbs,
      fat: acc.fat + meal.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

export const useMealLog = () => {
  const [meals, dispatch] = useReducer(mealReducer, initialMeals);

  const totals = useMemo(() => sumMacros(meals), [meals]);

  const addMeal = (payload: AddMealPayload) => {
    dispatch({ type: 'add', payload });
  };

  const groupedByType = useMemo(() => {
    return meals.reduce<Record<MealType, MealEntry[]>>(
      (acc, meal) => {
        acc[meal.type] = [...acc[meal.type], meal];
        return acc;
      },
      {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      }
    );
  }, [meals]);

  return {
    meals,
    totals,
    addMeal,
    groupedByType,
  };
};

export type UseMealLogReturn = ReturnType<typeof useMealLog>;
