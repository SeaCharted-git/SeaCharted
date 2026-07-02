import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface Props {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, hint, children }: Props) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

export const inputStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#111',
  },
  primaryButton: {
    backgroundColor: '#00c1d1',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#ff6b6b',
  },
  successText: {
    color: '#4ade80',
  },
});

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
});
