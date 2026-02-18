import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../core/placeholders';
import COLORS from '../../theme/colors';

function CatalogCardRow({
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
        <Image source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE} style={styles.image} resizeMode="cover" />
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
  },
  cardSelected: {
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: 'rgba(245,201,106,0.1)',
  },
  left: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 84,
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
  right: {
    width: 116,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  image: {
    width: 108,
    height: 82,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  action: {
    marginTop: 8,
    minWidth: 84,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionTextMuted: {
    color: COLORS.text,
  },
});

export default memo(CatalogCardRow);
