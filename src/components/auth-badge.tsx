import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthContext';

export function AuthBadge() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <View style={styles.container}>
        <Link href="/auth/sign-in" asChild>
          <Pressable style={styles.pill}>
            <ThemedText type="small" style={styles.pillText}>
              Sign in
            </ThemedText>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <ThemedText type="small" style={styles.pillText}>
          {user.email}
        </ThemedText>
      </View>
      <Pressable style={styles.pill} onPress={signOut}>
        <ThemedText type="small" style={styles.pillText}>
          Sign out
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    zIndex: 10,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 999,
  },
  pillText: {
    color: '#fff',
  },
});
