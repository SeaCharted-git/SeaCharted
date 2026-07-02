import { Redirect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/lib/auth/AuthContext';

interface Props {
  children: React.ReactNode;
}

export function AuthGuard({ children }: Props) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ThemedText type="small" themeColor="textSecondary">
          Loading…
        </ThemedText>
      </ThemedView>
    );
  }
  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }
  return <>{children}</>;
}
