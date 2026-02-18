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
}) {
  const leadingBadge = badges[0];
  const leadingText = leadingBadge?.label || '•';
  const warning = badges.some((badge) => badge.tone === 'warn');

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

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftColumn}>
        <View style={styles.textRow}>
          <View style={[styles.leadingIcon, warning && styles.leadingIconWarn]}>
            <Text style={styles.leadingIconText}>{leadingText}</Text>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightColumn}>
        {resolvedTopAction ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.removeButton, resolvedTopAction.disabled && styles.removeButtonDisabled]}
              activeOpacity={0.85}
              disabled={resolvedTopAction.disabled}
              onPress={resolvedTopAction.onPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={resolvedTopAction.iconName} size={15} color={resolvedTopAction.iconColor} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionRowSpacer} />
        )}

        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={styles.image}
          resizeMode="cover"
        />

        {rightControls ? <View style={styles.controlsWrap}>{rightControls}</View> : null}
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
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  leadingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(162,167,179,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingIconWarn: {
    borderColor: 'rgba(255,164,116,0.42)',
    backgroundColor: 'rgba(255,164,116,0.14)',
  },
  leadingIconText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
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
    width: UI_TOKENS.card.imageSize + UI_TOKENS.spacing.lg,
    alignItems: 'center',
  },
  actionRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: UI_TOKENS.spacing.xs,
  },
  actionRowSpacer: {
    width: '100%',
    height: UI_TOKENS.control.iconButton + UI_TOKENS.spacing.xs,
  },
  removeButton: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(255,145,107,0.42)',
    backgroundColor: 'rgba(255,145,107,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.55,
  },
  image: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  controlsWrap: {
    marginTop: UI_TOKENS.spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
});

export default memo(SelectedItemCard);
