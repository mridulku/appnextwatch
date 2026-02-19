import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CatalogItemCard from '../../../../ui/components/CatalogItemCard';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';
import { MUSCLE_GROUPS } from './muscleTaxonomy';
import { getGroupExerciseCount } from './muscleMapping';
import useMuscleCatalog from './useMuscleCatalog';

function ChevronAction() {
  return (
    <View style={styles.chevronAction}>
      <Ionicons name="chevron-forward" size={16} color={COLORS.text} />
    </View>
  );
}

function MusclesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const { loading, error, exercises, refresh } = useMuscleCatalog();

  const groups = useMemo(
    () =>
      MUSCLE_GROUPS.map((group) => ({
        ...group,
        exerciseCount: getGroupExerciseCount(group.key, exercises),
      })),
    [exercises],
  );

  const RootContainer = embedded ? View : SafeAreaView;

  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading muscles...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {showHeader ? (
              <View style={styles.headerWrap}>
                <Text style={styles.title}>Muscles</Text>
                <Text style={styles.subtitle}>Explore exercises by muscle group</Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={refresh}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <CatalogItemCard
            title={item.label}
            subtitle={`${item.subgroups.length} sub-groups • ${item.exerciseCount} exercises`}
            actionLabel="View"
            actionVariant="muted"
            onPress={() =>
              navigation.navigate('MuscleGroup', {
                groupKey: item.key,
                groupLabel: item.label,
              })
            }
            rightAction={<ChevronAction />}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </RootContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  listContent: {
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.xl + 10,
  },
  headerWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  separator: {
    height: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
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
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.42)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: UI_TOKENS.spacing.sm,
    marginBottom: UI_TOKENS.spacing.sm,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
  },
  retryButton: {
    marginTop: UI_TOKENS.spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,124,123,0.5)',
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FFB4A8',
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
});

export default MusclesHomeScreen;
