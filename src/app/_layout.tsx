import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DrawerContent } from '@/components/drawer-content';
import { AuthProvider } from '@/lib/auth/AuthContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <Drawer
            drawerContent={(props) => <DrawerContent {...props} />}
            screenOptions={{ headerTitle: 'SeaCharted' }}
          >
            <Drawer.Screen name="index" options={{ title: 'Map', drawerLabel: 'Map' }} />
            <Drawer.Screen
              name="dives/index"
              options={{ title: 'My dives', drawerLabel: 'My dives' }}
            />
            <Drawer.Screen
              name="dives/new"
              options={{ title: 'Log a dive', drawerLabel: 'Log a dive' }}
            />
            <Drawer.Screen
              name="research/index"
              options={{ title: 'Research', drawerLabel: 'Research' }}
            />
            <Drawer.Screen
              name="profile/index"
              options={{ title: 'Profile', drawerLabel: 'Profile' }}
            />
            <Drawer.Screen
              name="profile/gallery"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Gallery' }}
            />

            <Drawer.Screen
              name="sites/[slug]"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Dive site' }}
            />
            <Drawer.Screen
              name="dives/[id]"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Dive' }}
            />
            <Drawer.Screen
              name="research/species/[slug]"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Species' }}
            />
            <Drawer.Screen
              name="research/hashtags/[tag]"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Hashtag' }}
            />
            <Drawer.Screen
              name="auth/sign-in"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Sign in' }}
            />
            <Drawer.Screen
              name="auth/verify"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Enter code' }}
            />
            <Drawer.Screen
              name="species/submit"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Submit species' }}
            />
            <Drawer.Screen
              name="admin/species"
              options={{ drawerItemStyle: { display: 'none' }, title: 'Admin: species' }}
            />
          </Drawer>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
