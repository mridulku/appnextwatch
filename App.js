import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

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
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const DirectoryStack = createNativeStackNavigator();
const ListsStack = createNativeStackNavigator();

function ProfileStackScreens() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
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
    <DirectoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
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
    <ListsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
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

function Tabs() {
  return (
    <Tab.Navigator
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
      <Tab.Screen
        name="Explore"
        component={ExploreReelsScreen}
        options={{ title: 'Explore', tabBarLabel: 'Explore' }}
      />
      <Tab.Screen
        name="Directory"
        component={DirectoryStackScreens}
        options={{ title: 'Directory', tabBarLabel: 'Directory' }}
      />
      <Tab.Screen
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
      <Tab.Screen
        name="Lists"
        component={ListsStackScreens}
        options={{ title: 'Lists', tabBarLabel: 'Lists' }}
      />
      <Tab.Screen name="Profile" component={ProfileStackScreens} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Root" component={Tabs} />
          <Stack.Screen name="Movie" component={MovieDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
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
