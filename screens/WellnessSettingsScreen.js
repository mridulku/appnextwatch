import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../theme/colors';

function SettingRow({ title, description, value, onChange }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTextWrap}>
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

function WellnessSettingsScreen({ navigation }) {
  const [isMetric, setIsMetric] = useState(true);
  const [vegPreferred, setVegPreferred] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [softTheme, setSoftTheme] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  const openCategorySelector = () => {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Global preferences for your Fitness / Food cockpit.</Text>

        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person-outline" size={20} color={COLORS.accent2} />
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileName}>Mridul Pant</Text>
            <Text style={styles.profileSubtle}>Wellness profile</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingRow
            title="Metric units"
            description="Use kg and ml across workout and food"
            value={isMetric}
            onChange={setIsMetric}
          />
          <SettingRow
            title="Vegetarian preference"
            description="Prioritize veg recipes and suggestions"
            value={vegPreferred}
            onChange={setVegPreferred}
          />
          <SettingRow
            title="Session notifications"
            description="Reminders for planned workout and cooking"
            value={notificationsOn}
            onChange={setNotificationsOn}
          />
          <SettingRow
            title="Calm theme mode"
            description="Softer visuals for long evening sessions"
            value={softTheme}
            onChange={setSoftTheme}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Data</Text>
          <SettingRow
            title="Auto backup"
            description="Save local session data snapshots"
            value={autoBackup}
            onChange={setAutoBackup}
          />
          <View style={styles.exportRow}>
            <Ionicons name="download-outline" size={16} color={COLORS.accent2} />
            <Text style={styles.exportText}>Export wellness data (dummy action)</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>App Mode</Text>
          <TouchableOpacity style={styles.switchModeRow} activeOpacity={0.9} onPress={openCategorySelector}>
            <View style={styles.switchModeLeft}>
              <View style={styles.switchModeIconWrap}>
                <Ionicons name="grid-outline" size={16} color={COLORS.accent2} />
              </View>
              <View style={styles.switchModeTextWrap}>
                <Text style={styles.switchModeTitle}>Switch category</Text>
                <Text style={styles.switchModeSubtle}>Go back to Movies or Fitness / Food selector</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 3,
    marginBottom: 12,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.3)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  profileSubtle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
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
  rowTextWrap: {
    flex: 1,
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
    lineHeight: 15,
  },
  exportRow: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.3)',
    backgroundColor: 'rgba(90,209,232,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportText: {
    color: '#BEE8F1',
    fontSize: 12,
    fontWeight: '600',
  },
  switchModeRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  switchModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  switchModeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.3)',
    backgroundColor: 'rgba(90,209,232,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeTextWrap: {
    flex: 1,
  },
  switchModeTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  switchModeSubtle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
});

export default WellnessSettingsScreen;
