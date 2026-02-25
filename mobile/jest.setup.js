// Jest setup file for React Native testing
import '@testing-library/jest-native/extend-expect';

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
  apps: [],
}));

jest.mock('@react-native-firebase/messaging', () => ({
  messaging: jest.fn(() => ({
    getToken: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
  })),
}));

// Mock Notifee
jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  displayNotification: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
  },
}));

// Mock Expo
jest.mock('expo-constants', () => ({
  manifest: {
    extra: {
      apiUrl: 'http://localhost:8001',
    },
  },
  expoConfig: {
    extra: {
      apiUrl: 'http://localhost:8001',
    },
  },
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
  Stack: ({ children }) => children,
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock i18next
jest.mock('i18next', () => ({
  init: jest.fn(),
  t: jest.fn((key) => key),
}));

// Global test utilities
global.fetch = jest.fn();
