// Silence noisy Reanimated logs during tests.
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return { ...actual, default: actual };
});

// Silence expo-glass-effect (native module) during tests.
jest.mock('expo-glass-effect', () => ({ GlassEffect: 'GlassEffect' }));

// AsyncStorage native module isn't available in the jest env — use the
// library-provided in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Global env — supabase client + env.ts validator read these at import time.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-must-be-20-chars-long';
process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'pk.test-mapbox-token-for-jest';
