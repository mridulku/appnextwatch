import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import COLORS from '../theme/colors';

function CollapsibleSection({
  title,
  subtitle,
  icon,
  iconIsEmoji = true,
  countLabel,
  expanded = false,
  onToggle,
  children,
  style,
  contentStyle,
}) {
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle?.();
  };

  return (
    <View style={[styles.sectionWrap, style]}>
      <TouchableOpacity style={styles.headerRow} activeOpacity={0.92} onPress={handleToggle}>
        <View style={styles.leftWrap}>
          <View style={styles.iconWrap}>
            {icon ? (
              iconIsEmoji ? (
                <Text style={styles.iconEmoji}>{icon}</Text>
              ) : (
                <Ionicons name={icon} size={15} color={COLORS.accent2} />
              )
            ) : (
              <Ionicons name="albums-outline" size={15} color={COLORS.accent2} />
            )}
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.trailingWrap}>
          {countLabel ? (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{countLabel}</Text>
            </View>
          ) : null}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.muted}
          />
        </View>
      </TouchableOpacity>

      {children && expanded ? <View style={[styles.contentWrap, contentStyle]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(90,209,232,0.12)',
    marginRight: 10,
  },
  iconEmoji: {
    fontSize: 16,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  trailingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.36)',
    backgroundColor: 'rgba(245,201,106,0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  contentWrap: {
    paddingTop: 8,
  },
});

export default CollapsibleSection;
