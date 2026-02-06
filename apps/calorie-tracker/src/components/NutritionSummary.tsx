import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MacroBreakdown } from '../types/meal';
import { palette, radius, spacing } from '../theme/colors';

export interface NutritionSummaryProps {
  totals: MacroBreakdown;
  target?: MacroBreakdown;
}

const defaultTarget: MacroBreakdown = {
  calories: 2100,
  protein: 140,
  carbs: 220,
  fat: 70,
};

const formatDelta = (value: number, target: number) => {
  const delta = target - value;
  const sign = delta >= 0 ? '+' : '−';
  return `${sign}${Math.abs(delta)}`;
};

export const NutritionSummary = memo(
  ({ totals, target = defaultTarget }: NutritionSummaryProps) => {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Сводка за день</Text>
          <Text style={styles.subtitle}>Цель: {target.calories} ккал</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Калории</Text>
            <Text style={styles.metricValue}>{totals.calories}</Text>
            <Text style={styles.metricDelta}>
              Осталось {formatDelta(totals.calories, target.calories)}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Белки</Text>
            <Text style={styles.metricValue}>{totals.protein} г</Text>
            <Text style={styles.metricDelta}>
              {formatDelta(totals.protein, target.protein)} г
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Жиры</Text>
            <Text style={styles.metricValue}>{totals.fat} г</Text>
            <Text style={styles.metricDelta}>
              {formatDelta(totals.fat, target.fat)} г
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricTitle}>Углеводы</Text>
            <Text style={styles.metricValue}>{totals.carbs} г</Text>
            <Text style={styles.metricDelta}>
              {formatDelta(totals.carbs, target.carbs)} г
            </Text>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  metricTitle: {
    color: palette.textMuted,
    fontSize: 13,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: palette.text,
    fontSize: 22,
    fontWeight: '700',
  },
  metricDelta: {
    color: palette.primary,
    marginTop: spacing.xs,
    fontSize: 14,
  },
});
