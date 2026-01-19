import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, StyleSheet, Platform } from 'react-native';

import COLORS from '../theme/colors';

function AwardsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.title}>Awards</Text>
        <Text style={styles.body}>
          Add award listings, filters, and winners once you are ready.
        </Text>
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
    fontSize: 26,
    marginBottom: 12,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  body: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AwardsScreen;
