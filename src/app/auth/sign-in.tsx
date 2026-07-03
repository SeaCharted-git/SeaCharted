import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

function redirectTo(): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  if (typeof window === 'undefined') return undefined;
  return window.location.origin + '/';
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function sendLink() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo(),
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send link.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.inner}>
          <ThemedText type="title">Check your email</ThemedText>
          <ThemedText type="default">
            We sent a sign-in link to <ThemedText type="default" style={styles.emailStrong}>{email}</ThemedText>.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Click the link in the email to sign in. You can close this tab — the link will open a new one.
          </ThemedText>
          <Pressable
            onPress={() => {
              setSent(false);
              setEmail('');
            }}
            style={styles.buttonGhost}
          >
            <ThemedText type="small" themeColor="textSecondary">
              Wrong email? Try again
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <ThemedText type="title">Sign in</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Enter your email and we&apos;ll send you a one-click sign-in link.
        </ThemedText>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#888"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          inputMode="email"
          autoComplete="email"
          onSubmitEditing={sendLink}
          returnKeyType="send"
        />

        {error ? (
          <ThemedText type="small" style={styles.errorText}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={sendLink}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy) && styles.buttonDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <ThemedText type="default" style={styles.buttonText}>
              Send sign-in link
            </ThemedText>
          )}
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#111',
  },
  button: {
    backgroundColor: '#00c1d1',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  buttonGhost: {
    padding: Spacing.two,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff6b6b',
  },
  emailStrong: {
    fontWeight: '700',
  },
});
