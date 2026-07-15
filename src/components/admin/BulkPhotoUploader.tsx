import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fileNameToSlug, matchFilesToSpecies, type BulkMatchResult } from '@/lib/species/bulkMatch';
import { listSpecies } from '@/lib/species/getSpecies';
import { uploadSpeciesPhotoBytes } from '@/lib/species/photos';
import type { Species } from '@/lib/types';

interface Props {
  visible: boolean;
  uploaderId: string;
  onClose: () => void;
  onDone?: () => void;
}

interface PickedFile {
  uri: string;
  fileName: string;
  width: number;
  height: number;
}

interface RowState extends BulkMatchResult {
  uri: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'skipped' | 'error';
  error?: string;
}

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

async function uriToBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  const file = new File(uri);
  return new Uint8Array(await file.arrayBuffer());
}

async function compressToJpeg(uri: string, w: number, h: number): Promise<string> {
  const longest = Math.max(w, h);
  const actions: ImageManipulator.Action[] = [];
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    actions.push({ resize: { width: Math.round(w * scale), height: Math.round(h * scale) } });
  }
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}

export function BulkPhotoUploader({ visible, uploaderId, onClose, onDone }: Props) {
  const [catalog, setCatalog] = useState<Species[] | null>(null);
  const [rows, setRows] = useState<RowState[] | null>(null);
  const [phase, setPhase] = useState<'pick' | 'preview' | 'running' | 'done'>('pick');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  useEffect(() => {
    if (!visible) return;
    setPhase('pick');
    setRows(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
    listSpecies()
      .then(setCatalog)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [visible]);

  const matchedCount = useMemo(
    () => rows?.filter((r) => r.species !== null).length ?? 0,
    [rows],
  );
  const unmatchedCount = useMemo(
    () => rows?.filter((r) => r.species === null).length ?? 0,
    [rows],
  );

  async function onPick() {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Media library permission denied.');
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (picked.canceled || picked.assets.length === 0) return;
      const files: PickedFile[] = picked.assets.map((a) => ({
        uri: a.uri,
        fileName: a.fileName ?? a.uri.split('/').pop() ?? 'unknown',
        width: a.width,
        height: a.height,
      }));
      if (!catalog) throw new Error('Species catalog not loaded yet.');
      const results = matchFilesToSpecies(
        files.map((f) => f.fileName),
        catalog,
      );
      const rowsInit: RowState[] = results.map((r, i) => ({
        ...r,
        uri: files[i].uri,
        status: 'pending',
      }));
      setRows(rowsInit);
      setPhase('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onConfirm() {
    if (!rows) return;
    const toUpload = rows.filter((r) => r.species !== null);
    if (toUpload.length === 0) return;
    setPhase('running');
    setError(null);
    setProgress({ done: 0, total: toUpload.length });

    let idx = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.species === null) {
        setRows((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[i] = { ...row, status: 'skipped' };
          return next;
        });
        continue;
      }
      setRows((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[i] = { ...row, status: 'uploading' };
        return next;
      });
      try {
        const asset = rows[i];
        // We don't have exact dimensions in RowState; treat as unknown-large & always resize down.
        const compressed = await compressToJpeg(asset.uri, MAX_DIMENSION, MAX_DIMENSION);
        const bytes = await uriToBytes(compressed);
        await uploadSpeciesPhotoBytes({
          speciesId: row.species!.id,
          uploaderId,
          bytes,
          contentType: 'image/jpeg',
        });
        setRows((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[i] = { ...row, status: 'uploaded' };
          return next;
        });
      } catch (e: unknown) {
        setRows((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[i] = { ...row, status: 'error', error: e instanceof Error ? e.message : String(e) };
          return next;
        });
      }
      idx += 1;
      setProgress({ done: idx, total: toUpload.length });
    }
    setPhase('done');
    onDone?.();
  }

  const uploaded = rows?.filter((r) => r.status === 'uploaded').length ?? 0;
  const errored = rows?.filter((r) => r.status === 'error').length ?? 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <ScrollView style={styles.bg} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Bulk photo upload</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Filenames should match species slugs, e.g. <ThemedText type="small">elkhorn-coral.jpg</ThemedText>.
            </ThemedText>
          </View>
          <Pressable onPress={onClose} disabled={phase === 'running'}>
            <ThemedText type="small" themeColor="textSecondary">Close</ThemedText>
          </Pressable>
        </View>

        {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}

        {phase === 'pick' ? (
          <Pressable
            onPress={onPick}
            disabled={!catalog}
            style={({ pressed }) => [
              inputStyles.primaryButton,
              (pressed || !catalog) && inputStyles.buttonDisabled,
            ]}
          >
            <ThemedText type="default" style={inputStyles.primaryButtonText}>
              {catalog ? 'Pick multiple images…' : 'Loading catalog…'}
            </ThemedText>
          </Pressable>
        ) : null}

        {phase === 'preview' && rows ? (
          <>
            <View style={styles.summary}>
              <ThemedText type="default">
                {matchedCount} matched · {unmatchedCount} unmatched
              </ThemedText>
              {unmatchedCount > 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Unmatched files will be skipped. Rename to match a species slug and re-pick to include.
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.list}>
              {rows.map((r, i) => (
                <View key={`${r.fileName}-${i}`} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="default" numberOfLines={1}>{r.fileName}</ThemedText>
                    {r.species ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        → {r.species.common_name} ({r.species.scientific_name})
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" style={inputStyles.errorText}>
                        No species with slug "{r.slug}" — will be skipped.
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.buttonRow}>
              <Pressable onPress={onPick} style={[styles.secondaryBtn]}>
                <ThemedText type="default">Pick different files</ThemedText>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={matchedCount === 0}
                style={({ pressed }) => [
                  inputStyles.primaryButton,
                  { flex: 1 },
                  (pressed || matchedCount === 0) && inputStyles.buttonDisabled,
                ]}
              >
                <ThemedText type="default" style={inputStyles.primaryButtonText}>
                  Upload {matchedCount} photo{matchedCount === 1 ? '' : 's'}
                </ThemedText>
              </Pressable>
            </View>
          </>
        ) : null}

        {phase === 'running' && rows ? (
          <>
            <View style={styles.summary}>
              <ThemedText type="default">
                Uploading {progress.done + 1} of {progress.total}…
              </ThemedText>
              <ActivityIndicator />
            </View>
            <View style={styles.list}>
              {rows.map((r, i) => (
                <View key={`${r.fileName}-${i}`} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="default" numberOfLines={1}>{r.fileName}</ThemedText>
                    {r.species ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        → {r.species.common_name}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText type="small">
                    {r.status === 'uploaded' ? '✓' :
                      r.status === 'uploading' ? '…' :
                        r.status === 'skipped' ? '—' :
                          r.status === 'error' ? '✗' : ''}
                  </ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {phase === 'done' && rows ? (
          <>
            <View style={styles.summary}>
              <ThemedText type="default">
                Done: {uploaded} uploaded · {errored} errored · {unmatchedCount} unmatched
              </ThemedText>
            </View>
            {errored > 0 ? (
              <View style={styles.list}>
                {rows.filter((r) => r.status === 'error').map((r, i) => (
                  <View key={`err-${i}`} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="default" numberOfLines={1}>{r.fileName}</ThemedText>
                      <ThemedText type="small" style={inputStyles.errorText}>{r.error}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                inputStyles.primaryButton,
                pressed && inputStyles.buttonDisabled,
              ]}
            >
              <ThemedText type="default" style={inputStyles.primaryButtonText}>Done</ThemedText>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

// Re-export for any consumer that wants the raw slug utility.
export { fileNameToSlug };

const styles = StyleSheet.create({
  bg: { backgroundColor: '#000' },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  summary: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#111',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.one,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  secondaryBtn: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },
});
