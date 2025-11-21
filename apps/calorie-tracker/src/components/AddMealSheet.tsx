import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFoodRecognition } from '../hooks/useFoodRecognition';
import type { MealEntry, MealType } from '../types/meal';
import { palette, radius, spacing } from '../theme/colors';

const mealTypeOptions: { label: string; value: MealType }[] = [
  { label: 'Завтрак', value: 'breakfast' },
  { label: 'Обед', value: 'lunch' },
  { label: 'Ужин', value: 'dinner' },
  { label: 'Перекус', value: 'snack' },
];

const formatConfidence = (confidence: number) => `${Math.round(confidence * 100)}% уверенность`;

export interface AddMealSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    type: MealType;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    notes?: string;
    photoUri?: string;
    recognition?: MealEntry['recognition'];
  }) => void;
}

export const AddMealSheet = ({ visible, onClose, onSubmit }: AddMealSheetProps) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [recognitionMeta, setRecognitionMeta] = useState<MealEntry['recognition']>();
  const { captureAndRecognize, error, reset, result, status } = useFoodRecognition();

  const resetFormState = useCallback(() => {
    setTitle('');
    setNotes('');
    setMealType('lunch');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setPhotoUri(undefined);
    setRecognitionMeta(undefined);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!visible) {
      resetFormState();
    }
  }, [visible, resetFormState]);

  useEffect(() => {
    if (!result) {
      return;
    }

    setPhotoUri(result.photoUri);
    setRecognitionMeta({
      label: result.bestCandidate.label,
      confidence: result.bestCandidate.confidence,
      portionGrams: result.portionGrams,
      inferenceSource: result.inference.source,
      inferenceLatencyMs: result.inference.latencyMs,
      modelVersion: result.inference.modelVersion,
      alternatives: result.alternatives,
    });

    setTitle(result.bestCandidate.label);
    setCalories(String(Math.round(result.macros.calories)));
    setProtein(String(Math.round(result.macros.protein)));
    setCarbs(String(Math.round(result.macros.carbs)));
    setFat(String(Math.round(result.macros.fat)));
  }, [result]);

  const isAnalyzing = status === 'capturing' || status === 'analyzing';
  const confidenceText = useMemo(
    () => (recognitionMeta ? formatConfidence(recognitionMeta.confidence) : null),
    [recognitionMeta]
  );

  const handleSubmit = () => {
    if (!title.trim() || !calories || !protein || !carbs || !fat) {
      return;
    }

    onSubmit({
      title: title.trim(),
      type: mealType,
      calories: Number(calories),
      protein: Number(protein),
      carbs: Number(carbs),
      fat: Number(fat),
      notes: notes.trim() || undefined,
      photoUri,
      recognition: recognitionMeta,
    });

    onClose();
  };

  const handleRecognition = async () => {
    await captureAndRecognize();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Добавить блюдо</Text>
            <View style={styles.helperPill}>
              <Text style={styles.helperText}>AI ready</Text>
            </View>
          </View>
          <View style={styles.recognitionBlock}>
            <Text style={styles.label}>Фото и распознавание</Text>
            <View style={styles.recognitionRow}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderText}>
                    Сделайте снимок блюда, чтобы получить расчет КБЖУ
                  </Text>
                </View>
              )}
              <View style={styles.recognitionActions}>
                <Pressable
                  style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
                  onPress={handleRecognition}
                  disabled={isAnalyzing}
                  accessibilityHint="Запустить съемку блюда"
                >
                  <LinearGradient
                    colors={[palette.primary, palette.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.captureGradient}
                  >
                    {isAnalyzing ? (
                      <ActivityIndicator color="#0B1120" />
                    ) : (
                      <Text style={styles.captureButtonText}>Распознать по фото</Text>
                    )}
                  </LinearGradient>
                </Pressable>
                {recognitionMeta ? (
                  <View style={styles.recognitionMeta}>
                    <Text style={styles.recognitionMetaTitle}>{confidenceText}</Text>
                    <Text style={styles.recognitionMetaSubtitle}>
                      Порция ≈ {Math.round(recognitionMeta.portionGrams)} г ·{' '}
                      {recognitionMeta.inferenceSource === 'cloud' ? 'Облако' : 'Устройство'} ·{' '}
                      {recognitionMeta.inferenceLatencyMs} мс
                    </Text>
                    {recognitionMeta.alternatives?.length ? (
                      <Text style={styles.recognitionAlternatives}>
                        Альтернативы: {recognitionMeta.alternatives.map((alt) => alt.label).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </View>
          </View>
          <Text style={styles.label}>Название</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Что вы ели?"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <Text style={styles.label}>Тип приема</Text>
          <View style={styles.choiceRow}>
            {mealTypeOptions.map((option) => {
              const isActive = option.value === mealType;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMealType(option.value)}
                  style={[styles.choiceChip, isActive && styles.choiceChipActive]}
                >
                  <Text style={[styles.choiceText, isActive && styles.choiceTextActive]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricField}>
              <Text style={styles.label}>Калории</Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.metricField}>
              <Text style={styles.label}>Белки</Text>
              <TextInput
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricField}>
              <Text style={styles.label}>Углеводы</Text>
              <TextInput
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
                style={styles.input}
              />
            </View>
            <View style={styles.metricField}>
              <Text style={styles.label}>Жиры</Text>
              <TextInput value={fat} onChangeText={setFat} keyboardType="numeric" style={styles.input} />
            </View>
          </View>
          <Text style={styles.label}>Заметки</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Комментарий или рецепт"
            placeholderTextColor={palette.textMuted}
            style={[styles.input, styles.multiline]}
            multiline
            numberOfLines={3}
          />
          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSubmit}>
              <LinearGradient
                colors={[palette.primary, palette.accentWarm]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGradient}
              >
                <Text style={styles.primaryButtonText}>Сохранить</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surfaceElevated,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  helperPill: {
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
  },
  helperText: {
    color: palette.accent,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  label: {
    color: palette.textMuted,
    fontSize: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  recognitionBlock: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: palette.surfaceMuted,
    gap: spacing.sm,
  },
  recognitionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  recognitionActions: {
    flex: 1,
    gap: spacing.xs,
  },
  captureButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#0B1120',
    fontWeight: '700',
  },
  previewImage: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
  },
  previewPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: '#0B1120',
    opacity: 0.2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  previewPlaceholderText: {
    color: palette.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  recognitionMeta: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 4,
  },
  recognitionMetaTitle: {
    color: palette.text,
    fontWeight: '600',
  },
  recognitionMetaSubtitle: {
    color: palette.textMuted,
    fontSize: 12,
  },
  recognitionAlternatives: {
    color: palette.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#F97066',
    fontSize: 12,
  },
  input: {
    backgroundColor: palette.surfaceMuted,
    color: palette.text,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  multiline: {
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  choiceChipActive: {
    backgroundColor: palette.glow,
    borderColor: palette.glow,
  },
  choiceText: {
    color: palette.text,
  },
  choiceTextActive: {
    color: '#0B1120',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricField: {
    flex: 1,
  },
  actionsRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  secondaryButtonText: {
    color: palette.text,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  primaryGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
