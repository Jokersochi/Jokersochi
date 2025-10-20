import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { MealType } from '../types/meal';
import { palette, radius, spacing } from '../theme/colors';

const mealTypeOptions: { label: string; value: MealType }[] = [
  { label: 'Завтрак', value: 'breakfast' },
  { label: 'Обед', value: 'lunch' },
  { label: 'Ужин', value: 'dinner' },
  { label: 'Перекус', value: 'snack' },
];

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
    });

    setTitle('');
    setNotes('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setMealType('lunch');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Добавить блюдо</Text>
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
                  <Text style={[styles.choiceText, isActive && styles.choiceTextActive]}>
                    {option.label}
                  </Text>
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
              <TextInput
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
                style={styles.input}
              />
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
              <Text style={styles.primaryButtonText}>Сохранить</Text>
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
    backgroundColor: palette.surface,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    gap: spacing.sm,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  label: {
    color: palette.textMuted,
    fontSize: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
  },
  choiceChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
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
  },
  secondaryButtonText: {
    color: palette.text,
    fontWeight: '600',
  },
  primaryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
  },
  primaryButtonText: {
    color: '#0B1120',
    fontWeight: '700',
  },
});
