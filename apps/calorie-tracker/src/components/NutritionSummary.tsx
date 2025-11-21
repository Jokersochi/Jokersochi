import { LinearGradient } from 'expo-linear-gradient';
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
    const calorieProgress = Math.min(100, Math.round((totals.calories / target.calories) * 100));
    const proteinProgress = Math.min(100, Math.round((totals.protein / target.protein) * 100));
    const carbsProgress = Math.min(100, Math.round((totals.carbs / target.carbs) * 100));
    const fatProgress = Math.min(100, Math.round((totals.fat / target.fat) * 100));

    return (
      <LinearGradient
        colors={[palette.surfaceElevated, palette.surfaceMuted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Сводка за день</Text>
            <Text style={styles.subtitle}>Цель: {target.calories} ккал</Text>
          </View>
          <View style={styles.pulsePill}>
            <Text style={styles.pulseText}>AI баланс</Text>
          </View>
        </View>
        <View style={styles.calorieRow}>
          <LinearGradient
            colors={[palette.primary, palette.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.highlightBox}
          >
            <Text style={styles.metricTitle}>Калории</Text>
            <Text style={styles.metricValue}>{totals.calories}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${calorieProgress}%` }]} />
            </View>
            <Text style={styles.metricDelta}>Осталось {formatDelta(totals.calories, target.calories)}</Text>
          </LinearGradient>
          <View style={styles.statBlock}>
            <Text style={styles.statLabel}>Баланс</Text>
            <Text style={styles.statValue}>{formatDelta(totals.calories, target.calories)} ккал</Text>
            <Text style={styles.statHint}>Плотность блюд оптимальна</Text>
          </View>
        </View>
        <View style={styles.macroProgressRow}>
          <View style={styles.macroProgressItem}>
            <Text style={styles.macroProgressLabel}>Белки</Text>
            <View style={styles.progressTrackMuted}>
              <View style={[styles.progressFillPrimary, { width: `${proteinProgress}%` }]} />
            </View>
            <Text style={styles.macroProgressValue}>
              {totals.protein} г / {target.protein} г
            </Text>
          </View>
          <View style={styles.macroProgressItem}>
            <Text style={styles.macroProgressLabel}>Углеводы</Text>
            <View style={styles.progressTrackMuted}>
              <View style={[styles.progressFillAmber, { width: `${carbsProgress}%` }]} />
            </View>
            <Text style={styles.macroProgressValue}>
              {totals.carbs} г / {target.carbs} г
            </Text>
          </View>
          <View style={styles.macroProgressItem}>
            <Text style={styles.macroProgressLabel}>Жиры</Text>
            <View style={styles.progressTrackMuted}>
              <View style={[styles.progressFillEmerald, { width: `${fatProgress}%` }]} />
            </View>
            <Text style={styles.macroProgressValue}>
              {totals.fat} г / {target.fat} г
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <LinearGradient
            colors={[palette.surface, palette.surfaceMuted]}
            style={styles.metricBox}
          >
            <Text style={styles.metricTitle}>Белки</Text>
            <Text style={styles.metricValue}>{totals.protein} г</Text>
            <Text style={styles.metricDelta}>{formatDelta(totals.protein, target.protein)} г</Text>
          </LinearGradient>
          <LinearGradient
            colors={[palette.surface, palette.surfaceMuted]}
            style={styles.metricBox}
          >
            <Text style={styles.metricTitle}>Жиры</Text>
            <Text style={styles.metricValue}>{totals.fat} г</Text>
            <Text style={styles.metricDelta}>{formatDelta(totals.fat, target.fat)} г</Text>
          </LinearGradient>
          <LinearGradient
            colors={[palette.surface, palette.surfaceMuted]}
            style={styles.metricBox}
          >
            <Text style={styles.metricTitle}>Углеводы</Text>
            <Text style={styles.metricValue}>{totals.carbs} г</Text>
            <Text style={styles.metricDelta}>{formatDelta(totals.carbs, target.carbs)} г</Text>
          </LinearGradient>
        </View>
        <LinearGradient
          colors={[palette.glowStrong, palette.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tipCard}
        >
          <Text style={styles.tipBadge}>Совет дня</Text>
          <Text style={styles.tipTitle}>Снимайте под углом 45°</Text>
          <Text style={styles.tipText}>
            Камера точнее оценивает объем и глубину, а AI будет ближе к ресторанной точности.
          </Text>
        </LinearGradient>
      </LinearGradient>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitles: {
    gap: 4,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
  },
  pulsePill: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  pulseText: {
    color: palette.accent,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  calorieRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  highlightBox: {
    flex: 1.2,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  statBlock: {
    flex: 0.8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statHint: {
    color: palette.textMuted,
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#ffffff30',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0B1120',
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroProgressRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroProgressItem: {
    flex: 1,
    backgroundColor: palette.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  macroProgressLabel: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressTrackMuted: {
    height: 8,
    backgroundColor: '#ffffff15',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFillPrimary: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  progressFillAmber: {
    height: '100%',
    backgroundColor: palette.amberHalo,
  },
  progressFillEmerald: {
    height: '100%',
    backgroundColor: palette.emeraldHalo,
  },
  macroProgressValue: {
    color: palette.text,
    fontWeight: '700',
  },
  metricBox: {
    flex: 1,
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
    color: palette.text,
    marginTop: spacing.xs,
    fontSize: 14,
  },
  tipCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  tipBadge: {
    color: '#0B1120',
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tipTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  tipText: {
    color: palette.textMuted,
    lineHeight: 18,
  },
});
