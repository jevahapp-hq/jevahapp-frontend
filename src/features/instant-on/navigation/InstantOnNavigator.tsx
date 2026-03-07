/**
 * InstantOnNavigator - Navigation configuration for 'Instant-On' experience
 * 
 * Key features:
 * - Uses @react-navigation/native with freezeOnBlur: true
 * - Prevents dark flashes during tab switching
 * - Maintains video state in memory when switching tabs
 * - detachPreviousScreen: false for smooth transitions
 */
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { enableFreeze } from 'react-native-screens';

// Enable freeze for better performance - this prevents unnecessary re-renders
// when screens are not visible, maintaining video state in memory
enableFreeze(true);

const Tab = createBottomTabNavigator();

// Navigation configuration constants
export const INSTANT_ON_NAVIGATION_CONFIG = {
  // Prevent screen detachment to maintain video state
  detachPreviousScreen: false,
  
  // Freeze screens when not in focus to prevent dark flashes
  freezeOnBlur: true,
  
  // Animation settings for smooth transitions
  animation: 'fade',
  animationDuration: 150,
  
  // Card style to prevent background flashes
  cardStyle: { backgroundColor: 'black' },
  
  // Prevent screen from being destroyed when navigating away
  unmountOnBlur: false,
} as const;

// Tab navigator screen options for instant-on experience
export const INSTANT_ON_TAB_SCREEN_OPTIONS = {
  // Freeze on blur prevents dark flashes and maintains state
  freezeOnBlur: true,
  
  // Lazy load tabs but keep them in memory once loaded
  lazy: true,
  
  // Tab bar styling - transparent to show video underneath
  tabBarStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 0,
    elevation: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  
  // Active/inactive colors
  tabBarActiveTintColor: '#FFFFFF',
  tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
  
  // Hide labels for cleaner look
  tabBarShowLabel: false,
  
  // Screen style
  sceneContainerStyle: {
    backgroundColor: 'black',
  },
} as const;

interface InstantOnNavigatorProps {
  /** Home screen component with video feed */
  HomeScreen: React.ComponentType<any>;
  /** Explore screen component */
  ExploreScreen?: React.ComponentType<any>;
  /** Library screen component */
  LibraryScreen?: React.ComponentType<any>;
  /** Profile screen component */
  ProfileScreen?: React.ComponentType<any>;
  /** Custom tab bar component */
  TabBarComponent?: React.ComponentType<any>;
  /** Initial route name */
  initialRouteName?: string;
}

/**
 * Pre-configured navigator optimized for instant-on video experience
 * 
 * Usage:
 * ```tsx
 * <InstantOnNavigator
 *   HomeScreen={VideoFeedScreen}
 *   ExploreScreen={ExploreScreen}
 *   LibraryScreen={LibraryScreen}
 *   ProfileScreen={ProfileScreen}
 * />
 * ```
 */
export const InstantOnNavigator: React.FC<InstantOnNavigatorProps> = ({
  HomeScreen,
  ExploreScreen,
  LibraryScreen,
  ProfileScreen,
  TabBarComponent,
  initialRouteName = 'Home',
}) => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          ...INSTANT_ON_TAB_SCREEN_OPTIONS,
          ...(TabBarComponent && { tabBar: TabBarComponent }),
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
          }}
        />
        {ExploreScreen && (
          <Tab.Screen
            name="Explore"
            component={ExploreScreen}
            options={{
              title: 'Explore',
            }}
          />
        )}
        {LibraryScreen && (
          <Tab.Screen
            name="Library"
            component={LibraryScreen}
            options={{
              title: 'Library',
            }}
          />
        )}
        {ProfileScreen && (
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Profile',
            }}
          />
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default InstantOnNavigator;
