import { Ionicons } from '@expo/vector-icons';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../../theme/colors';
import UI_TOKENS from '../tokens';

function FullSheetModal({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <TouchableOpacity style={styles.closeButton} activeOpacity={0.9} onPress={onClose}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>{children}</View>

            <View style={styles.footer}>{footer}</View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '90%',
    borderTopLeftRadius: UI_TOKENS.modal.sheetCornerRadius,
    borderTopRightRadius: UI_TOKENS.modal.sheetCornerRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingTop: UI_TOKENS.modal.topInset,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: UI_TOKENS.spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.title + 6,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: UI_TOKENS.spacing.xs,
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
  },
  closeButton: {
    width: UI_TOKENS.control.iconButton,
    height: UI_TOKENS.control.iconButton,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.32)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
    marginTop: UI_TOKENS.spacing.sm,
  },
  footer: {
    minHeight: UI_TOKENS.modal.footerHeight,
    borderTopWidth: UI_TOKENS.border.hairline,
    borderTopColor: 'rgba(162,167,179,0.16)',
    paddingTop: UI_TOKENS.spacing.sm,
    paddingBottom: UI_TOKENS.spacing.sm,
  },
});

export default FullSheetModal;
