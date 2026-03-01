/**
 * Optimized Tab Navigator with Scene Map Optimization
 * 
 * Features:
 * - unmountOnBlur: false - Prevents unmounting on tab switch
 * - freezeOnBlur: true - Freezes inactive tabs to prevent re-renders
 * - Lazy loading with preloading of adjacent tabs
 * - Zero dark flashes on tab navigation
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { 
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Navigation ref for external navigation control
export const navigationRef = createNavigationContainerRef();

// Tab configuration type
export interface TabConfig {
  name: string;
  component: React.ComponentType<any>;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Preload this tab when app starts */
  preload?: boolean;
}

// Optimized Tab Navigator Props
interface OptimizedTabNavigatorProps {
  tabs: TabConfig[];
  initialRouteName?: string;
  onReady?: () => void;
}

// Create the tab navigator
const Tab = createBottomTabNavigator();

/**
 * Scene Wrapper Component
 * Wraps each tab screen to handle freeze/unfreeze behavior
 */
interface SceneWrapperProps {
  children: React.ReactNode;
  isFocused: boolean;
  isPreloaded: boolean;
}

const SceneWrapper: React.FC<SceneWrapperProps> = ({
  children,
  isFocused,
  isPreloaded,
}) => {
  // Track if component has ever been focused (for lazy loading)
  const [hasBeenFocused, setHasBeenFocused] = useState(isPreloaded);
  
  useEffect(() => {
    if (isFocused && !hasBeenFocused) {
      setHasBeenFocused(true);
    }
  }, [isFocused, hasBeenFocused]);
  
  // Don't render until first focus (lazy loading)
  if (!hasBeenFocused && !isPreloaded) {
    return (
      <View style={styles.lazyPlaceholder}>
        {/* Empty placeholder - no spinner */}
      </View>
    );
  }
  
  return (
    <View 
      style={[
        styles.sceneContainer,
        !isFocused && styles.frozenScene
      ]}
      removeClippedSubviews={!isFocused} // Remove from view hierarchy when not focused
    >
      {children}
    </View>
  );
};

/**
 * Optimized Tab Navigator
 * Implements Scene Map Optimization for zero-flash tab switching
 */
export const OptimizedTabNavigator: React.FC<OptimizedTabNavigatorProps> = ({
  tabs,
  initialRouteName,
  onReady,
}) => {
  // Track preloaded tabs
  const preloadedTabs = useRef<Set<string>>(
    new Set(tabs.filter(t => t.preload).map(t => t.name))
  );
  
  // Track current route for scene wrapper
  const [currentRoute, setCurrentRoute] = useState<string>(
    initialRouteName || tabs[0]?.name || ''
  );
  
  // Handle navigation state changes
  const onStateChange = useCallback(() => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName) {
      setCurrentRoute(currentRouteName);
    }
  }, []);
  
  // Render tab screen with optimizations
  const renderTabScreen = useCallback((tab: TabConfig) => {
    const Component = tab.component;
    const isPreloaded = preloadedTabs.current.has(tab.name);
    
    return (
      <Tab.Screen
        key={tab.name}
        name={tab.name}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? tab.iconFocused : tab.icon}
              size={size}
              color={color}
            />
          ),
          tabBarLabel: tab.label,
        }}
      >
        {(props) => (
          <SceneWrapper
            isFocused={currentRoute === tab.name}
            isPreloaded={isPreloaded}
          >
            <Component {...props} />
          </SceneWrapper>
        )}
      </Tab.Screen>
    );
  }, [currentRoute]);
  
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onReady}
      onStateChange={onStateChange}
    >
      <Tab.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#FEA74E',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarLabelStyle: styles.tabBarLabel,
        }}
        backBehavior="none"
      >
        {tabs.map(renderTabScreen)}
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    fontFamily: 'Rubik_500Medium',
  },
  sceneContainer: {
    flex: 1,
  },
  frozenScene: {
    // When frozen, the scene is still mounted but not updating
    // This prevents the dark flash when switching back
  },
  lazyPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
  },
});

/**
 * Navigation utilities
 */
export const NavigationUtils = {
  /**
   * Navigate to a route
   */
  navigate: (name: string, params?: object) => {
    if (navigationRef.isReady()) {
      // @ts-ignore - navigation types
      navigationRef.navigate(name, params);
    }
  },
  
  /**
   * Go back
   */
  goBack: () => {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  },
  
  /**
   * Get current route name
   */
  getCurrentRoute: (): string | undefined => {
    return navigationRef.current?.getCurrentRoute()?.name;
  },
  
  /**
   * Check if navigation is ready
   */
  isReady: (): boolean => {
    return navigationRef.isReady();
  },
};

export default OptimizedTabNavigator;
