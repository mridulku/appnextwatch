import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../core/placeholders';
import COLORS from '../../theme/colors';

function SelectedCatalogItemCard({
  title,
  subtitle,
  imageUrl,
  badges = [],
  onPress,
  onRemove,
  removeDisabled = false,
  rightControls,
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftColumn}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>

        {badges.length ? (
          <View style={styles.badgesRow}>
            {badges.map((badge) => (
              <View
                key={`${title}_${badge.label}`}
                style={[styles.badge, badge.tone === 'warn' ? styles.badgeWarn : styles.badgeDefault]}
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
        <View style={styles.removeRow}>
          <TouchableOpacity
            style={[styles.removeButton, removeDisabled && styles.removeButtonDisabled]}
            activeOpacity={0.85}
            disabled={removeDisabled || !onRemove}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color="#FFC19A" />
          </TouchableOpacity>
        </View>

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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 104,
    paddingTop: 6,
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
    width: 114,
    alignItems: 'center',
  },
  removeRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,145,107,0.42)',
    backgroundColor: 'rgba(255,145,107,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.55,
  },
  image: {
    width: 104,
    height: 74,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  controlsWrap: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
});

export default memo(SelectedCatalogItemCard);
