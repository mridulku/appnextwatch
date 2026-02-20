import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function SegmentedControl({
  items = [],
  selectedIndex = 0,
  onChange,
  variant = 'primary',
  style,
}) {
  const isSecondary = variant === 'secondary';

  return (
    <View style={[styles.wrap, isSecondary ? styles.wrapSecondary : null, style]}>
      {items.map((item, index) => {
        const active = index === selectedIndex;
        return (
          <TouchableOpacity
            key={item.key || item.label || String(index)}
            activeOpacity={0.9}
            onPress={() => onChange?.(index, item)}
            style={[
              styles.segment,
              isSecondary ? styles.segmentSecondary : null,
              active ? styles.segmentActive : null,
              active && isSecondary ? styles.segmentActiveSecondary : null,
            ]}
          >
            <View style={styles.labelRow}>
              {item.icon ? (
                <Text
                  style={[
                    styles.iconText,
                    isSecondary ? styles.iconTextSecondary : null,
                    active ? styles.textActive : null,
                  ]}
                  numberOfLines={1}
                >
                  {item.icon}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.text,
                  isSecondary ? styles.textSecondary : null,
                  active ? styles.textActive : null,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    borderRadius: 15,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    minHeight: 44,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wrapSecondary: {
    marginTop: 0,
    minHeight: 38,
    borderRadius: 13,
    padding: 2,
    gap: 3,
    backgroundColor: 'rgba(162,167,179,0.08)',
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.xs,
  },
  segmentSecondary: {
    minHeight: 32,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  segmentActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.48)',
  },
  segmentActiveSecondary: {
    backgroundColor: 'rgba(245,201,106,0.18)',
  },
  labelRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 13,
  },
  iconTextSecondary: {
    fontSize: 11,
    lineHeight: 12,
  },
  text: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta - 1,
    fontWeight: '700',
  },
  textSecondary: {
    fontSize: 11,
  },
  textActive: {
    color: COLORS.accent,
  },
});

export default SegmentedControl;

