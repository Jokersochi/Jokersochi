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
  },
  {
    id: 'seed-2',
    title: 'Куриная грудка с киноа',
    type: 'lunch',
    capturedAt: new Date(new Date().setHours(13, 5, 0, 0)).toISOString(),
    macros: { calories: 520, protein: 42, carbs: 48, fat: 16 },
  },
  {
    id: 'seed-3',
    title: 'Творожный перекус',
    type: 'snack',
    capturedAt: new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
    macros: { calories: 210, protein: 20, carbs: 18, fat: 7 },
  },
];

const createId = () => `meal-${Math.random().toString(36).slice(2, 9)}`;

type AddMealPayload = {
  title: string;
  type: MealType;
  macros: MacroBreakdown;
  notes?: string;
};

type MealAction = { type: 'add'; payload: AddMealPayload };

function mealReducer(state: MealEntry[], action: MealAction): MealEntry[] {
  switch (action.type) {
    case 'add':
      return [
        {
          id: createId(),
          capturedAt: new Date().toISOString(),
          photoUri: undefined,
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
