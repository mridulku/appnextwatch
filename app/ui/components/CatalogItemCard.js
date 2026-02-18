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
}) {
  const actionStyle =
    actionVariant === 'success'
      ? styles.actionSuccess
      : actionVariant === 'muted'
        ? styles.actionMuted
        : styles.actionAccent;

  const actionTextStyle = actionVariant === 'muted' ? styles.actionTextMuted : styles.actionText;

  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      </View>

      <View style={styles.right}>
        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={styles.image}
          resizeMode="cover"
        />

        <TouchableOpacity
          style={[styles.action, actionStyle, actionDisabled && styles.actionDisabled]}
          activeOpacity={0.9}
          onPress={onAction}
          disabled={actionDisabled || !onAction}
        >
          <Text style={[styles.actionText, actionTextStyle]}>{actionLabel}</Text>
        </TouchableOpacity>
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
    flex: 1,
    justifyContent: 'center',
    paddingRight: UI_TOKENS.spacing.xs,
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
  right: {
    width: UI_TOKENS.card.imageSize + UI_TOKENS.spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: UI_TOKENS.spacing.xs,
    minWidth: 84,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    alignItems: 'center',
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
