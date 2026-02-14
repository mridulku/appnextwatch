import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import COLORS from './theme/colors';
import ExploreReelsScreen from './screens/ExploreReelsScreen';
import MoviesByYearScreen from './screens/MoviesByYearScreen';
import ProfileScreen from './screens/ProfileScreen';
import MovieDetailScreen from './screens/MovieDetailScreen';
import LoginScreen from './screens/LoginScreen';
import ChatScreen from './screens/ChatScreen';
import DataInspectorScreen from './screens/DataInspectorScreen';
import ActorListScreen from './screens/ActorListScreen';
import ActorDetailScreen from './screens/ActorDetailScreen';
import DirectorListScreen from './screens/DirectorListScreen';
import DirectorDetailScreen from './screens/DirectorDetailScreen';
import AwardsHomeScreen from './screens/AwardsHomeScreen';
import AwardYearsScreen from './screens/AwardYearsScreen';
import AwardCategoriesScreen from './screens/AwardCategoriesScreen';
import AwardNomineesScreen from './screens/AwardNomineesScreen';
import DirectoryScreen from './screens/DirectoryScreen';
import ListsHomeScreen from './screens/ListsHomeScreen';
import ListDetailScreen from './screens/ListDetailScreen';
import FilmsWatchedScreen from './screens/FilmsWatchedScreen';
import GymMachineDetailScreen from './screens/GymMachineDetailScreen';
import ExerciseDetailScreen from './screens/ExerciseDetailScreen';
import CookRecipeScreen from './screens/CookRecipeScreen';
import LibraryHubScreen from './screens/LibraryHubScreen';
import FoodHubScreen from './screens/FoodHubScreen';
import WellnessHomeScreen from './screens/WellnessHomeScreen';
import ExerciseSessionScreen from './screens/ExerciseSessionScreen';
import CookingSessionHomeScreen from './screens/CookingSessionHomeScreen';
import WellnessSettingsScreen from './screens/WellnessSettingsScreen';
import CategorySelectorScreen from './screens/CategorySelectorScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { APP_CATEGORY, getSavedCategory } from './core/categoryMode';

const MovieTab = createBottomTabNavigator();
const WellnessTab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DirectoryStack = createNativeStackNavigator();
const ListsStack = createNativeStackNavigator();
const WellnessExerciseStack = createNativeStackNavigator();
const WellnessCookingStack = createNativeStackNavigator();
const WellnessHomeStack = createNativeStackNavigator();
const WellnessLibraryStack = createNativeStackNavigator();
const WellnessFoodStack = createNativeStackNavigator();
const WellnessSettingsStack = createNativeStackNavigator();

const SHARED_STACK_OPTIONS = {
  headerStyle: { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.bg },
};

function ProfileStackScreens() {
  return (
    <ProfileStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="FilmsWatched"
        component={FilmsWatchedScreen}
        options={{ title: 'Films Watched' }}
      />
      <ProfileStack.Screen
        name="Data"
        component={DataInspectorScreen}
        options={{ title: 'Data' }}
      />
    </ProfileStack.Navigator>
  );
}

function DirectoryStackScreens() {
  return (
    <DirectoryStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <DirectoryStack.Screen
        name="DirectoryHome"
        component={DirectoryScreen}
        options={{ title: 'Directory', headerShown: false }}
      />
      <DirectoryStack.Screen
        name="Movies"
        component={MoviesByYearScreen}
        options={{ title: 'Movies' }}
      />
      <DirectoryStack.Screen
        name="ActorList"
        component={ActorListScreen}
        options={{ title: 'Actors' }}
      />
      <DirectoryStack.Screen
        name="ActorDetail"
        component={ActorDetailScreen}
        options={{ title: 'Actor' }}
      />
      <DirectoryStack.Screen
        name="DirectorList"
        component={DirectorListScreen}
        options={{ title: 'Directors' }}
      />
      <DirectoryStack.Screen
        name="DirectorDetail"
        component={DirectorDetailScreen}
        options={{ title: 'Director' }}
      />
      <DirectoryStack.Screen
        name="AwardsHome"
        component={AwardsHomeScreen}
        options={{ title: 'Awards' }}
      />
      <DirectoryStack.Screen
        name="AwardYears"
        component={AwardYearsScreen}
        options={{ title: 'Years' }}
      />
      <DirectoryStack.Screen
        name="AwardCategories"
        component={AwardCategoriesScreen}
        options={{ title: 'Categories' }}
      />
      <DirectoryStack.Screen
        name="AwardNominees"
        component={AwardNomineesScreen}
        options={{ title: 'Nominees' }}
      />
    </DirectoryStack.Navigator>
  );
}

function ListsStackScreens() {
  return (
    <ListsStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <ListsStack.Screen
        name="ListsHome"
        component={ListsHomeScreen}
        options={{ title: 'Lists', headerShown: false }}
      />
      <ListsStack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={({ route }) => ({ title: route.params?.title ?? 'List' })}
      />
    </ListsStack.Navigator>
  );
}

function MoviesAppNavigator() {
  return (
    <MovieTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Explore: 'compass',
            Directory: 'grid',
            Chat: 'chatbubbles',
            Lists: 'list',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <MovieTab.Screen
        name="Explore"
        component={ExploreReelsScreen}
        options={{ title: 'Explore', tabBarLabel: 'Explore' }}
      />
      <MovieTab.Screen
        name="Directory"
        component={DirectoryStackScreens}
        options={{ title: 'Directory', tabBarLabel: 'Directory' }}
      />
      <MovieTab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: ({
            onPress,
            onLongPress,
            accessibilityLabel,
            accessibilityState,
            testID,
          }) => (
            <TouchableOpacity
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={accessibilityLabel}
              accessibilityState={accessibilityState}
              testID={testID}
              style={styles.searchButtonWrapper}
              activeOpacity={0.9}
            >
              <View style={styles.searchButton}>
                <Ionicons name="chatbubbles" size={24} color={COLORS.bg} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <MovieTab.Screen
        name="Lists"
        component={ListsStackScreens}
        options={{ title: 'Lists', tabBarLabel: 'Lists' }}
      />
      <MovieTab.Screen name="Profile" component={ProfileStackScreens} />
    </MovieTab.Navigator>
  );
}

function ExerciseSessionStackScreens() {
  return (
    <WellnessExerciseStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessExerciseStack.Screen
        name="ExerciseSessionHome"
        component={ExerciseSessionScreen}
        options={{ title: 'Exercise Session' }}
      />
    </WellnessExerciseStack.Navigator>
  );
}

function CookingSessionStackScreens() {
  return (
    <WellnessCookingStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessCookingStack.Screen
        name="CookingSessionHome"
        component={CookingSessionHomeScreen}
        options={{ title: 'Cooking Session' }}
      />
      <WellnessCookingStack.Screen
        name="CookingSessionRun"
        component={CookRecipeScreen}
        options={({ route }) => ({ title: route?.params?.recipeName ?? 'Cooking Session' })}
      />
    </WellnessCookingStack.Navigator>
  );
}

function WellnessHomeStackScreens() {
  return (
    <WellnessHomeStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessHomeStack.Screen
        name="WellnessHome"
        component={WellnessHomeScreen}
        options={{ title: 'Home' }}
      />
    </WellnessHomeStack.Navigator>
  );
}

function LibraryStackScreens() {
  return (
    <WellnessLibraryStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessLibraryStack.Screen
        name="LibraryHome"
        component={LibraryHubScreen}
        options={{ title: 'Library', headerShown: false }}
      />
      <WellnessLibraryStack.Screen
        name="GymMachineDetail"
        component={GymMachineDetailScreen}
        options={({ route }) => ({ title: route.params?.machineName ?? 'Machine Details' })}
      />
      <WellnessLibraryStack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={({ route }) => ({ title: route.params?.exerciseName ?? 'Exercise Detail' })}
      />
    </WellnessLibraryStack.Navigator>
  );
}

function FoodStackScreens() {
  return (
    <WellnessFoodStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessFoodStack.Screen
        name="FoodHome"
        component={FoodHubScreen}
        options={{ title: 'Food', headerShown: false }}
      />
      <WellnessFoodStack.Screen
        name="CookRecipe"
        component={CookRecipeScreen}
        options={({ route }) => ({ title: route?.params?.recipeName ?? 'Recipe' })}
      />
    </WellnessFoodStack.Navigator>
  );
}

function WellnessSettingsStackScreens() {
  return (
    <WellnessSettingsStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessSettingsStack.Screen
        name="WellnessSettings"
        component={WellnessSettingsScreen}
        options={{ title: 'Settings' }}
      />
    </WellnessSettingsStack.Navigator>
  );
}

function WellnessAppNavigator() {
  return (
    <WellnessTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.wellnessTabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: styles.wellnessTabLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            ExerciseSession: 'barbell-outline',
            CookingSession: 'flame-outline',
            Home: 'home',
            Library: 'library-outline',
            Food: 'restaurant-outline',
            Settings: 'options-outline',
          };

          if (route.name === 'Home') {
            return (
              <View style={[styles.homeTabIconWrap, focused && styles.homeTabIconWrapActive]}>
                <Ionicons name={icons.Home} size={22} color={focused ? COLORS.bg : COLORS.text} />
              </View>
            );
          }

          const iconSize = route.name === 'Settings' ? 18 : 20;
          return <Ionicons name={icons[route.name]} size={iconSize} color={color} />;
        },
      })}
    >
      <WellnessTab.Screen
        name="ExerciseSession"
        component={ExerciseSessionStackScreens}
        options={{
          title: 'Exercise Session',
          tabBarLabel: 'Exercise',
        }}
      />
      <WellnessTab.Screen
        name="CookingSession"
        component={CookingSessionStackScreens}
        options={{
          title: 'Cooking Session',
          tabBarLabel: 'Cooking',
        }}
      />
      <WellnessTab.Screen
        name="Home"
        component={WellnessHomeStackScreens}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarItemStyle: styles.homeTabItem,
        }}
      />
      <WellnessTab.Screen
        name="Library"
        component={LibraryStackScreens}
        options={{
          title: 'Library',
          tabBarLabel: 'Library',
        }}
      />
      <WellnessTab.Screen
        name="Food"
        component={FoodStackScreens}
        options={{
          title: 'Food',
          tabBarLabel: 'Food',
        }}
      />
      <WellnessTab.Screen
        name="Settings"
        component={WellnessSettingsStackScreens}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarLabelStyle: styles.wellnessTabLabelSubtle,
        }}
      />
    </WellnessTab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [savedCategory, setSavedCategory] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthenticated) {
      setSavedCategory(null);
      setIsReady(true);
      return () => {
        isMounted = false;
      };
    }

    setIsReady(false);
    getSavedCategory().then((category) => {
      if (!isMounted) return;
      setSavedCategory(category);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  const initialRouteName =
    savedCategory === APP_CATEGORY.MOVIES
      ? 'MoviesApp'
      : savedCategory === APP_CATEGORY.FITNESS || savedCategory === APP_CATEGORY.FOOD
        ? 'WellnessApp'
        : 'CategorySelector';

  return (
    <Stack.Navigator
      key={`auth-${initialRouteName}`}
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen name="CategorySelector" component={CategorySelectorScreen} />
      <Stack.Screen name="MoviesApp" component={MoviesAppNavigator} />
      <Stack.Screen name="WellnessApp" component={WellnessAppNavigator} />
      <Stack.Screen name="FitnessApp" component={WellnessAppNavigator} />
      <Stack.Screen name="FoodApp" component={WellnessAppNavigator} />
      <Stack.Screen name="Movie" component={MovieDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </PreferencesProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#12141C',
    borderTopWidth: 0,
    height: 78,
    paddingBottom: 12,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 11,
  },
  wellnessTabBar: {
    backgroundColor: '#11141D',
    borderTopWidth: 0,
    height: 84,
    paddingBottom: 11,
    paddingTop: 8,
  },
  wellnessTabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  wellnessTabLabelSubtle: {
    fontSize: 9,
    fontWeight: '600',
  },
  homeTabItem: {
    marginTop: -10,
  },
  homeTabIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245,201,106,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeTabIconWrapActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  searchButtonWrapper: {
    top: -18,
  },
  searchButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
