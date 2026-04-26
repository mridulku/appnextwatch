import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import COLORS from './theme/colors';
import ExploreReelsScreen from './features/movies/explore/ExploreReelsScreen';
import MoviesByYearScreen from './features/movies/directory/MoviesByYearScreen';
import ProfileScreen from './features/movies/profile/ProfileScreen';
import MovieDetailScreen from './features/movies/shared/MovieDetailScreen';
import LoginScreen from './features/shared/auth/LoginScreen';
import ChatScreen from './features/movies/chat/ChatScreen';
import DataInspectorScreen from './features/shared/debug/DataInspectorScreen';
import ActorListScreen from './features/movies/directory/ActorListScreen';
import ActorDetailScreen from './features/movies/directory/ActorDetailScreen';
import DirectorListScreen from './features/movies/directory/DirectorListScreen';
import DirectorDetailScreen from './features/movies/directory/DirectorDetailScreen';
import AwardsHomeScreen from './features/movies/directory/AwardsHomeScreen';
import AwardYearsScreen from './features/movies/directory/AwardYearsScreen';
import AwardCategoriesScreen from './features/movies/directory/AwardCategoriesScreen';
import AwardNomineesScreen from './features/movies/directory/AwardNomineesScreen';
import DirectoryScreen from './features/movies/directory/DirectoryScreen';
import ListsHomeScreen from './features/movies/lists/ListsHomeScreen';
import ListDetailScreen from './features/movies/lists/ListDetailScreen';
import FilmsWatchedScreen from './features/movies/profile/FilmsWatchedScreen';
import MachineDetailScreen from './features/wellness/gym/MachineDetailScreen';
import ExerciseDetailScreen from './features/wellness/gym/ExerciseDetailScreen';
import ExerciseVariantsScreen from './features/wellness/gym/ExerciseVariantsScreen';
import AddMachinesScreen from './features/wellness/gym/AddMachinesScreen';
import AddExercisesScreen from './features/wellness/gym/AddExercisesScreen';
import GymLogDetailScreen from './features/wellness/gym/GymLogDetailScreen';
import GymChatScreen from './features/wellness/gym/GymChatScreen';
import GymChatLabScreen from './features/wellness/gym/GymChatLabScreen';
import ProgramTimelineScreen from './features/wellness/gym/ProgramTimelineScreen';
import OnboardingInterviewScreen from './features/wellness/gym/OnboardingInterviewScreen';
import GymStatsEditScreen from './features/wellness/gym/GymStatsEditScreen';
import MuscleGroupScreen from './features/wellness/gym/muscles/MuscleGroupScreen';
import MuscleDetailScreen from './features/wellness/gym/muscles/MuscleDetailScreen';
import CookRecipeScreen from './features/wellness/shared/CookRecipeScreen';
import FoodHubScreen from './features/wellness/food/FoodHubScreen';
import FoodLogScreen from './features/wellness/food/FoodLogScreen';
import FoodDishDetailScreen from './features/wellness/food/FoodDishDetailScreen';
import MoviesHubScreen from './features/wellness/movies/MoviesHubScreen';
import MovieLogScreen from './features/wellness/movies/MovieLogScreen';
import MovieSettingsScreen from './features/shared/settings/MovieSettingsScreen';
import MovieTitleDetailScreen from './features/wellness/movies/MovieTitleDetailScreen';
import AddFoodItemsScreen from './features/wellness/food/AddFoodItemsScreen';
import FoodInventoryItemDetailScreen from './features/wellness/food/FoodInventoryItemDetailScreen';
import UtensilDetailScreen from './features/wellness/food/UtensilDetailScreen';
import AddUtensilsScreen from './features/wellness/food/AddUtensilsScreen';
import AddRecipesScreen from './features/wellness/food/AddRecipesScreen';
import FoodStatsEditScreen from './features/wellness/food/FoodStatsEditScreen';
import SessionsHomeScreen from './features/wellness/sessions/SessionsHomeScreen';
import WorkoutSessionSetupScreen from './features/wellness/sessions/WorkoutSessionSetupScreen';
import CookingSessionSetupScreen from './features/wellness/sessions/CookingSessionSetupScreen';
import SessionSummaryScreen from './features/wellness/sessions/SessionSummaryScreen';
import ExerciseSessionScreen from './features/wellness/sessions/ExerciseSessionScreen';
import WellnessHomeScreen from './features/wellness/home/WellnessHomeScreen';
import GymHubScreen from './features/wellness/gym/GymHubScreen';
import GymSessionCreateScreen from './features/wellness/gym/GymSessionCreateScreen';
import GymSessionFinalizeScreen from './features/wellness/gym/GymSessionFinalizeScreen';
import GymCreatedSessionsScreen from './features/wellness/gym/GymCreatedSessionsScreen';
import GymSessionStartScreen from './features/wellness/gym/GymSessionStartScreen';
import GymSessionWorkScreen from './features/wellness/gym/GymSessionWorkScreen';
import GymChatLabCatalogScreen from './features/wellness/gym/GymChatLabCatalogScreen';
import GymTemplateDetailScreen from './features/wellness/gym/GymTemplateDetailScreen';
import TestHomeScreen from './features/wellness/test/TestHomeScreen';
import TestTablesScreen from './features/wellness/test/TestTablesScreen';
import TestChatScreen from './features/wellness/test/TestChatScreen';
import TestAudioRecorderScreen from './features/wellness/test/TestAudioRecorderScreen';
import TestVoiceGymCoachScreen from './features/wellness/test/TestVoiceGymCoachScreen';
import SettingsHubScreen from './features/shared/settings/SettingsHubScreen';
import GymSettingsScreen from './features/shared/settings/GymSettingsScreen';
import FoodSettingsScreen from './features/shared/settings/FoodSettingsScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';

const MovieTab = createBottomTabNavigator();
const WellnessTab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DirectoryStack = createNativeStackNavigator();
const ListsStack = createNativeStackNavigator();
const ExploreStack = createNativeStackNavigator();
const WellnessSessionStack = createNativeStackNavigator();
const WellnessHomeStack = createNativeStackNavigator();
const WellnessGymStack = createNativeStackNavigator();
const WellnessFoodStack = createNativeStackNavigator();
const WellnessMovieStack = createNativeStackNavigator();
const WellnessSettingsStack = createNativeStackNavigator();
const WellnessTestStack = createNativeStackNavigator();

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
      <ProfileStack.Screen
        name="Movie"
        component={MovieDetailScreen}
        options={({ route }) => ({ title: route.params?.movie?.title ?? 'Movie' })}
      />
    </ProfileStack.Navigator>
  );
}

function ExploreStackScreens() {
  return (
    <ExploreStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <ExploreStack.Screen
        name="ExploreHome"
        component={ExploreReelsScreen}
        options={{ title: 'Explore', headerShown: false }}
      />
      <ExploreStack.Screen
        name="Movie"
        component={MovieDetailScreen}
        options={({ route }) => ({ title: route.params?.movie?.title ?? 'Movie' })}
      />
    </ExploreStack.Navigator>
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
      <DirectoryStack.Screen
        name="Movie"
        component={MovieDetailScreen}
        options={({ route }) => ({ title: route.params?.movie?.title ?? 'Movie' })}
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
      <ListsStack.Screen
        name="Movie"
        component={MovieDetailScreen}
        options={({ route }) => ({ title: route.params?.movie?.title ?? 'Movie' })}
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
        component={ExploreStackScreens}
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

function SessionStackScreens() {
  return (
    <WellnessSessionStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessSessionStack.Screen
        name="SessionHome"
        component={SessionsHomeScreen}
        options={{ title: 'Sessions', headerShown: false }}
      />
      <WellnessSessionStack.Screen
        name="WorkoutSessionSetup"
        component={WorkoutSessionSetupScreen}
        options={{ title: 'Workout Setup' }}
      />
      <WellnessSessionStack.Screen
        name="CookingSessionSetup"
        component={CookingSessionSetupScreen}
        options={{ title: 'Cooking Setup' }}
      />
      <WellnessSessionStack.Screen
        name="WorkoutSessionRun"
        component={ExerciseSessionScreen}
        options={({ route }) => ({
          title: route?.params?.sessionTitle ?? route?.params?.sessionTemplate?.name ?? 'Workout Session',
        })}
      />
      <WellnessSessionStack.Screen
        name="CookingSessionRun"
        component={CookRecipeScreen}
        options={({ route }) => ({ title: route?.params?.recipeName ?? 'Cooking Session' })}
      />
      <WellnessSessionStack.Screen
        name="SessionSummary"
        component={SessionSummaryScreen}
        options={{ title: 'Session Summary' }}
      />
    </WellnessSessionStack.Navigator>
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
      <WellnessHomeStack.Screen
        name="HomeSettings"
        component={HomeSettingsScreen}
        options={{ title: 'Settings' }}
      />
    </WellnessHomeStack.Navigator>
  );
}

function GymStackScreens() {
  return (
    <WellnessGymStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessGymStack.Screen
        name="GymHome"
        component={GymHubScreen}
        options={{ title: 'Gym', headerShown: false }}
      />
      <WellnessGymStack.Screen
        name="MachineDetail"
        component={MachineDetailScreen}
        options={({ route }) => ({ title: route.params?.machineName ?? 'Machine Details' })}
      />
      <WellnessGymStack.Screen
        name="GymMachineDetail"
        component={MachineDetailScreen}
        options={({ route }) => ({ title: route.params?.machineName ?? 'Machine Details' })}
      />
      <WellnessGymStack.Screen
        name="ExerciseVariants"
        component={ExerciseVariantsScreen}
        options={({ route }) => ({ title: route.params?.movementName ?? 'Exercise Variants' })}
      />
      <WellnessGymStack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={({ route }) => ({ title: route.params?.exerciseName ?? 'Exercise Detail' })}
      />
      <WellnessGymStack.Screen
        name="AddMachines"
        component={AddMachinesScreen}
        options={{ title: 'Add Machines' }}
      />
      <WellnessGymStack.Screen
        name="AddExercises"
        component={AddExercisesScreen}
        options={{ title: 'Add Exercises' }}
      />
      <WellnessGymStack.Screen
        name="GymStatsEdit"
        component={GymStatsEditScreen}
        options={{ title: 'Edit Gym Stats' }}
      />
      <WellnessGymStack.Screen
        name="GymLogDetail"
        component={GymLogDetailScreen}
        options={{ title: 'Log Detail' }}
      />
      <WellnessGymStack.Screen
        name="GymSessionStart"
        component={GymSessionStartScreen}
        options={{ title: 'Start Session' }}
      />
      <WellnessGymStack.Screen
        name="GymSessionCreate"
        component={GymSessionCreateScreen}
        options={{ title: 'Create Session' }}
      />
      <WellnessGymStack.Screen
        name="GymSessionFinalize"
        component={GymSessionFinalizeScreen}
        options={{ title: 'Session Details' }}
      />
      <WellnessGymStack.Screen
        name="GymCreatedSessions"
        component={GymCreatedSessionsScreen}
        options={{ title: 'Choose Created Session' }}
      />
      <WellnessGymStack.Screen
        name="GymSessionWork"
        component={GymSessionWorkScreen}
        options={{ title: 'Session Details' }}
      />
      <WellnessGymStack.Screen
        name="GymChatLabCatalog"
        component={GymChatLabCatalogScreen}
        options={{ title: 'Exercise Catalog' }}
      />
      <WellnessGymStack.Screen
        name="GymTemplateDetail"
        component={GymTemplateDetailScreen}
        options={({ route }) => ({ title: route.params?.title ?? 'Template Detail' })}
      />
      <WellnessGymStack.Screen
        name="ProgramTimeline"
        component={ProgramTimelineScreen}
        options={{ title: 'Training Program' }}
      />
      <WellnessGymStack.Screen
        name="OnboardingInterview"
        component={OnboardingInterviewScreen}
        options={{ headerShown: false }}
      />
      <WellnessGymStack.Screen
        name="MuscleGroup"
        component={MuscleGroupScreen}
        options={({ route }) => ({ title: route.params?.groupLabel ?? 'Muscle Group' })}
      />
      <WellnessGymStack.Screen
        name="MuscleDetail"
        component={MuscleDetailScreen}
        options={({ route }) => ({ title: route.params?.subLabel ?? 'Muscle Detail' })}
      />
    </WellnessGymStack.Navigator>
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
        name="FoodLog"
        component={FoodLogScreen}
        options={{ title: 'Food log' }}
      />
      <WellnessFoodStack.Screen
        name="FoodDishDetail"
        component={FoodDishDetailScreen}
        options={({ route }) => ({ title: route?.params?.dishName ?? 'Dish' })}
      />
      <WellnessFoodStack.Screen
        name="CookRecipe"
        component={CookRecipeScreen}
        options={({ route }) => ({ title: route?.params?.recipeName ?? 'Recipe' })}
      />
      <WellnessFoodStack.Screen
        name="AddFoodItems"
        component={AddFoodItemsScreen}
        options={{ title: 'Add Items' }}
      />
      <WellnessFoodStack.Screen
        name="FoodInventoryItemDetail"
        component={FoodInventoryItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <WellnessFoodStack.Screen
        name="AddUtensils"
        component={AddUtensilsScreen}
        options={{ title: 'Add Utensils' }}
      />
      <WellnessFoodStack.Screen
        name="UtensilDetail"
        component={UtensilDetailScreen}
        options={({ route }) => ({ title: route?.params?.item?.name ?? 'Utensil Detail' })}
      />
      <WellnessFoodStack.Screen
        name="AddRecipes"
        component={AddRecipesScreen}
        options={{ title: 'Add Recipes' }}
      />
      <WellnessFoodStack.Screen
        name="FoodStatsEdit"
        component={FoodStatsEditScreen}
        options={{ title: 'Edit Food Stats' }}
      />
    </WellnessFoodStack.Navigator>
  );
}

function MovieStackScreens() {
  return (
    <WellnessMovieStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessMovieStack.Screen
        name="MoviesHome"
        component={MoviesHubScreen}
        options={{ title: 'Movies', headerShown: false }}
      />
      <WellnessMovieStack.Screen
        name="MovieLog"
        component={MovieLogScreen}
        options={{ title: 'Movie log' }}
      />
    </WellnessMovieStack.Navigator>
  );
}

function SettingsStackScreens() {
  return (
    <WellnessSettingsStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessSettingsStack.Screen
        name="SettingsHome"
        component={SettingsHubScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
      <WellnessSettingsStack.Screen
        name="GymSettings"
        component={GymSettingsScreen}
        options={{ title: 'Gym settings' }}
      />
      <WellnessSettingsStack.Screen
        name="FoodSettings"
        component={FoodSettingsScreen}
        options={{ title: 'Food settings' }}
      />
      <WellnessSettingsStack.Screen
        name="MovieSettings"
        component={MovieSettingsScreen}
        options={{ title: 'Movie settings' }}
      />
      <WellnessSettingsStack.Screen
        name="MovieTitleDetail"
        component={MovieTitleDetailScreen}
        options={({ route }) => ({ title: route?.params?.title ?? 'Title detail' })}
      />
      <WellnessSettingsStack.Screen
        name="FoodDishDetail"
        component={FoodDishDetailScreen}
        options={({ route }) => ({ title: route?.params?.dishName ?? 'Dish' })}
      />
      <WellnessSettingsStack.Screen
        name="MachineDetail"
        component={MachineDetailScreen}
        options={({ route }) => ({ title: route.params?.machineName ?? 'Machine Details' })}
      />
      <WellnessSettingsStack.Screen
        name="GymMachineDetail"
        component={MachineDetailScreen}
        options={({ route }) => ({ title: route.params?.machineName ?? 'Machine Details' })}
      />
      <WellnessSettingsStack.Screen
        name="ExerciseVariants"
        component={ExerciseVariantsScreen}
        options={({ route }) => ({ title: route.params?.movementName ?? 'Exercise Variants' })}
      />
      <WellnessSettingsStack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={({ route }) => ({ title: route.params?.exerciseName ?? 'Exercise Detail' })}
      />
      <WellnessSettingsStack.Screen
        name="AddMachines"
        component={AddMachinesScreen}
        options={{ title: 'Add Machines' }}
      />
      <WellnessSettingsStack.Screen
        name="AddExercises"
        component={AddExercisesScreen}
        options={{ title: 'Add Exercises' }}
      />
      <WellnessSettingsStack.Screen
        name="GymStatsEdit"
        component={GymStatsEditScreen}
        options={{ title: 'Edit Gym Stats' }}
      />
      <WellnessSettingsStack.Screen
        name="MuscleGroup"
        component={MuscleGroupScreen}
        options={({ route }) => ({ title: route.params?.groupLabel ?? 'Muscle Group' })}
      />
      <WellnessSettingsStack.Screen
        name="MuscleDetail"
        component={MuscleDetailScreen}
        options={({ route }) => ({ title: route.params?.subLabel ?? 'Muscle Detail' })}
      />
      <WellnessSettingsStack.Screen
        name="AddFoodItems"
        component={AddFoodItemsScreen}
        options={{ title: 'Add Items' }}
      />
      <WellnessSettingsStack.Screen
        name="FoodInventoryItemDetail"
        component={FoodInventoryItemDetailScreen}
        options={{ title: 'Item Details' }}
      />
      <WellnessSettingsStack.Screen
        name="AddUtensils"
        component={AddUtensilsScreen}
        options={{ title: 'Add Utensils' }}
      />
      <WellnessSettingsStack.Screen
        name="UtensilDetail"
        component={UtensilDetailScreen}
        options={({ route }) => ({ title: route?.params?.item?.name ?? 'Utensil Detail' })}
      />
      <WellnessSettingsStack.Screen
        name="AddRecipes"
        component={AddRecipesScreen}
        options={{ title: 'Add Recipes' }}
      />
      <WellnessSettingsStack.Screen
        name="FoodStatsEdit"
        component={FoodStatsEditScreen}
        options={{ title: 'Edit Food Stats' }}
      />
    </WellnessSettingsStack.Navigator>
  );
}

function TestStackScreens() {
  return (
    <WellnessTestStack.Navigator screenOptions={SHARED_STACK_OPTIONS}>
      <WellnessTestStack.Screen
        name="TestHome"
        component={TestHomeScreen}
        options={{ title: 'Test Tools' }}
      />
      <WellnessTestStack.Screen
        name="TestTables"
        component={TestTablesScreen}
        options={{ title: 'Tables' }}
      />
      <WellnessTestStack.Screen
        name="TestChat"
        component={TestChatScreen}
        options={{ title: 'Chat' }}
      />
      <WellnessTestStack.Screen
        name="TestAudioRecorder"
        component={TestAudioRecorderScreen}
        options={{ title: 'Audio Recorder' }}
      />
      <WellnessTestStack.Screen
        name="TestVoiceGymCoach"
        component={TestVoiceGymCoachScreen}
        options={{ title: 'Voice Gym Coach' }}
      />
      <WellnessTestStack.Screen
        name="TestGymBasicChat"
        component={GymChatScreen}
        options={{ title: 'Basic Chat' }}
      />
      <WellnessTestStack.Screen
        name="TestGymCreateWorkoutSession"
        component={GymChatLabScreen}
        options={{ title: 'Create Workout Session' }}
      />
      <WellnessTestStack.Screen
        name="TestMoviesLogger"
        component={MovieStackScreens}
        options={{ title: 'Movies' }}
      />
      <WellnessTestStack.Screen
        name="LegacyMovies"
        component={MoviesAppNavigator}
        options={{ title: 'Legacy Movies', headerShown: false }}
      />
      <WellnessTestStack.Screen
        name="GymLogDetail"
        component={GymLogDetailScreen}
        options={{ title: 'Log Detail' }}
      />
    </WellnessTestStack.Navigator>
  );
}

function WellnessAppNavigator() {
  return (
    <WellnessTab.Navigator
      initialRouteName="Gym"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.wellnessTabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: styles.wellnessTabLabel,
        tabBarIcon: ({ color }) => {
          const icons = {
            Gym: 'barbell-outline',
            Food: 'restaurant-outline',
            Movies: 'film-outline',
            Settings: 'settings-outline',
            Test: 'flask-outline',
          };
          return <Ionicons name={icons[route.name]} size={20} color={color} />;
        },
      })}
    >
      <WellnessTab.Screen
        name="Gym"
        component={GymStackScreens}
        options={{
          title: 'Gym',
          tabBarLabel: 'Gym',
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
        name="Movies"
        component={MovieStackScreens}
        options={{
          title: 'Movies',
          tabBarLabel: 'Movies',
        }}
      />
      <WellnessTab.Screen
        name="Settings"
        component={SettingsStackScreens}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
      <WellnessTab.Screen
        name="Test"
        component={TestStackScreens}
        options={{
          title: 'Test',
          tabBarLabel: 'Test',
        }}
      />
    </WellnessTab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      key="auth-wellness"
      screenOptions={{ headerShown: false }}
      initialRouteName="WellnessApp"
    >
      <Stack.Screen name="WellnessApp" component={WellnessAppNavigator} />
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
    fontSize: 11,
    fontWeight: '600',
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
});
