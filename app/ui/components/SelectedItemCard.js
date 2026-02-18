import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../core/placeholders';
import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function SelectedItemCard({
  title,
  subtitle,
  imageUrl,
  badges = [],
  onPress,
  onRemove,
  removeDisabled = false,
  rightControls,
  topAction,
  rightAction,
  layout = 'rightThumb',
}) {
  const resolvedTopAction = topAction?.onPress
    ? {
        iconName: topAction.iconName || 'create-outline',
        iconColor: topAction.iconColor || COLORS.text,
        onPress: topAction.onPress,
        disabled: Boolean(topAction.disabled),
      }
    : onRemove
      ? {
          iconName: 'trash-outline',
          iconColor: '#FFC19A',
          onPress: onRemove,
          disabled: removeDisabled,
        }
      : null;

  const hasLegacyLayout = layout === 'rightThumb';
  const resolvedRightAction =
    rightAction ||
    rightControls ||
    (resolvedTopAction ? (
      <TouchableOpacity
        style={[styles.actionButton, resolvedTopAction.disabled && styles.actionButtonDisabled]}
        activeOpacity={0.85}
        disabled={resolvedTopAction.disabled}
        onPress={resolvedTopAction.onPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={resolvedTopAction.iconName} size={15} color={resolvedTopAction.iconColor} />
      </TouchableOpacity>
    ) : null);

  return (
    <TouchableOpacity
      style={[styles.card, hasLegacyLayout && styles.cardLegacy]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftColumn}>
        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={styles.image}
          resizeMode="cover"
        />
      </View>

      <View style={styles.middleColumn}>
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

      <View style={styles.rightColumn}>
        {resolvedRightAction ? resolvedRightAction : <View style={styles.rightActionSpacer} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
    minHeight: UI_TOKENS.card.minHeight,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLegacy: {
    // Kept for backward compatibility of prop, but schema is unified.
  },
  leftColumn: {
    width: UI_TOKENS.card.imageSize,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  rightColumn: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middleColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  actionButton: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,145,107,0.42)',
    backgroundColor: 'rgba(255,145,107,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  rightActionSpacer: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
  },
  image: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
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
    borderColor: 'rgba(255,164,116,0.42)',
    backgroundColor: 'rgba(255,164,116,0.14)',
  },
  badgeText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  badgeDefaultText: {
    color: COLORS.muted,
  },
  badgeWarnText: {
    color: '#FFD8BD',
  },
});

export default memo(SelectedItemCard);
