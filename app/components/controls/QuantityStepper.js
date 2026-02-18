import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../theme/colors';

function QuantityStepper({
  onDecrement,
  onIncrement,
  valueLabel,
  compact = false,
  disabledDecrement = false,
  disabledIncrement = false,
}) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <TouchableOpacity
        style={[styles.button, compact && styles.buttonCompact, disabledDecrement && styles.buttonDisabled]}
        activeOpacity={0.85}
        onPress={onDecrement}
        disabled={disabledDecrement}
      >
        <Ionicons name="remove" size={compact ? 14 : 16} color={COLORS.text} />
      </TouchableOpacity>

      {valueLabel ? <Text style={[styles.value, compact && styles.valueCompact]}>{valueLabel}</Text> : null}

      <TouchableOpacity
        style={[styles.button, styles.buttonAccent, compact && styles.buttonCompact, disabledIncrement && styles.buttonDisabled]}
        activeOpacity={0.85}
        onPress={onIncrement}
        disabled={disabledIncrement}
      >
        <Ionicons name="add" size={compact ? 14 : 16} color={COLORS.bg} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wrapCompact: {
    gap: 6,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  buttonAccent: {
    borderColor: 'rgba(245,201,106,0.8)',
    backgroundColor: COLORS.accent,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  value: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'center',
  },
  valueCompact: {
    minWidth: 0,
    fontSize: 12,
  },
});

export default QuantityStepper;
