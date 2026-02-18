import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../core/placeholders';
import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function CatalogItemCard({
  title,
  subtitle,
  imageUrl,
  selected = false,
  actionLabel = 'ADD',
  actionVariant = 'accent',
  actionDisabled = false,
  onAction,
  onPress,
  rightAction,
  badges = [],
}) {
  const actionStyle =
    actionVariant === 'danger'
      ? styles.actionDanger
      : actionVariant === 'success'
      ? styles.actionSuccess
      : actionVariant === 'muted'
        ? styles.actionMuted
        : styles.actionAccent;

  const actionTextStyle = actionVariant === 'muted' ? styles.actionTextMuted : styles.actionText;

  const resolvedRightAction = rightAction ?? (
    <TouchableOpacity
      style={[styles.action, actionStyle, actionDisabled && styles.actionDisabled]}
      activeOpacity={0.9}
      onPress={onAction}
      disabled={actionDisabled || !onAction}
    >
      <Text style={[styles.actionText, actionTextStyle]}>{actionLabel}</Text>
    </TouchableOpacity>
  );

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.middle}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        {badges.length ? (
          <View style={styles.badgesRow}>
            {badges.slice(0, 2).map((badge) => (
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
                  numberOfLines={1}
                >
                  {badge.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.right}>
        {resolvedRightAction}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
    minHeight: UI_TOKENS.card.minHeight,
  },
  cardSelected: {
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: 'rgba(245,201,106,0.1)',
  },
  left: {
    width: UI_TOKENS.card.imageSize,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
    lineHeight: 20,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: UI_TOKENS.spacing.xs,
    lineHeight: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_TOKENS.spacing.xs,
    marginTop: UI_TOKENS.spacing.xs,
  },
  badge: {
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.xs,
    paddingVertical: 2,
    maxWidth: 120,
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
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  badgeDefaultText: {
    color: COLORS.muted,
  },
  badgeWarnText: {
    color: '#FFB98F',
  },
  right: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  image: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  action: {
    minWidth: 84,
    minHeight: 36,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  actionAccent: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(245,201,106,0.82)',
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
    backgroundColor: 'rgba(162,167,179,0.16)',
    borderColor: 'rgba(162,167,179,0.3)',
  },
  actionDisabled: {
    opacity: 0.7,
  },
  actionText: {
    color: COLORS.bg,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionTextMuted: {
    color: COLORS.text,
  },
});

export default memo(CatalogItemCard);
