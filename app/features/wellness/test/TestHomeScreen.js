import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../theme/colors';

function ToolCard({ title, subtitle, icon, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.accent2} />
      </View>
      <View style={styles.cardTextWrap}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

function CollapsibleGroup({ title, subtitle, expanded, onToggle, children }) {
  return (
    <View style={styles.groupWrap}>
      <TouchableOpacity style={styles.groupHeader} activeOpacity={0.9} onPress={onToggle}>
        <View style={styles.groupTextWrap}>
          <Text style={styles.groupTitle}>{title}</Text>
          <Text style={styles.groupSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
      </TouchableOpacity>
      {expanded ? <View style={styles.groupContent}>{children}</View> : null}
    </View>
  );
}

function TestHomeScreen({ navigation }) {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showFutureHomeNav, setShowFutureHomeNav] = useState(true);
  const [showFutureGymNav, setShowFutureGymNav] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Test Tools</Text>
        <Text style={styles.subtitle}>Validate environment setup and service connectivity.</Text>

        <ToolCard
          title="Tables"
          subtitle="Supabase config, connection, and table probes"
          icon="server-outline"
          onPress={() => navigation.navigate('TestTables')}
        />

        <ToolCard
          title="OpenAI test connection"
          subtitle="OpenAI config and message round-trip"
          icon="chatbubble-ellipses-outline"
          onPress={() => navigation.navigate('TestChat')}
        />

        <ToolCard
          title="Audio Recorder"
          subtitle="Record, pause, stop, play, and upload to Supabase"
          icon="mic-outline"
          onPress={() => navigation.navigate('TestAudioRecorder')}
        />

        <CollapsibleGroup
          title="Onboarding interfaces"
          subtitle="Sandbox onboarding variants"
          expanded={showOnboarding}
          onToggle={() => setShowOnboarding((prev) => !prev)}
        >
          <ToolCard
            title="Chat Onboarding"
            subtitle="Chat-based onboarding sandbox"
            icon="sparkles-outline"
            onPress={() => navigation.navigate('TestOnboardingSandbox')}
          />

          <ToolCard
            title="Form Onboarding"
            subtitle="Structured inputs + algorithm seed"
            icon="list-outline"
            onPress={() => navigation.navigate('TestFormOnboardingSandbox')}
          />
        </CollapsibleGroup>

        <CollapsibleGroup
          title="Future navigation home"
          subtitle="Screens moved from main wellness tabs"
          expanded={showFutureHomeNav}
          onToggle={() => setShowFutureHomeNav((prev) => !prev)}
        >
          <ToolCard
            title="Home (Later)"
            subtitle="Moved from main wellness tabs"
            icon="home-outline"
            onPress={() => navigation.navigate('TestHomeLater')}
          />

          <ToolCard
            title="Sessions (Later)"
            subtitle="Moved from main wellness tabs"
            icon="pulse-outline"
            onPress={() => navigation.navigate('TestSessionsLater')}
          />
        </CollapsibleGroup>

        <CollapsibleGroup
          title="Future navigation gym"
          subtitle="Legacy gym tabs kept as reference"
          expanded={showFutureGymNav}
          onToggle={() => setShowFutureGymNav((prev) => !prev)}
        >
          <ToolCard
            title="Gym Sessions (Later)"
            subtitle="Legacy gym sessions tab reference"
            icon="reader-outline"
            onPress={() => navigation.navigate('TestGymSessionsLater')}
          />

          <ToolCard
            title="Gym Plan (Later)"
            subtitle="Legacy gym plan tab reference"
            icon="compass-outline"
            onPress={() => navigation.navigate('TestGymPlanLater')}
          />
        </CollapsibleGroup>
      </ScrollView>
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  groupWrap: {
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: 'rgba(17,20,29,0.55)',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  groupTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  groupSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  groupContent: {
    paddingHorizontal: 10,
    paddingBottom: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(90,209,232,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
});

export default TestHomeScreen;
