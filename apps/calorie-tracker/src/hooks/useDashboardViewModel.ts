import { useMemo } from 'react';
import { useMealLog } from './useMealLog';

const dictionary = {
  ru: {
    greeting: (name: string) => `Привет, ${name} 👋`,
    greetingFallback: 'Привет 👋',
    subtitle: (goalCalories: number) =>
      `Сделайте фото блюда или добавьте вручную. Мы посчитаем КБЖУ и поможем удерживать цель ${goalCalories} ккал.`,
    loadingProfile: 'Загружаем профиль…',
    emptyProfile: 'Профиль не заполнен. Добавьте имя и цель калорий.',
    streakLabel: (streakDays: number) => `Серия: ${streakDays} дн.`,
    today: 'Сегодня',
    emptyMeals: 'Пока нет приёмов пищи за сегодня.',
  },
  en: {
    greeting: (name: string) => `Hi, ${name} 👋`,
    greetingFallback: 'Hi 👋',
    subtitle: (goalCalories: number) =>
      `Take a meal photo or add it manually. We will calculate macros and help you stay on your ${goalCalories} kcal goal.`,
    loadingProfile: 'Loading profile…',
    emptyProfile: 'Profile is empty. Add your name and calorie goal.',
    streakLabel: (streakDays: number) => `Streak: ${streakDays} days`,
    today: 'Today',
    emptyMeals: 'No meals logged for today yet.',
  },
};

type SupportedLocale = keyof typeof dictionary;

const resolveLocale = (): SupportedLocale => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();

  if (locale.startsWith('ru')) {
    return 'ru';
  }

  return 'en';
};

export const useDashboardViewModel = () => {
  const { meals, totals, addMeal, profile, streakDays, calorieGoal, isProfileLoading } = useMealLog();

  const locale = resolveLocale();
  const t = dictionary[locale];

  const target = useMemo(
    () => ({
      calories: calorieGoal,
      protein: profile?.macroGoal.protein ?? 140,
      carbs: profile?.macroGoal.carbs ?? 220,
      fat: profile?.macroGoal.fat ?? 70,
    }),
    [calorieGoal, profile?.macroGoal.carbs, profile?.macroGoal.fat, profile?.macroGoal.protein]
  );

  return {
    meals,
    totals,
    target,
    addMeal,
    isProfileLoading,
    isProfileEmpty: !isProfileLoading && !profile,
    greeting: profile ? t.greeting(profile.name) : t.greetingFallback,
    subtitle: t.subtitle(calorieGoal),
    streakLabel: t.streakLabel(streakDays),
    todayLabel: t.today,
    emptyMealsLabel: t.emptyMeals,
    loadingProfileLabel: t.loadingProfile,
    emptyProfileLabel: t.emptyProfile,
  };
};
