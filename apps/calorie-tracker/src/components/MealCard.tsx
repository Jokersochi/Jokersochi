import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MealEntry } from '../types/meal';
import { palette, radius, spacing } from '../theme/colors';

const mealTypeLabels: Record<MealEntry['type'], string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export interface MealCardProps {
  meal: MealEntry;
}

export const MealCard = memo(({ meal }: MealCardProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.type}>{mealTypeLabels[meal.type]}</Text>
        <Text style={styles.time}>{formatTime(meal.capturedAt)}</Text>
      </View>
      <Text style={styles.title}>{meal.title}</Text>
      <View style={styles.macrosRow}>
        <Text style={styles.macro}>{meal.macros.calories} ккал</Text>
        <Text style={styles.macro}>Б: {meal.macros.protein} г</Text>
        <Text style={styles.macro}>Ж: {meal.macros.fat} г</Text>
        <Text style={styles.macro}>У: {meal.macros.carbs} г</Text>
      </View>
      {meal.notes ? <Text style={styles.notes}>{meal.notes}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  type: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  time: {
    color: palette.textMuted,
    fontSize: 14,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  macro: {
    color: palette.text,
    fontSize: 14,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  notes: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
