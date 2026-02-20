import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ScrollableTabBar({ tabs, activeKey, onChange, style, density = 'default' }) {
  const scrollRef = useRef(null);
  const tabLayoutsRef = useRef({});
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const overflow = contentWidth > containerWidth + 2;
  const canScrollLeft = overflow && scrollX > 2;
  const canScrollRight = overflow && scrollX + containerWidth < contentWidth - 2;

  const maxScrollX = useMemo(
    () => Math.max(0, contentWidth - containerWidth),
    [contentWidth, containerWidth],
  );

  const scrollBy = (delta) => {
    if (!scrollRef.current) return;
    const target = clamp(scrollX + delta, 0, maxScrollX);
    scrollRef.current.scrollTo({ x: target, animated: true });
  };

  const ensureActiveTabVisible = () => {
    if (!scrollRef.current || !overflow) return;
    const layout = tabLayoutsRef.current[activeKey];
    if (!layout) return;

    const centeredTarget = layout.x - (containerWidth - layout.width) / 2;
    const target = clamp(centeredTarget, 0, maxScrollX);
    scrollRef.current.scrollTo({ x: target, animated: true });
  };

  useEffect(() => {
    const timer = setTimeout(ensureActiveTabVisible, 0);
    return () => clearTimeout(timer);
  }, [activeKey, overflow, containerWidth, contentWidth, maxScrollX]);

  return (
    <View
      style={[
        styles.wrap,
        density === 'compact' ? styles.wrapCompact : null,
        density === 'minimal' ? styles.wrapMinimal : null,
        style,
      ]}
    >
      {canScrollLeft ? (
        <TouchableOpacity
          style={[
            styles.arrowButton,
            density === 'compact' ? styles.arrowButtonCompact : null,
            density === 'minimal' ? styles.arrowButtonMinimal : null,
          ]}
          activeOpacity={0.9}
          onPress={() => scrollBy(-180)}
        >
          <Ionicons name="chevron-back" size={density === 'minimal' ? 14 : 16} color={COLORS.text} />
        </TouchableOpacity>
      ) : null}

      <View
        style={[
          styles.scrollViewport,
          density === 'compact' ? styles.scrollViewportCompact : null,
          density === 'minimal' ? styles.scrollViewportMinimal : null,
        ]}
        onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            density === 'compact' ? styles.scrollContentCompact : null,
            density === 'minimal' ? styles.scrollContentMinimal : null,
          ]}
          onContentSizeChange={(width) => setContentWidth(width)}
          onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
        >
          {tabs.map((tab) => {
            const active = tab.key === activeKey;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.9}
                style={[
                  styles.segmentButton,
                  density === 'compact' ? styles.segmentButtonCompact : null,
                  density === 'minimal' ? styles.segmentButtonMinimal : null,
                  active && styles.segmentButtonActive,
                ]}
                onPress={() => {
                  onChange(tab.key);
                  setTimeout(ensureActiveTabVisible, 0);
                }}
                onLayout={(event) => {
                  tabLayoutsRef.current[tab.key] = event.nativeEvent.layout;
                }}
              >
                <View style={[styles.segmentLabelRow, density === 'minimal' ? styles.segmentLabelRowMinimal : null]}>
                  {tab.icon ? (
                    <Text
                      style={[
                        styles.segmentIcon,
                        density === 'compact' ? styles.segmentIconCompact : null,
                        density === 'minimal' ? styles.segmentIconMinimal : null,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {tab.icon}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.segmentText,
                      density === 'compact' ? styles.segmentTextCompact : null,
                      density === 'minimal' ? styles.segmentTextMinimal : null,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {canScrollRight ? (
        <TouchableOpacity
          style={[
            styles.arrowButton,
            density === 'compact' ? styles.arrowButtonCompact : null,
            density === 'minimal' ? styles.arrowButtonMinimal : null,
          ]}
          activeOpacity={0.9}
          onPress={() => scrollBy(180)}
        >
          <Ionicons name="chevron-forward" size={density === 'minimal' ? 14 : 16} color={COLORS.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: UI_TOKENS.spacing.sm,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    minHeight: 52,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  wrapCompact: {
    marginTop: 6,
    minHeight: 46,
    borderRadius: 16,
    paddingHorizontal: 3,
  },
  wrapMinimal: {
    marginTop: 2,
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 2,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonCompact: {
    width: 30,
    height: 30,
  },
  arrowButtonMinimal: {
    width: 26,
    height: 26,
  },
  scrollViewport: {
    flex: 1,
    minHeight: 44,
  },
  scrollViewportCompact: {
    minHeight: 38,
  },
  scrollViewportMinimal: {
    minHeight: 34,
  },
  scrollContent: {
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
    paddingVertical: 4,
  },
  scrollContentCompact: {
    gap: 4,
    paddingVertical: 2,
  },
  scrollContentMinimal: {
    gap: 3,
    paddingVertical: 1,
  },
  segmentButton: {
    borderRadius: 999,
    paddingHorizontal: UI_TOKENS.spacing.sm + 2,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonCompact: {
    paddingHorizontal: UI_TOKENS.spacing.sm,
    paddingVertical: 6,
    borderRadius: 14,
  },
  segmentButtonMinimal: {
    paddingHorizontal: UI_TOKENS.spacing.xs + 3,
    paddingVertical: 5,
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(245,201,106,0.48)',
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segmentLabelRowMinimal: {
    gap: 3,
  },
  segmentIcon: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    lineHeight: UI_TOKENS.typography.meta + 1,
  },
  segmentIconCompact: {
    fontSize: UI_TOKENS.typography.meta - 1,
  },
  segmentIconMinimal: {
    fontSize: 11,
  },
  segmentText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  segmentTextCompact: {
    fontSize: UI_TOKENS.typography.meta - 1,
  },
  segmentTextMinimal: {
    fontSize: 11,
  },
  segmentTextActive: {
    color: COLORS.accent,
  },
});

export default ScrollableTabBar;
