import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CookingSessionHomeScreen from './CookingSessionHomeScreen';
import ExerciseSessionScreen from './ExerciseSessionScreen';
import COLORS from '../theme/colors';

const SEGMENTS = ['Workout', 'Cooking'];

function normalizeSegment(value) {
  if (value === 'Cooking') return 'Cooking';
  if (value === 'Exercise' || value === 'Workout') return 'Workout';
  return 'Workout';
}

function SessionHubScreen({ navigation, route }) {
  const [segment, setSegment] = useState(normalizeSegment(route.params?.initialSegment));

  useEffect(() => {
    setSegment(normalizeSegment(route.params?.initialSegment));
  }, [route.params?.initialSegment]);

  const summary = useMemo(
    () => ({
      mode: segment,
      status: segment === 'Workout' ? 'Workout logger active' : 'Guided cook session ready',
    }),
    [segment],
  );

  const renderContent = () => {
    if (segment === 'Cooking') {
      return <CookingSessionHomeScreen navigation={navigation} embedded showHeader={false} />;
    }

    return <ExerciseSessionScreen embedded />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <View style={styles.topTitleRow}>
            <View>
              <Text style={styles.title}>Sessions</Text>
              <Text style={styles.subtitle}>Run exercise and cooking sessions from one control room.</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons name="pulse-outline" size={13} color={COLORS.accent2} />
              <Text style={styles.badgeText}>{summary.mode}</Text>
            </View>
          </View>

          <Text style={styles.statusLine}>{summary.status}</Text>

          <View style={styles.segmentWrap}>
            {SEGMENTS.map((item) => {
              const active = segment === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  activeOpacity={0.9}
                  onPress={() => setSegment(item)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.contentWrap}>{renderContent()}</View>
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
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(162,167,179,0.12)',
    backgroundColor: COLORS.bg,
  },
  topTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
    maxWidth: 270,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.4)',
    backgroundColor: 'rgba(90,209,232,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: COLORS.accent2,
    fontSize: 11,
    fontWeight: '700',
  },
  statusLine: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 11,
  },
  segmentWrap: {
    marginTop: 10,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    gap: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.48)',
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: COLORS.accent,
  },
  contentWrap: {
    flex: 1,
  },
});

export default SessionHubScreen;
