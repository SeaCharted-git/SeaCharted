import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Cozumel Dive Map' }} />
          <Stack.Screen name="sites/[slug]" options={{ title: 'Dive Site' }} />
          <Stack.Screen name="auth/sign-in" options={{ title: 'Sign in' }} />
          <Stack.Screen name="auth/verify" options={{ title: 'Enter code' }} />
        </Stack>
      </AuthProvider>
    </ThemeProvider>
  );
}
