import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../core/placeholders';
import COLORS from '../../theme/colors';

function CatalogItemCard({
  title,
  subtitle,
  imageUrl,
  onPress,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  primaryActionVariant = 'accent',
  rightControls,
  badges = [],
  selected = false,
}) {
  const actionStyle =
    primaryActionVariant === 'danger'
      ? styles.actionDanger
      : primaryActionVariant === 'success'
        ? styles.actionSuccess
        : primaryActionVariant === 'muted'
          ? styles.actionMuted
          : styles.actionAccent;

  const actionTextStyle =
    primaryActionVariant === 'muted' ? styles.actionTextMuted : styles.actionText;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftColumn}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}

        {badges.length ? (
          <View style={styles.badgesRow}>
            {badges.map((badge) => (
              <View
                key={`${title}_${badge.label}`}
                style={[
                  styles.badge,
                  badge.tone === 'warn' ? styles.badgeWarn : styles.badgeDefault,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    badge.tone === 'warn' ? styles.badgeWarnText : styles.badgeDefaultText,
                  ]}
                >
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.rightColumn}>
        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {primaryActionLabel ? (
          <TouchableOpacity
            style={[styles.actionButton, actionStyle, primaryActionDisabled && styles.actionDisabled]}
            activeOpacity={0.9}
            disabled={primaryActionDisabled || !onPrimaryAction}
            onPress={onPrimaryAction}
          >
            <Text style={[styles.actionText, actionTextStyle]}>{primaryActionLabel}</Text>
          </TouchableOpacity>
        ) : null}

        {rightControls ? <View style={styles.controlsWrap}>{rightControls}</View> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    borderColor: 'rgba(245,201,106,0.56)',
    backgroundColor: 'rgba(245,201,106,0.08)',
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 92,
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeDefault: {
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.12)',
  },
  badgeWarn: {
    borderColor: 'rgba(255,164,116,0.45)',
    backgroundColor: 'rgba(255,164,116,0.16)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeDefaultText: {
    color: COLORS.muted,
  },
  badgeWarnText: {
    color: '#FFB98F',
  },
  rightColumn: {
    width: 112,
    alignItems: 'center',
    paddingBottom: 4,
  },
  thumbnail: {
    width: 104,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  actionButton: {
    minWidth: 80,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: -10,
    borderWidth: 1,
  },
  actionAccent: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(245,201,106,0.8)',
  },
  actionSuccess: {
    backgroundColor: 'rgba(113,228,179,0.18)',
    borderColor: 'rgba(113,228,179,0.42)',
  },
  actionDanger: {
    backgroundColor: 'rgba(255,124,123,0.16)',
    borderColor: 'rgba(255,124,123,0.44)',
  },
  actionMuted: {
    backgroundColor: 'rgba(162,167,179,0.14)',
    borderColor: 'rgba(162,167,179,0.34)',
  },
  actionDisabled: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.bg,
    letterSpacing: 0.3,
  },
  actionTextMuted: {
    color: COLORS.text,
  },
  controlsWrap: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
});

export default memo(CatalogItemCard);
