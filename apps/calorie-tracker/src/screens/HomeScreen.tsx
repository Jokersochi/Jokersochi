import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
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
import { useMealLog } from '../hooks/useMealLog';
import { palette, radius, spacing } from '../theme/colors';

export const HomeScreen = () => {
  const { meals, totals, addMeal } = useMealLog();
  const [isSheetOpen, setSheetOpen] = useState(false);

  const quickActions = [
    {
      title: 'Умная съемка',
      subtitle: 'HDR + антиблики для вечерних блюд',
      colors: [palette.accent, palette.primary],
    },
    {
      title: 'Скан квитанции',
      subtitle: 'Чек → точный расчет без фото',
      colors: [palette.accentWarm, palette.accentDeep],
    },
  ];

  const focusCards = [
    {
      title: 'Контроль углеводов',
      subtitle: 'Оставайтесь < 220 г для чистой энергии',
      badge: 'AI наблюдает',
      colors: [palette.cyanHalo, palette.primary],
    },
    {
      title: 'Гидратация',
      subtitle: '1.4 л из 2.3 л · добавьте стакан',
      badge: 'Recovery',
      colors: [palette.accentWarm, palette.amberHalo],
    },
    {
      title: 'Серия',
      subtitle: '12 дней без пропусков · 3× streak',
      badge: 'Фокус дня',
      colors: [palette.emeraldHalo, palette.primaryMuted],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient
          colors={[palette.gradientStart, palette.gradientMid, palette.gradientEnd]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <LinearGradient
            colors={[palette.glowStrong, 'transparent']}
            style={styles.heroGlow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroTopRow}>
            <Text style={styles.badge}>AI питания</Text>
            <Text style={styles.streak}>Серия 12 дней</Text>
          </View>
          <Text style={styles.greeting}>Привет, Анна 👋</Text>
          <Text style={styles.subtitle}>
            Распознайте блюдо по фото за секунды, уточните порцию и держите цель
            без рутины.
          </Text>
          <View style={styles.heroPills}>
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Точность</Text>
              <Text style={styles.pillValue}>98.2%</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillLabel}>Лимит на день</Text>
              <Text style={styles.pillValue}>2 100 ккал</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.content}>
          <View style={styles.ribbonRow}>
            {quickActions.map((action) => (
              <LinearGradient
                key={action.title}
                colors={action.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickAction}
              >
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </LinearGradient>
            ))}
          </View>
          <NutritionSummary totals={totals} />
          <View style={styles.focusRow}>
            {focusCards.map((card) => (
              <LinearGradient
                key={card.title}
                colors={card.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.focusCard}
              >
                <View style={styles.focusBadge}>
                  <Text style={styles.focusBadgeText}>{card.badge}</Text>
                </View>
                <Text style={styles.focusTitle}>{card.title}</Text>
                <Text style={styles.focusSubtitle}>{card.subtitle}</Text>
              </LinearGradient>
            ))}
          </View>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Сегодня</Text>
              <Text style={styles.sectionSubtitle}>Ваши приемы с деталями инференса</Text>
            </View>
            <View style={styles.sectionAccent}>
              <Text style={styles.sectionAccentText}>Live</Text>
            </View>
          </View>
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </View>
      </ScrollView>
      <Pressable
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <LinearGradient
          colors={[palette.primary, palette.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
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
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    shadowColor: palette.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    gap: spacing.sm,
  },
  heroGlow: {
    position: 'absolute',
    top: -spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    height: 140,
    borderRadius: radius.lg,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    color: palette.text,
    backgroundColor: palette.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    fontWeight: '700',
    letterSpacing: 0.5,
    shadowColor: palette.glow,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  streak: {
    color: palette.accentWarm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  greeting: {
    color: palette.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  heroPills: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  pillLabel: {
    color: palette.textMuted,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  pillValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    marginTop: -spacing.lg,
  },
  ribbonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: palette.glowStrong,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  quickActionTitle: {
    color: '#0B1120',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  quickActionSubtitle: {
    color: '#0B1120',
    opacity: 0.8,
  },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  focusCard: {
    flexBasis: '48%',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 120,
    overflow: 'hidden',
  },
  focusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B112040',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  focusBadgeText: {
    color: '#0B1120',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  focusTitle: {
    color: '#0B1120',
    fontWeight: '800',
    fontSize: 16,
  },
  focusSubtitle: {
    color: '#0B1120',
    opacity: 0.9,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    color: palette.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  sectionAccent: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionAccentText: {
    color: palette.accent,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.glow,
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  fabPressed: {
    transform: [{ scale: 0.98 }],
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  fabText: {
    color: '#0B1120',
    fontSize: 34,
    fontWeight: '800',
    marginTop: -2,
  },
});
