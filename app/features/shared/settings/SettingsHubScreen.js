import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';

function SettingsNavCard({ icon, title, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.cardIconWrap}>
        <Ionicons name={icon} size={20} color={COLORS.accent2} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function SettingsHubScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.cardsWrap}>
          <SettingsNavCard
            icon="barbell-outline"
            title="Gym settings"
            subtitle="Muscles, exercises, and machines"
            onPress={() => navigation.navigate('GymSettings')}
          />
          <SettingsNavCard
            icon="film-outline"
            title="Movie settings"
            subtitle="Subscriptions and title catalog"
            onPress={() => navigation.navigate('MovieSettings')}
          />
          <SettingsNavCard
            icon="restaurant-outline"
            title="Food settings"
            subtitle="Inventory, dishes, and utensils"
            onPress={() => navigation.navigate('FoodSettings')}
          />
        </View>
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
  topCard: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardsWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(86,214,234,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(86,214,234,0.16)',
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 12,
  },
});
