import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { FormField, inputStyles } from '@/components/form/FormField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  deleteSpeciesPhoto,
  listSpeciesPhotos,
  pickAndUploadSpeciesPhoto,
  setPrimarySpeciesPhoto,
  speciesPhotoUrl,
} from '@/lib/species/photos';
import type { Species, SpeciesPhoto } from '@/lib/types';

interface Props {
  visible: boolean;
  species: Pick<Species, 'id' | 'common_name' | 'scientific_name'> | null;
  uploaderId: string;
  onClose: () => void;
  onChanged?: () => void; // called after any successful mutation, so parent can refresh
}

export function SpeciesPhotosModal({ visible, species, uploaderId, onClose, onChanged }: Props) {
  const [photos, setPhotos] = useState<SpeciesPhoto[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [credit, setCredit] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [license, setLicense] = useState('');
  const [makePrimary, setMakePrimary] = useState(false);

  const refresh = useCallback(async () => {
    if (!species) return;
    setError(null);
    try {
      setPhotos(await listSpeciesPhotos(species.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [species]);

  useEffect(() => {
    if (!visible || !species) return;
    setPhotos(null);
    setCredit('');
    setSourceUrl('');
    setLicense('');
    setMakePrimary(false);
    refresh();
  }, [visible, species, refresh]);

  async function onUpload() {
    if (!species) return;
    setBusy('uploading');
    setError(null);
    try {
      await pickAndUploadSpeciesPhoto(species.id, uploaderId, {
        credit: credit.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        license: license.trim() || null,
        makePrimary,
      });
      setCredit('');
      setSourceUrl('');
      setLicense('');
      setMakePrimary(false);
      await refresh();
      onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onSetPrimary(photoId: string) {
    setBusy('primary');
    setError(null);
    try {
      await setPrimarySpeciesPhoto(photoId);
      await refresh();
      onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Set primary failed.');
    } finally {
      setBusy(null);
    }
  }

  async function onDelete(photo: SpeciesPhoto) {
    setBusy('delete');
    setError(null);
    try {
      await deleteSpeciesPhoto(photo);
      await refresh();
      onChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <ScrollView style={styles.bg} contentContainerStyle={styles.scroll}>
        {species ? (
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <ThemedText type="title">{species.common_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {species.scientific_name}
                </ThemedText>
              </View>
              <Pressable onPress={onClose} disabled={!!busy}>
                <ThemedText type="small" themeColor="textSecondary">Close</ThemedText>
              </Pressable>
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Photos</ThemedText>
              {photos === null ? (
                <ActivityIndicator />
              ) : photos.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No photos yet — upload one below.
                </ThemedText>
              ) : (
                <View style={styles.photoGrid}>
                  {photos.map((p) => (
                    <View key={p.id} style={styles.photoCard}>
                      <Image source={{ uri: speciesPhotoUrl(p.storage_path) }} style={styles.photoImg} contentFit="cover" />
                      {p.is_primary ? (
                        <View style={styles.primaryBadge}>
                          <ThemedText type="small" style={styles.primaryBadgeText}>Primary</ThemedText>
                        </View>
                      ) : null}
                      {p.credit ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                          {p.credit}
                        </ThemedText>
                      ) : null}
                      <View style={styles.photoActions}>
                        {p.is_primary ? null : (
                          <Pressable
                            onPress={() => onSetPrimary(p.id)}
                            disabled={!!busy}
                            style={[styles.smallBtn, !!busy && inputStyles.buttonDisabled]}
                          >
                            <ThemedText type="small">Set primary</ThemedText>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => onDelete(p)}
                          disabled={!!busy}
                          style={[styles.smallBtn, styles.smallBtnDanger, !!busy && inputStyles.buttonDisabled]}
                        >
                          <ThemedText type="small" style={inputStyles.errorText}>Delete</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Upload a new photo</ThemedText>
              <FormField label="Credit (optional)">
                <TextInput
                  style={inputStyles.input}
                  value={credit}
                  onChangeText={setCredit}
                  placeholder='e.g. "Jane Doe · CC BY-SA 4.0 · Wikimedia Commons"'
                  placeholderTextColor="#666"
                />
              </FormField>
              <FormField label="Source URL (optional)">
                <TextInput
                  style={inputStyles.input}
                  value={sourceUrl}
                  onChangeText={setSourceUrl}
                  placeholder="https://commons.wikimedia.org/wiki/File:..."
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                />
              </FormField>
              <FormField label="License (optional)">
                <TextInput
                  style={inputStyles.input}
                  value={license}
                  onChangeText={setLicense}
                  placeholder="e.g. CC BY-SA 4.0"
                  placeholderTextColor="#666"
                />
              </FormField>
              <View style={styles.switchRow}>
                <ThemedText type="small">Make this the primary photo</ThemedText>
                <Switch value={makePrimary} onValueChange={setMakePrimary} disabled={!!busy} />
              </View>
              <Pressable
                onPress={onUpload}
                disabled={!!busy}
                style={({ pressed }) => [
                  inputStyles.primaryButton,
                  (pressed || !!busy) && inputStyles.buttonDisabled,
                ]}
              >
                {busy === 'uploading' ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText type="default" style={inputStyles.primaryButtonText}>
                    Pick image & upload
                  </ThemedText>
                )}
              </Pressable>
            </View>

            {error ? <ThemedText type="small" style={inputStyles.errorText}>{error}</ThemedText> : null}
          </>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

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
  section: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: '#333',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  photoCard: {
    width: 180,
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#111',
  },
  photoImg: {
    width: '100%',
    height: 140,
    borderRadius: Spacing.one,
    backgroundColor: '#222',
  },
  primaryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#00c1d1',
  },
  primaryBadgeText: {
    color: '#000',
    fontWeight: '700',
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  smallBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: '#444',
    backgroundColor: 'transparent',
  },
  smallBtnDanger: {
    borderColor: '#664',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
