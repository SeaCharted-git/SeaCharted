import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env } from '@/lib/env';

// Pass an explicit storage adapter so supabase-js never silently no-ops.
// AsyncStorage on native; the web build of AsyncStorage is a localStorage
// shim, so it works uniformly. During Node.js static-export SSR neither
// backend exists — return a no-op so createClient doesn't throw at build.
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const canUseLocalStorage =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.localStorage !== 'undefined';

const authStorage =
  Platform.OS === 'web'
    ? canUseLocalStorage
      ? globalThis.localStorage
      : noopStorage
    : AsyncStorage;

export const supabase = createClient(env().supabaseUrl, env().supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
