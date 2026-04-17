import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AddMealSheet } from '../components/AddMealSheet';
import { MealCard } from '../components/MealCard';
import { NutritionSummary } from '../components/NutritionSummary';
import { useDashboardViewModel } from '../hooks/useDashboardViewModel';
import { palette, radius, spacing } from '../theme/colors';

export const HomeScreen = () => {
  const {
    meals,
    totals,
    target,
    addMeal,
    greeting,
    subtitle,
    streakLabel,
    todayLabel,
    emptyMealsLabel,
    isProfileLoading,
    isProfileEmpty,
    loadingProfileLabel,
    emptyProfileLabel,
  } = useDashboardViewModel();
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.greeting}>{greeting}</Text>

        {isProfileLoading ? (
          <View style={styles.profileStateRow}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.profileStateText}>{loadingProfileLabel}</Text>
          </View>
        ) : null}

        {isProfileEmpty ? <Text style={styles.profileStateText}>{emptyProfileLabel}</Text> : null}

        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.streak}>{streakLabel}</Text>
        <NutritionSummary totals={totals} target={target} />
        <View>
          <Text style={styles.sectionTitle}>{todayLabel}</Text>
          {meals.length ? (
            meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
          ) : (
            <Text style={styles.emptyMeals}>{emptyMealsLabel}</Text>
          )}
        </View>
      </ScrollView>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
      <AddMealSheet
        visible={isSheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={(payload) => {
          addMeal({
            title: payload.title,
            type: payload.type,
            macros: {
              calories: payload.calories,
              protein: payload.protein,
              carbs: payload.carbs,
              fat: payload.fat,
            },
            notes: payload.notes,
            photoUri: payload.photoUri,
            recognition: payload.recognition,
          });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  greeting: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  streak: {
    color: palette.primary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  profileStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  profileStateText: {
    color: palette.textMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  emptyMeals: {
    color: palette.textMuted,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.98 }],
  },
  fabText: {
    color: '#0B1120',
    fontSize: 34,
    fontWeight: '700',
    marginTop: -4,
  },
});
