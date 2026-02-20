import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { getOrCreateAppUser } from '../../core/api/foodInventoryDb';
import {
  getModuleReadyState,
  setModuleReadyState,
} from '../../core/api/userModuleStateDb';
import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function ModuleReadyChip({ moduleKey, userId, style }) {
  const { user } = useAuth();
  const [resolvedUserId, setResolvedUserId] = useState(userId || null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        setLoading(true);
        let appUserId = userId || null;
        if (!appUserId) {
          const appUser = await getOrCreateAppUser({
            username: user?.username || 'demo user',
            name: user?.name || 'Demo User',
          });
          appUserId = appUser.id;
        }
        if (cancelled) return;
        setResolvedUserId(appUserId);
        const readyState = await getModuleReadyState(appUserId, moduleKey);
        if (!cancelled) {
          setIsReady(readyState);
        }
      } catch (_error) {
        if (!cancelled) {
          setIsReady(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [moduleKey, user?.name, user?.username, userId]);

  const onToggle = async () => {
    if (!resolvedUserId || saving || loading) return;
    const next = !isReady;
    setIsReady(next);
    setSaving(true);

    try {
      await setModuleReadyState(resolvedUserId, moduleKey, next);
    } catch (_error) {
      setIsReady(!next);
    } finally {
      setSaving(false);
    }
  };

  const label = useMemo(() => {
    if (loading) return '...';
    return isReady ? 'Ready' : 'Setup';
  }, [isReady, loading]);

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isReady && styles.chipReady,
        (loading || saving) && styles.chipBusy,
        style,
      ]}
      activeOpacity={0.9}
      onPress={onToggle}
      disabled={loading || saving}
    >
      {loading || saving ? (
        <ActivityIndicator size="small" color={isReady ? COLORS.accent : COLORS.muted} />
      ) : isReady ? (
        <View style={styles.readyIconWrap}>
          <Ionicons name="checkmark" size={11} color={COLORS.bg} />
        </View>
      ) : null}
      <Text style={[styles.label, isReady && styles.labelReady]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 72,
    maxWidth: 86,
    height: 36,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 0,
  },
  chipReady: {
    borderColor: 'rgba(245,201,106,0.55)',
    backgroundColor: 'rgba(245,201,106,0.2)',
  },
  chipBusy: {
    opacity: 0.85,
  },
  readyIconWrap: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  labelReady: {
    color: COLORS.accent,
  },
});

export default ModuleReadyChip;

