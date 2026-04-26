import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { usePreferences } from '../../../context/PreferencesContext';
import { COUNTRIES, PLATFORMS } from '../../../data/movies/streaming';
import COLORS from '../../../theme/colors';

export default function MovieSubscriptionsScreen({ embedded = false }) {
  const { countryCode, setCountryCode, subscriptions, toggleSubscription } = usePreferences();
  const Root = embedded ? View : SafeAreaView;

  return (
    <Root style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Country</Text>
          <View style={styles.chipRow}>
            {COUNTRIES.map((country) => {
              const selected = country.code === countryCode;
              return (
                <TouchableOpacity
                  key={country.code}
                  style={[styles.countryChip, selected ? styles.countryChipActive : null]}
                  activeOpacity={0.9}
                  onPress={() => setCountryCode(country.code)}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.countryLabel, selected ? styles.countryLabelActive : null]}>{country.code}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          <View style={styles.platformList}>
            {PLATFORMS.map((platform) => {
              const selected = subscriptions.includes(platform.id);
              return (
                <TouchableOpacity
                  key={platform.id}
                  style={[styles.platformCard, selected ? styles.platformCardActive : null]}
                  activeOpacity={0.9}
                  onPress={() => toggleSubscription(platform.id)}
                >
                  <View style={[styles.platformSwatch, { backgroundColor: platform.color }]} />
                  <View style={styles.platformCopy}>
                    <Text style={styles.platformTitle}>{platform.name}</Text>
                    <Text style={styles.platformSubtitle}>{selected ? 'Selected for logging' : 'Tap to enable'}</Text>
                  </View>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={selected ? COLORS.accent : COLORS.muted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Root>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24, gap: 16 },
  section: { gap: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  countryChip: {
    minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(162,167,179,0.22)', backgroundColor: COLORS.card,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  countryChipActive: { borderColor: 'rgba(231,191,94,0.42)', backgroundColor: 'rgba(97,84,58,0.3)' },
  countryFlag: { fontSize: 16 },
  countryLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  countryLabelActive: { color: COLORS.accent },
  platformList: { gap: 10 },
  platformCard: {
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(162,167,179,0.2)', backgroundColor: COLORS.card,
    paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  platformCardActive: { borderColor: 'rgba(231,191,94,0.42)', backgroundColor: 'rgba(97,84,58,0.16)' },
  platformSwatch: { width: 26, height: 26, borderRadius: 9 },
  platformCopy: { flex: 1 },
  platformTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  platformSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
});
