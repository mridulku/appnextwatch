import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';

const WEIGHT_OPTIONS = ['kg', 'lb'];
const HEIGHT_OPTIONS = ['cm', 'ft-in'];
const DIET_OPTIONS = ['veg', 'non-veg', 'eggetarian'];

function SelectionRow({ label, value, options, onChange }) {
  return (
    <View style={styles.selectionRow}>
      <Text style={styles.rowTitle}>{label}</Text>
      <View style={styles.chipsRow}>
        {options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={`${label}_${option}`}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.9}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({ title, description, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtle}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(162,167,179,0.3)', true: 'rgba(245,201,106,0.45)' }}
        thumbColor={value ? COLORS.accent : '#DEE1E7'}
      />
    </View>
  );
}

function SettingsProfileScreen({ navigation, settings, onUpdateSettings, onResetData }) {
  const goToCategorySelector = () => {
    let rootNavigation = navigation;
    while (rootNavigation?.getParent?.()) {
      rootNavigation = rootNavigation.getParent();
    }

    rootNavigation?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'CategorySelector' }],
      }),
    );
  };

  const exportData = () => {
    Alert.alert('Export ready', 'Profile export is a placeholder in v0.');
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset local profile data?',
      'This will restore Body, Food, and profile settings to defaults.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: onResetData },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Preferences, notifications, and data controls.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Units & Preferences</Text>
          <SelectionRow
            label="Weight unit"
            value={settings.weightUnit}
            options={WEIGHT_OPTIONS}
            onChange={(value) => onUpdateSettings({ weightUnit: value })}
          />
          <SelectionRow
            label="Height unit"
            value={settings.heightUnit}
            options={HEIGHT_OPTIONS}
            onChange={(value) => onUpdateSettings({ heightUnit: value })}
          />
          <SelectionRow
            label="Dietary preference"
            value={settings.dietaryPreference}
            options={DIET_OPTIONS}
            onChange={(value) => onUpdateSettings({ dietaryPreference: value })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <ToggleRow
            title="Meal reminders"
            description="Nudges for planned meal windows"
            value={settings.mealReminders}
            onChange={(value) => onUpdateSettings({ mealReminders: value })}
          />
          <ToggleRow
            title="Workout reminders"
            description="Alerts for scheduled session blocks"
            value={settings.workoutReminders}
            onChange={(value) => onUpdateSettings({ workoutReminders: value })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data</Text>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.9} onPress={exportData}>
            <View style={styles.actionLeft}>
              <Ionicons name="download-outline" size={16} color={COLORS.accent2} />
              <Text style={styles.actionText}>Export profile data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.9} onPress={confirmReset}>
            <View style={styles.actionLeft}>
              <Ionicons name="refresh-outline" size={16} color="#FFB9A8" />
              <Text style={[styles.actionText, styles.actionDangerText]}>Reset local profile data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.9} onPress={goToCategorySelector}>
            <View style={styles.actionLeft}>
              <Ionicons name="grid-outline" size={16} color={COLORS.accent2} />
              <Text style={styles.actionText}>Switch app mode</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Privacy</Text>
            <Text style={styles.aboutValue}>Placeholder policy</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 26,
  },
  headerWrap: {
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectionRow: {
    marginBottom: 8,
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  rowSubtle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 7,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: 'rgba(245,201,106,0.45)',
    backgroundColor: 'rgba(245,201,106,0.15)',
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  toggleRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  actionRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  actionDangerText: {
    color: '#FFB9A8',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  aboutLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
  aboutValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SettingsProfileScreen;
