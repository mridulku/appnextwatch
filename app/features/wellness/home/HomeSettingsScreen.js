import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import SettingsProfileScreen from '../../shared/settings/SettingsProfileScreen';
import {
  createDefaultWellnessProfileData,
  loadWellnessProfileData,
  saveWellnessProfileData,
} from '../../../core/storage/wellnessProfileStorage';
import COLORS from '../../../theme/colors';

function HomeSettingsScreen({ navigation }) {
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
  };

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SettingsProfileScreen
      navigation={navigation}
      settings={profileData.settings}
      onUpdateSettings={updateSettings}
      onResetData={resetAllData}
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

export default HomeSettingsScreen;
