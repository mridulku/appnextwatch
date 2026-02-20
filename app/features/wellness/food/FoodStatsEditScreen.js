import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import useFoodStats from '../../../hooks/useFoodStats';
import CategoryChipsRow from '../../../ui/components/CategoryChipsRow';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const DIET_OPTIONS = ['veg', 'non-veg', 'eggetarian', 'other'];

function parseOptionalNumber(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function Card({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function FoodStatsEditScreen({ navigation }) {
  const { user } = useAuth();
  const {
    loading,
    error,
    stats,
    hydrate,
    saveFoodProfile,
    saveFoodTargets,
    clearFoodStats,
  } = useFoodStats(user);

  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [dietPreference, setDietPreference] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    setProtein(stats.foodTargets.proteinG ? String(Math.round(stats.foodTargets.proteinG)) : '');
    setCalories(stats.foodTargets.caloriesKcal ? String(Math.round(stats.foodTargets.caloriesKcal)) : '');
    setCarbs(stats.foodTargets.carbsG ? String(Math.round(stats.foodTargets.carbsG)) : '');
    setFat(stats.foodTargets.fatG ? String(Math.round(stats.foodTargets.fatG)) : '');
    setDietPreference(stats.foodProfile.dietPreference || '');
    setShowAdvanced(Boolean(stats.foodTargets.caloriesKcal || stats.foodTargets.carbsG || stats.foodTargets.fatG));
  }, [
    stats.foodProfile.dietPreference,
    stats.foodTargets.caloriesKcal,
    stats.foodTargets.carbsG,
    stats.foodTargets.fatG,
    stats.foodTargets.proteinG,
  ]);

  const hasChanges = useMemo(() => {
    const nextProtein = parseOptionalNumber(protein);
    const nextCalories = parseOptionalNumber(calories);
    const nextCarbs = parseOptionalNumber(carbs);
    const nextFat = parseOptionalNumber(fat);
    const nextDiet = String(dietPreference || '').trim();

    return (
      nextProtein !== (stats.foodTargets.proteinG || null)
      || nextCalories !== (stats.foodTargets.caloriesKcal || null)
      || nextCarbs !== (stats.foodTargets.carbsG || null)
      || nextFat !== (stats.foodTargets.fatG || null)
      || nextDiet !== (stats.foodProfile.dietPreference || '')
    );
  }, [
    calories,
    carbs,
    dietPreference,
    fat,
    protein,
    stats.foodProfile.dietPreference,
    stats.foodTargets.caloriesKcal,
    stats.foodTargets.carbsG,
    stats.foodTargets.fatG,
    stats.foodTargets.proteinG,
  ]);

  const onSave = async () => {
    const nextProtein = parseOptionalNumber(protein);
    const nextCalories = parseOptionalNumber(calories);
    const nextCarbs = parseOptionalNumber(carbs);
    const nextFat = parseOptionalNumber(fat);

    if (nextProtein !== null && (nextProtein < 20 || nextProtein > 400)) {
      Alert.alert('Invalid protein target', 'Protein target should be between 20 and 400 g/day.');
      return;
    }
    if (nextCalories !== null && (nextCalories < 800 || nextCalories > 6000)) {
      Alert.alert('Invalid calories target', 'Calories target should be between 800 and 6000 kcal/day.');
      return;
    }
    if (nextCarbs !== null && (nextCarbs < 20 || nextCarbs > 900)) {
      Alert.alert('Invalid carbs target', 'Carbs target should be between 20 and 900 g/day.');
      return;
    }
    if (nextFat !== null && (nextFat < 10 || nextFat > 300)) {
      Alert.alert('Invalid fat target', 'Fat target should be between 10 and 300 g/day.');
      return;
    }

    try {
      setSaving(true);
      setInlineError('');
      await saveFoodProfile({
        dietPreference: String(dietPreference || '').trim(),
      });
      await saveFoodTargets({
        proteinG: nextProtein,
        caloriesKcal: showAdvanced ? nextCalories : null,
        carbsG: showAdvanced ? nextCarbs : null,
        fatG: showAdvanced ? nextFat : null,
      });
      navigation.goBack();
    } catch (nextError) {
      setInlineError(nextError?.message || 'Could not save food stats.');
    } finally {
      setSaving(false);
    }
  };

  const onClearAll = () => {
    Alert.alert('Clear all Food stats?', 'This will remove saved targets and food profile settings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearFoodStats();
            navigation.goBack();
          } catch (nextError) {
            setInlineError(nextError?.message || 'Could not clear food stats.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading edit form...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card title="Targets" subtitle="Set nutrition goals for your daily routine.">
          <Text style={styles.fieldLabel}>Protein target (g/day)</Text>
          <TextInput
            value={protein}
            onChangeText={setProtein}
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 140"
            placeholderTextColor={COLORS.muted}
          />

          <TouchableOpacity
            style={styles.advancedToggle}
            activeOpacity={0.9}
            onPress={() => setShowAdvanced((prev) => !prev)}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Hide advanced macros' : 'Show advanced macros'}
            </Text>
          </TouchableOpacity>

          {showAdvanced ? (
            <View style={styles.advancedWrap}>
              <Text style={styles.fieldLabel}>Calories target (kcal/day)</Text>
              <TextInput
                value={calories}
                onChangeText={setCalories}
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g. 2400"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>Carbs target (g/day)</Text>
              <TextInput
                value={carbs}
                onChangeText={setCarbs}
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g. 260"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.fieldLabel}>Fat target (g/day)</Text>
              <TextInput
                value={fat}
                onChangeText={setFat}
                style={styles.input}
                keyboardType="numeric"
                placeholder="e.g. 70"
                placeholderTextColor={COLORS.muted}
              />
            </View>
          ) : null}
        </Card>

        <Card title="Profile" subtitle="Food preference for planning defaults.">
          <Text style={styles.fieldLabel}>Dietary preference</Text>
          <CategoryChipsRow
            categories={DIET_OPTIONS}
            selectedCategory={dietPreference}
            onSelectCategory={setDietPreference}
          />
        </Card>

        {error || inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError || error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || saving) && styles.buttonDisabled]}
          activeOpacity={0.9}
          onPress={onSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.bg} />
          ) : (
            <Text style={styles.saveButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} activeOpacity={0.9} onPress={onClearAll}>
          <Text style={styles.clearButtonText}>Clear all Food stats</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 3,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  fieldLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
    marginTop: UI_TOKENS.spacing.xs,
  },
  input: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    color: COLORS.text,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 11,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  advancedToggle: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: UI_TOKENS.spacing.xs,
    alignSelf: 'flex-start',
  },
  advancedToggleText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  advancedWrap: {
    gap: UI_TOKENS.spacing.xs,
  },
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  saveButton: {
    borderRadius: UI_TOKENS.radius.md,
    backgroundColor: COLORS.accent,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  clearButton: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.45)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});

export default FoodStatsEditScreen;
