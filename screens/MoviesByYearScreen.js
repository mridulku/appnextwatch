import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, View, Text, StyleSheet, Platform } from 'react-native';

import COLORS from '../theme/colors';

function MoviesByYearScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.title}>Movies by Year</Text>
        <Text style={styles.body}>
          Start building timelines, filters, or a year selector here.
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

export default MoviesByYearScreen;
