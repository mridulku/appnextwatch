import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

import COLORS from '../../../theme/colors';
import { useAuth } from '../../../context/AuthContext';
import { usePreferences } from '../../../context/PreferencesContext';
import { COUNTRIES, PLATFORMS } from '../../../data/movies/streaming';

function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { countryCode, setCountryCode, subscriptions, toggleSubscription } =
    usePreferences();
  const displayName = user?.name ?? 'Guest';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const openCategorySelector = () => {
    const rootNavigation = navigation.getParent()?.getParent();
    rootNavigation?.reset({
      index: 0,
      routes: [{ name: 'CategorySelector' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.screenTitle}>Your Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{avatarLetter}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileMeta}>Critic Level 4 • 186 reviews</Text>
          </View>
        </View>
        <View style={styles.profileStats}>
          <TouchableOpacity
            style={styles.statBlockWide}
            onPress={() => navigation.navigate('FilmsWatched')}
            activeOpacity={0.9}
          >
            <Text style={styles.statValue}>92</Text>
            <Text style={styles.statLabel}>Films Watched</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.subscriptionsCard}>
          <Text style={styles.sectionTitle}>My OTT subscriptions</Text>
          <Text style={styles.sectionSubtitle}>
            Select your country and the services you have.
          </Text>
          <View style={styles.countryRow}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country.code}
                style={[
                  styles.countryChip,
                  countryCode === country.code && styles.countryChipActive,
                ]}
                onPress={() => setCountryCode(country.code)}
                activeOpacity={0.8}
              >
                <Text style={styles.countryText}>
                  {country.flag} {country.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.platformLabel}>Subscribed platforms</Text>
          <View style={styles.platformGrid}>
            {PLATFORMS.map((platform) => {
              const isSelected = subscriptions.includes(platform.id);
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={[
                    styles.platformChip,
                    { backgroundColor: platform.color },
                    !isSelected && styles.platformChipInactive,
                  ]}
                  onPress={() => toggleSubscription(platform.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.platformText,
                      { color: platform.textColor },
                      !isSelected && styles.platformTextInactive,
                    ]}
                  >
                    {platform.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <TouchableOpacity
          style={styles.dataButton}
          onPress={() => navigation.navigate('Data')}
        >
          <Text style={styles.dataButtonText}>Open Data Inspector</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.changeCategoryButton}
          onPress={openCategorySelector}
        >
          <Text style={styles.changeCategoryText}>Change Category</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Log out</Text>
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
  screen: {
    padding: 20,
    paddingBottom: 120,
    backgroundColor: COLORS.bg,
  },
  screenTitle: {
    color: COLORS.text,
    fontSize: 24,
    marginBottom: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245,201,106,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '600',
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  profileMeta: {
    color: COLORS.muted,
    marginTop: 4,
  },
  profileStats: {
    marginTop: 18,
  },
  statBlockWide: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    width: '100%',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
  },
  subscriptionsCard: {
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  countryChip: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  countryChipActive: {
    borderColor: COLORS.accent,
  },
  countryText: {
    color: COLORS.text,
    fontSize: 12,
  },
  platformLabel: {
    color: COLORS.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  platformChip: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  platformChipInactive: {
    opacity: 0.4,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '600',
  },
  platformTextInactive: {
    color: COLORS.text,
  },
  dataButton: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.4)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  dataButtonText: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  changeCategoryButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  changeCategoryText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
});

export default ProfileScreen;
