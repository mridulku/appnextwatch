import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import BodyProfileScreen from './BodyProfileScreen';
import {
  createDefaultWellnessProfileData,
  loadWellnessProfileData,
  saveWellnessProfileData,
} from '../core/wellnessProfileStorage';
import COLORS from '../theme/colors';

function GymMyStatsScreen() {
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
          <Text style={styles.loadingText}>Loading body stats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <BodyProfileScreen
      title="My Stats"
      subtitle="Your body metrics and progress dashboard."
      body={profileData.body}
      onUpdateBody={(patch) =>
        setProfileData((prev) => ({
          ...prev,
          body: {
            ...prev.body,
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

export default GymMyStatsScreen;
