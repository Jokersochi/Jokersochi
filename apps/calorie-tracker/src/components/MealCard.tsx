import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
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
  const confidencePercent = meal.recognition ? Math.round(meal.recognition.confidence * 100) : null;
  const inferenceTone = meal.recognition?.inferenceSource === 'cloud' ? palette.accent : palette.primary;

  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <View style={styles.headerRow}>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.type}>{mealTypeLabels[meal.type]}</Text>
          <Text style={styles.title}>{meal.title}</Text>
        </View>
        <View style={styles.timeBadge}>
          <Text style={styles.time}>{formatTime(meal.capturedAt)}</Text>
        </View>
      </View>
      <View style={styles.contentRow}>
        {meal.photoUri ? <Image source={{ uri: meal.photoUri }} style={styles.thumbnail} /> : null}
        <View style={styles.contentText}>
          <View style={styles.macrosRow}>
            <View style={[styles.macro, styles.macroPrimary]}>
              <Text style={styles.macroLabel}>Калории</Text>
              <Text style={styles.macroValue}>{meal.macros.calories} ккал</Text>
            </View>
            <View style={styles.macro}>
              <Text style={styles.macroLabel}>Б</Text>
              <Text style={styles.macroValue}>{meal.macros.protein} г</Text>
            </View>
            <View style={styles.macro}>
              <Text style={styles.macroLabel}>Ж</Text>
              <Text style={styles.macroValue}>{meal.macros.fat} г</Text>
            </View>
            <View style={styles.macro}>
              <Text style={styles.macroLabel}>У</Text>
              <Text style={styles.macroValue}>{meal.macros.carbs} г</Text>
            </View>
          </View>
          {meal.recognition ? (
            <View style={styles.recognitionRow}>
              <View style={[styles.sourcePill, { borderColor: inferenceTone }]}>
                <Text style={[styles.recognitionSource, { color: inferenceTone }]}>
                  {meal.recognition.inferenceSource === 'cloud' ? 'Облако' : 'Устройство'} ·{' '}
                  {meal.recognition.modelVersion ?? 'vNext'}
                </Text>
              </View>
              <View style={styles.recognitionMeterRow}>
                <Text style={styles.recognitionConfidence}>
                  {confidencePercent}% точность · {meal.recognition.inferenceLatencyMs} мс
                </Text>
                <View style={styles.recognitionMeterTrack}>
                  <View
                    style={[styles.recognitionMeterFill, { width: `${confidencePercent ?? 0}%`, backgroundColor: inferenceTone }]}
                  />
                </View>
              </View>
              <Text style={styles.recognitionDetails}>
                Порция ≈ {Math.round(meal.recognition.portionGrams)} г
                {meal.recognition.alternatives?.length
                  ? ` · ${meal.recognition.alternatives.map((alt) => alt.label).slice(0, 2).join(', ')}`
                  : ''}
              </Text>
            </View>
          ) : null}
          {meal.notes ? <Text style={styles.notes}>{meal.notes}</Text> : null}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: palette.glow,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitleBlock: {
    gap: 4,
  },
  type: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timeBadge: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  time: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  macro: {
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    minWidth: 72,
  },
  macroPrimary: {
    backgroundColor: palette.glow,
    borderColor: palette.glow,
  },
  macroLabel: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  macroValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
  notes: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  contentRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
  },
  contentText: {
    flex: 1,
    gap: spacing.xs,
  },
  recognitionRow: {
    gap: 4,
  },
  sourcePill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  recognitionSource: {
    fontSize: 12,
    fontWeight: '700',
  },
  recognitionMeterRow: {
    gap: spacing.xs,
  },
  recognitionConfidence: {
    color: palette.text,
    fontSize: 12,
    fontWeight: '600',
  },
  recognitionMeterTrack: {
    height: 6,
    backgroundColor: palette.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
  },
  recognitionMeterFill: {
    height: '100%',
    borderRadius: 999,
  },
  recognitionDetails: {
    color: palette.textMuted,
    fontSize: 12,
  },
});
