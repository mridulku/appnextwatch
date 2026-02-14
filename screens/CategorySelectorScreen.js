import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import COLORS from '../theme/colors';
import { APP_CATEGORY, saveCategory } from '../core/categoryMode';

function CategorySelectorScreen({ navigation }) {
  const categories = [
    {
      id: APP_CATEGORY.MOVIES,
      title: 'Movies',
      body: 'Recommendations, discovery, lists, and your profile.',
      icon: 'film-outline',
      routeName: 'MoviesApp',
      enabled: true,
    },
    {
      id: APP_CATEGORY.FITNESS,
      title: 'Fitness',
      body: 'Workout logging mini-app and training notes.',
      icon: 'barbell-outline',
      routeName: 'FitnessApp',
      enabled: true,
    },
    {
      id: 'food',
      title: 'Food',
      body: 'Coming soon',
      icon: 'restaurant-outline',
      enabled: false,
    },
    {
      id: 'travel',
      title: 'Travel',
      body: 'Coming soon',
      icon: 'airplane-outline',
      enabled: false,
    },
    {
      id: 'books',
      title: 'Books',
      body: 'Coming soon',
      icon: 'book-outline',
      enabled: false,
    },
  ];

  const openCategory = async (item) => {
    if (!item.enabled || !item.routeName) return;
    await saveCategory(item.id);
    navigation.reset({
      index: 0,
      routes: [{ name: item.routeName }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.title}>What do you want to use today?</Text>
        <Text style={styles.subtitle}>Switch between focused app modes.</Text>

        <View style={styles.grid}>
          {categories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tile, !item.enabled && styles.tileDisabled]}
              activeOpacity={item.enabled ? 0.88 : 1}
              onPress={() => openCategory(item)}
              disabled={!item.enabled}
            >
              <View style={styles.tileIconWrap}>
                <Ionicons
                  name={item.icon}
                  size={28}
                  color={item.enabled ? COLORS.accent : COLORS.muted}
                />
              </View>
              <Text style={styles.tileTitle}>{item.title}</Text>
              <Text style={styles.tileBody}>{item.body}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    minHeight: 170,
  },
  tileDisabled: {
    opacity: 0.66,
  },
  tileIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(245,201,106,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tileTitle: {
    color: COLORS.text,
    fontSize: 18,
    marginBottom: 6,
    fontFamily: Platform.select({ ios: 'Palatino', android: 'serif' }),
  },
  tileBody: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default CategorySelectorScreen;
