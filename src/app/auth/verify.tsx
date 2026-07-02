import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    if (!email) {
      setError('Missing email. Go back and try again.');
      return;
    }
    const token = code.trim();
    if (token.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (err) throw err;
      router.replace('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <ThemedText type="title">Enter code</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          We sent a 6-digit code to {email ?? 'your email'}. Enter it below to sign in.
        </ThemedText>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="123456"
          placeholderTextColor="#888"
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          onSubmitEditing={verify}
          returnKeyType="done"
        />

        {error ? (
          <ThemedText type="small" style={styles.errorText}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={verify}
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
              Sign in
            </ThemedText>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.backLink}>
            Wrong email? Go back
          </ThemedText>
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
    fontSize: 24,
    color: '#fff',
    backgroundColor: '#111',
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#00c1d1',
    padding: Spacing.three,
    borderRadius: Spacing.two,
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
  backLink: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
