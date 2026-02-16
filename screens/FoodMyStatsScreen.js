import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import FoodProfileScreen from './FoodProfileScreen';
import {
  createDefaultWellnessProfileData,
  loadWellnessProfileData,
  saveWellnessProfileData,
} from '../core/wellnessProfileStorage';
import COLORS from '../theme/colors';

function FoodMyStatsScreen() {
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

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading food stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <FoodProfileScreen
      title="My Stats"
      subtitle="Targets, adherence, and nutrition history."
      food={profileData.food}
      onUpdateFood={(patch) =>
        setProfileData((prev) => ({
          ...prev,
          food: {
            ...prev.food,
            ...patch,
          },
        }))
      }
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
});

export default FoodMyStatsScreen;
