import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

import COLORS from '../theme/colors';

function MoreHomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Tools, experiments, and admin utilities.</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardTitle}>Chat</Text>
          <Text style={styles.cardBody}>Talk with the OpenAI assistant.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Data')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardTitle}>Data</Text>
          <Text style={styles.cardBody}>Inspect Supabase tables and rows.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PlaceholderTwo')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardTitle}>Placeholder 2</Text>
          <Text style={styles.cardBody}>Drop in the next flow when ready.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PlaceholderThree')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardTitle}>Placeholder 3</Text>
          <Text style={styles.cardBody}>Reserved for future screens.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PlaceholderFour')}
          activeOpacity={0.9}
        >
          <Text style={styles.cardTitle}>Placeholder 4</Text>
          <Text style={styles.cardBody}>Build the next idea here.</Text>
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
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  title: {
    color: COLORS.text,
    fontSize: 26,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  cardBody: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default MoreHomeScreen;
