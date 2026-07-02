import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T | null;
  onChange: (v: T | null) => void;
  options: Option<T>[];
  allowClear?: boolean;
}

export function PillSelect<T extends string>({ value, onChange, options, allowClear }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(selected && allowClear ? null : opt.value)}
            style={[styles.pill, selected && styles.pillSelected]}
          >
            <ThemedText
              type="small"
              style={selected ? styles.pillTextSelected : styles.pillText}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: '#00c1d1',
    borderColor: '#00c1d1',
  },
  pillText: {
    color: '#cfd3d9',
  },
  pillTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
});
