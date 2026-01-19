import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import COLORS from './theme/colors';
import ExploreScreen from './screens/ExploreScreen';
import MoviesByYearScreen from './screens/MoviesByYearScreen';
import SearchScreen from './screens/SearchScreen';
import AwardsScreen from './screens/AwardsScreen';
import ProfileScreen from './screens/ProfileScreen';
import MovieDetailScreen from './screens/MovieDetailScreen';
import PlaceholderScreen from './screens/PlaceholderScreen';
import LoginScreen from './screens/LoginScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

function MoreStackScreens() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bg },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <MoreStack.Screen
        name="PlaceholderOne"
        component={PlaceholderScreen}
        options={{ title: 'Placeholder 1' }}
        initialParams={{
          title: 'Placeholder 1',
          description: 'This space is ready for a new feature.',
        }}
      />
      <MoreStack.Screen
        name="PlaceholderTwo"
        component={PlaceholderScreen}
        options={{ title: 'Placeholder 2' }}
        initialParams={{
          title: 'Placeholder 2',
          description: 'Drop in the next flow when you are ready.',
        }}
      />
      <MoreStack.Screen
        name="PlaceholderThree"
        component={PlaceholderScreen}
        options={{ title: 'Placeholder 3' }}
        initialParams={{
          title: 'Placeholder 3',
          description: 'Reserved for future screens.',
        }}
      />
      <MoreStack.Screen
        name="PlaceholderFour"
        component={PlaceholderScreen}
        options={{ title: 'Placeholder 4' }}
        initialParams={{
          title: 'Placeholder 4',
          description: 'Build the next idea here.',
        }}
      />
    </MoreStack.Navigator>
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
            ByYear: 'calendar',
            Search: 'search',
            Awards: 'trophy',
            Profile: 'person',
            More: 'grid',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen
        name="ByYear"
        component={MoviesByYearScreen}
        options={{ title: 'Movies by Year', tabBarLabel: 'By Year' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
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
                <Ionicons name="search" size={24} color={COLORS.bg} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="Awards" component={AwardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="More" component={MoreStackScreens} />
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
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
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
