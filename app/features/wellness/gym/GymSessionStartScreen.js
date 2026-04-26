import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function SessionModeCard({ icon, title, accent, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, { borderColor: accent.border, backgroundColor: accent.bg }]} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.iconWrap, { borderColor: accent.border, backgroundColor: accent.iconBg }]}>
        <Ionicons name={icon} size={22} color={accent.icon} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function GymSessionStartScreen({ navigation }) {
  const showPlaceholder = (label) => {
    Alert.alert(label, 'This path is a placeholder right now.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Start Session</Text>
      </View>

      <SessionModeCard
        icon="mic"
        title="Record your session using voice"
        accent={{
          border: 'rgba(90,209,232,0.42)',
          bg: 'rgba(90,209,232,0.08)',
          iconBg: 'rgba(90,209,232,0.16)',
          icon: COLORS.accent2,
        }}
        onPress={() => showPlaceholder('Voice Session')}
      />

      <SessionModeCard
        icon="create-outline"
        title="Record the session manually"
        accent={{
          border: 'rgba(245,201,106,0.42)',
          bg: 'rgba(245,201,106,0.08)',
          iconBg: 'rgba(245,201,106,0.16)',
          icon: COLORS.accent,
        }}
        onPress={() => navigation.navigate('GymSessionCreate', { creationMode: 'manual_now' })}
      />

      <SessionModeCard
        icon="sparkles-outline"
        title="Plan session using AI"
        accent={{
          border: 'rgba(155,124,255,0.34)',
          bg: 'rgba(155,124,255,0.08)',
          iconBg: 'rgba(155,124,255,0.14)',
          icon: '#D5C4FF',
        }}
        onPress={() => showPlaceholder('Plan Session')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  header: {
    marginBottom: UI_TOKENS.spacing.xs,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 4,
    fontWeight: '700',
  },
  card: {
    minHeight: 82,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: UI_TOKENS.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
});
