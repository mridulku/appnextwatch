import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';

import COLORS from '../theme/colors';

function SearchScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.screenTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.muted} />
          <Text style={styles.searchPlaceholder}>Search films, actors, moods</Text>
        </View>
        <Text style={styles.sectionTitle}>Trending Tags</Text>
        <View style={styles.tagRow}>
          {['Hopeful', 'Noir', 'Slow Burn', 'Award Winner', 'Mind-bending'].map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Daily Prompt</Text>
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>Find me a film about redemption.</Text>
          <Text style={styles.promptSub}>We already picked one for you.</Text>
          <View style={styles.promptFooter}>
            <Text style={styles.promptFooterText}>Tap Explore to see it.</Text>
          </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  searchPlaceholder: {
    color: COLORS.muted,
    marginLeft: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagChip: {
    backgroundColor: COLORS.cardSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    color: COLORS.text,
    fontSize: 12,
  },
  sectionSpacing: {
    marginTop: 18,
  },
  promptCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
  },
  promptTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  promptSub: {
    color: COLORS.muted,
    marginTop: 6,
  },
  promptFooter: {
    marginTop: 14,
    backgroundColor: 'rgba(90,209,232,0.1)',
    padding: 10,
    borderRadius: 12,
  },
  promptFooterText: {
    color: COLORS.accent2,
    fontSize: 12,
  },
});

export default SearchScreen;
