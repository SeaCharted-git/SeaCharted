import { Link } from 'expo-router';
import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from 'expo-router/drawer';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';

export function DrawerContent(props: DrawerContentComponentProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <ThemedText type="subtitle">SeaCharted</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Cozumel dive log + citizen science
        </ThemedText>
      </View>

      <View style={styles.authRow}>
        {loading ? null : !user ? (
          <Link href="/auth/sign-in" asChild>
            <Pressable style={styles.pill}>
              <ThemedText type="small" style={styles.pillText}>
                Sign in
              </ThemedText>
            </Pressable>
          </Link>
        ) : (
          <View style={styles.authStack}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {user.email}
            </ThemedText>
            <Pressable style={styles.pillGhost} onPress={signOut}>
              <ThemedText type="small" style={styles.pillGhostText}>
                Sign out
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.items}>
        <DrawerItemList {...props} />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
  },
  authRow: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  authStack: {
    gap: Spacing.two,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#00c1d1',
    borderRadius: 999,
  },
  pillText: {
    color: '#000',
    fontWeight: '600',
  },
  pillGhost: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#00c1d1',
  },
  pillGhostText: {
    color: '#00c1d1',
    fontWeight: '600',
  },
  items: {
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
});
