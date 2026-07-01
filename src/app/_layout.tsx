import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Cozumel Dive Map' }} />
        <Stack.Screen name="sites/[slug]" options={{ title: 'Dive Site' }} />
      </Stack>
    </ThemeProvider>
  );
}
