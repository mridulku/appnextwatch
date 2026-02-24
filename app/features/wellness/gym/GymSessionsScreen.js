import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';
import CatalogItemCard from '../../../ui/components/CatalogItemCard';
import useGymSessions from '../../../hooks/useGymSessions';

function formatCreatedAt(iso) {
  if (!iso) return 'Recent';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusMeta(status) {
  if (status === 'in_progress') {
    return { label: 'In progress', badgeTone: 'warn' };
  }
  if (status === 'complete') {
    return { label: 'Complete', badgeTone: 'default' };
  }
  return { label: 'Not started', badgeTone: 'default' };
}

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function GymSessionsScreen() {
  const navigation = useNavigation();
  const sessionsApi = useGymSessions();

  useFocusEffect(
    useCallback(() => {
      sessionsApi.refresh();
    }, [sessionsApi.refresh]),
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sessionsApi.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{sessionsApi.error}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={sessionsApi.refresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {sessionsApi.loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        ) : sessionsApi.sessions.length > 0 ? (
          <View style={styles.listWrap}>
            {sessionsApi.sessions.map((session) => {
              const statusMeta = getStatusMeta(session.status);
              return (
                <CatalogItemCard
                  key={session.id}
                  title={session.title}
                  subtitle={`${session.exerciseCount || 0} exercises • ${session.totalSets || 0} sets • ${formatCreatedAt(session.createdAt)}`}
                  onPress={() => navigation.navigate('GymSessionWork', { sessionId: session.id })}
                  badges={[{ label: statusMeta.label, tone: statusMeta.badgeTone }]}
                  rightAction={<ChevronAction />}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyStateWrap}>
            <Text style={styles.emptyStateText}>No sessions added yet.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('GymSessionCreate')}
      >
        <Ionicons name="add" size={20} color={COLORS.bg} />
      </TouchableOpacity>
    </View>
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
    paddingBottom: UI_TOKENS.spacing.xl * 2,
  },
  errorCard: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: '#FFB4A8',
    fontWeight: '700',
    fontSize: UI_TOKENS.typography.meta,
  },
  loadingWrap: {
    marginTop: UI_TOKENS.spacing.md,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  chevronAction: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrap: {
    gap: UI_TOKENS.spacing.xs,
  },
  emptyStateWrap: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: UI_TOKENS.spacing.md,
    bottom: UI_TOKENS.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.65)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
});

export default GymSessionsScreen;
