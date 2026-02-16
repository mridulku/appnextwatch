import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../theme/colors';

function FoodSettingsScreen({ navigation }) {
  const openCategorySelector = () => {
    const tabParent = navigation.getParent();
    const rootNavigation = tabParent?.getParent() ?? tabParent ?? navigation;
    rootNavigation.reset({
      index: 0,
      routes: [{ name: 'CategorySelector' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Food Settings</Text>
        <Text style={styles.subtitle}>Switch mode whenever you want.</Text>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.9}
          onPress={openCategorySelector}
        >
          <Text style={styles.actionText}>Back to Categories</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 16,
    fontSize: 13,
  },
  actionButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.45)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default FoodSettingsScreen;
