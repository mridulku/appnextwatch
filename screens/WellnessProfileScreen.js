import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import BodyProfileScreen from './BodyProfileScreen';
import FoodProfileScreen from './FoodProfileScreen';
import SettingsProfileScreen from './SettingsProfileScreen';
import {
  createDefaultWellnessProfileData,
  loadWellnessProfileData,
  saveWellnessProfileData,
} from '../core/wellnessProfileStorage';
import COLORS from '../theme/colors';

const PROFILE_SEGMENTS = ['Body', 'Food', 'Settings'];

function WellnessProfileScreen({ navigation }) {
  const [segment, setSegment] = useState('Body');
  const [profileData, setProfileData] = useState(() => createDefaultWellnessProfileData());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadWellnessProfileData().then((data) => {
      if (!isMounted) return;
      setProfileData(data);
      setHydrated(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWellnessProfileData(profileData);
  }, [hydrated, profileData]);

  const overview = useMemo(() => {
    return {
      weightKg: Number(profileData.body.weightKg).toFixed(1),
      calories: Math.round(Number(profileData.food.caloriesTarget) || 0),
      goal: profileData.food.goalType,
    };
  }, [profileData.body.weightKg, profileData.food.caloriesTarget, profileData.food.goalType]);

  const updateBody = (patch) => {
    setProfileData((prev) => ({
      ...prev,
      body: {
        ...prev.body,
        ...patch,
      },
    }));
  };

  const updateFood = (patch) => {
    setProfileData((prev) => ({
      ...prev,
      food: {
        ...prev.food,
        ...patch,
      },
    }));
  };

  const updateSettings = (patch) => {
    setProfileData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  };

  const resetAllData = () => {
    setProfileData(createDefaultWellnessProfileData());
    setSegment('Body');
  };

  const renderSegmentContent = () => {
    if (segment === 'Food') {
      return <FoodProfileScreen food={profileData.food} onUpdateFood={updateFood} />;
    }

    if (segment === 'Settings') {
      return (
        <SettingsProfileScreen
          navigation={navigation}
          settings={profileData.settings}
          onUpdateSettings={updateSettings}
          onResetData={resetAllData}
        />
      );
    }

    return <BodyProfileScreen body={profileData.body} onUpdateBody={updateBody} />;
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.title}>Profile</Text>
              <Text style={styles.subtitle}>Body, nutrition, and preferences in one place.</Text>
            </View>
          </View>

          <View style={styles.quickStatsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview.weightKg} kg</Text>
              <Text style={styles.statLabel}>current weight</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview.calories}</Text>
              <Text style={styles.statLabel}>daily calories</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview.goal}</Text>
              <Text style={styles.statLabel}>nutrition goal</Text>
            </View>
          </View>

          <View style={styles.segmentWrap}>
            {PROFILE_SEGMENTS.map((item) => {
              const active = segment === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  activeOpacity={0.9}
                  onPress={() => setSegment(item)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.contentWrap}>{renderSegmentContent()}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  topCard: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    backgroundColor: COLORS.bg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
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
    maxWidth: 300,
  },
  quickStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  segmentWrap: {
    marginTop: 10,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.48)',
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: COLORS.accent,
  },
  contentWrap: {
    flex: 1,
  },
});

export default WellnessProfileScreen;
