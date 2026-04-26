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
  const [showInfra, setShowInfra] = useState(true);
  const [showGymExperiments, setShowGymExperiments] = useState(true);
  const [showMovieTools, setShowMovieTools] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CollapsibleGroup
          title="Infra"
          subtitle="Environment and connectivity tools"
          expanded={showInfra}
          onToggle={() => setShowInfra((prev) => !prev)}
        >
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
        </CollapsibleGroup>

        <CollapsibleGroup
          title="Gym experiments"
          subtitle="Gym chat and workout-session experiment surfaces"
          expanded={showGymExperiments}
          onToggle={() => setShowGymExperiments((prev) => !prev)}
        >
          <ToolCard
            title="Audio Recorder"
            subtitle="Record, pause, stop, play, and upload to Supabase"
            icon="mic-outline"
            onPress={() => navigation.navigate('TestAudioRecorder')}
          />

          <ToolCard
            title="Voice Gym Coach"
            subtitle="Hands-free gym logging prototype"
            icon="ear-outline"
            onPress={() => navigation.navigate('TestVoiceGymCoach')}
          />

          <ToolCard
            title="Basic Chat"
            subtitle="Legacy gym chat experiment"
            icon="chatbubble-ellipses-outline"
            onPress={() => navigation.navigate('TestGymBasicChat')}
          />

          <ToolCard
            title="Create Workout Session"
            subtitle="Gym workout-session experiment"
            icon="flask-outline"
            onPress={() => navigation.navigate('TestGymCreateWorkoutSession')}
          />
        </CollapsibleGroup>

        <CollapsibleGroup
          title="Movie tools"
          subtitle="New logger and legacy browser"
          expanded={showMovieTools}
          onToggle={() => setShowMovieTools((prev) => !prev)}
        >
          <ToolCard
            title="Movies"
            subtitle="Date-based watch log"
            icon="calendar-outline"
            onPress={() => navigation.navigate('TestMoviesLogger')}
          />

          <ToolCard
            title="Legacy Movies"
            subtitle="Original 5-tab movies experience"
            icon="film-outline"
            onPress={() => navigation.navigate('LegacyMovies')}
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
