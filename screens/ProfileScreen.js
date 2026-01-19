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

import COLORS from '../theme/colors';
import { useAuth } from '../context/AuthContext';

function ProfileScreen() {
  const { user, logout } = useAuth();
  const displayName = user?.name ?? 'Guest';
  const avatarLetter = displayName.charAt(0).toUpperCase();

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
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>92</Text>
            <Text style={styles.statLabel}>Films Watched</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Lists</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>4.6</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
        <View style={styles.profileFooter}>
          <Text style={styles.profileFooterTitle}>Taste Notes</Text>
          <Text style={styles.profileFooterText}>
            You gravitate toward hopeful narratives, subtle scores, and character-driven
            pacing.
          </Text>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  statBlock: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    width: '31%',
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
  profileFooter: {
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
  },
  profileFooterTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  profileFooterText: {
    color: COLORS.muted,
    marginTop: 8,
    lineHeight: 20,
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
