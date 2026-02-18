import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

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
        style={[styles.button, disabledDecrement && styles.buttonDisabled]}
        activeOpacity={0.85}
        onPress={onDecrement}
        disabled={disabledDecrement}
      >
        <Ionicons name="remove" size={14} color={COLORS.text} />
      </TouchableOpacity>

      {valueLabel ? <Text style={[styles.value, compact && styles.valueCompact]}>{valueLabel}</Text> : null}

      <TouchableOpacity
        style={[styles.button, styles.buttonAccent, disabledIncrement && styles.buttonDisabled]}
        activeOpacity={0.85}
        onPress={onIncrement}
        disabled={disabledIncrement}
      >
        <Ionicons name="add" size={14} color={COLORS.bg} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  wrapCompact: {
    gap: UI_TOKENS.spacing.xs,
  },
  button: {
    width: UI_TOKENS.control.stepperButton,
    height: UI_TOKENS.control.stepperButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.34)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
    minWidth: 68,
    textAlign: 'center',
  },
  valueCompact: {
    minWidth: 0,
  },
});

export default QuantityStepper;
