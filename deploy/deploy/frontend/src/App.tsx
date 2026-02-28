import React, { useEffect, useState, useCallback, useRef } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Platform, AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import ErrorBoundary from './components/ErrorBoundary';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import AlertScreen from './screens/AlertScreen';
import SettingsScreen from './screens/SettingsScreen';
import { EarthquakeProvider } from './context/EarthquakeContext';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#E53935',
    accent: '#FF7043',
  },
};

const App: React.FC = () => {
  const appState = useRef(AppState.currentState);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      setIsActive(true);
    } else if (nextAppState.match(/inactive|background/)) {
      setIsActive(false);
    }
    appState.current = nextAppState;
  }, []);

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <EarthquakeProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor="#B71C1C" />
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: keyof typeof Ionicons.glyphMap = 'home';
                  if (route.name === 'Ana Sayfa') {
                    iconName = focused ? 'home' : 'home-outline';
                  } else if (route.name === 'Harita') {
                    iconName = focused ? 'map' : 'map-outline';
                  } else if (route.name === 'Uyarılar') {
                    iconName = focused ? 'notifications' : 'notifications-outline';
                  } else if (route.name === 'Ayarlar') {
                    iconName = focused ? 'settings' : 'settings-outline';
                  }
                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#E53935',
                tabBarInactiveTintColor: 'gray',
                headerStyle: { backgroundColor: '#B71C1C' },
                headerTint