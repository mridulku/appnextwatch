import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';

function GroupByPills({ value, onChange, options = [], title = 'Group items' }) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.key === value) || options[0];

  return (
    <>
      <TouchableOpacity style={styles.selectorButton} activeOpacity={0.9} onPress={() => setVisible(true)}>
        <Text style={styles.selectorLabel}>Grouped by</Text>
        <View style={styles.selectorValueWrap}>
          <Text style={styles.selectorValue}>{selected?.label || 'None'}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.muted} />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} activeOpacity={0.9} onPress={() => setVisible(false)}>
                <Ionicons name="close" size={18} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsWrap}>
              {options.map((option) => {
                const active = option.key === value;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.optionRow, active ? styles.optionRowActive : null]}
                    activeOpacity={0.9}
                    onPress={() => {
                      onChange?.(option.key);
                      setVisible(false);
                    }}
                  >
                    <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>{option.label}</Text>
                    {active ? <Ionicons name="checkmark" size={16} color={COLORS.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    minHeight: 42,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    justifyContent: 'center',
  },
  selectorLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  selectorValueWrap: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectorValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5,8,16,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: UI_TOKENS.radius.lg,
    borderTopRightRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.25)',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: UI_TOKENS.spacing.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsWrap: {
    gap: UI_TOKENS.spacing.xs,
  },
  optionRow: {
    minHeight: 44,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: UI_TOKENS.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  optionRowActive: {
    borderColor: 'rgba(245,201,106,0.56)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  optionLabel: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: COLORS.accent,
  },
});

export default GroupByPills;
