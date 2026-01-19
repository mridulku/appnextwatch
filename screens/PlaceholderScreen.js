import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, StyleSheet, Platform } from 'react-native';

import COLORS from '../theme/colors';

function PlaceholderScreen({ route }) {
  const { title = 'Placeholder', description = 'This screen is ready for new work.' } =
    route.params || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{description}</Text>
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
    padding: 24,
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  body: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PlaceholderScreen;
