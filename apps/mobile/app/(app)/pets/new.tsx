import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { appConfig } from '@pawroute/config';
import { createPet, uploadPetPhoto } from '../../../lib/pets';
import { classifyPetSize, getPetSizeOptions } from '@pawroute/utils';

const c = appConfig.brand.colors;

export default function NewPetScreen() {
  const [form, setForm] = useState({
    name: '', type: 'DOG' as 'DOG' | 'CAT', breed: '',
    ageYears: '0', ageMonths: '0', weightKg: '',
    gender: 'UNKNOWN' as 'MALE' | 'FEMALE' | 'UNKNOWN', specialNotes: '',
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [detectedBreed, setDetectedBreed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upd = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const sizeOptions = getPetSizeOptions();
  const kg = parseFloat(form.weightKg);
  const currentSize = !isNaN(kg) && kg > 0 ? classifyPetSize(kg) : null;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.breed.trim() || !form.weightKg) {
      setError('Name, breed, and weight are required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const pet = await createPet({
        name: form.name.trim(),
        type: form.type,
        breed: form.breed.trim(),
        ageYears: parseInt(form.ageYears, 10) || 0,
        ageMonths: parseInt(form.ageMonths, 10) || 0,
        weightKg: parseFloat(form.weightKg),
        gender: form.gender,
        specialNotes: form.specialNotes.trim() || undefined,
      });

      if (photoUri) {
        const result = await uploadPetPhoto(pet.id, photoUri);
        if (result.detectedBreed) setDetectedBreed(result.detectedBreed);
      }

      router.back();
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Failed to add pet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageTitle}>Add a Pet</Text>

      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

      {/* Photo picker */}
      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto} activeOpacity={0.8}>
        {photoUri
          ? <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          : <View style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>{form.type === 'DOG' ? '🐶' : '🐱'}</Text>
              <Text style={styles.photoLabel}>Add Photo</Text>
            </View>
        }
      </TouchableOpacity>
      {detectedBreed && (
        <TouchableOpacity onPress={() => upd('breed')(detectedBreed)} style={styles.breedChip}>
          <Text style={styles.breedChipText}>✨ AI suggests: {detectedBreed} — tap to use</Text>
        </TouchableOpacity>
      )}

      {/* Type toggle */}
      <View style={styles.toggleRow}>
        {(['DOG', 'CAT'] as const).map((t) => (
          <TouchableOpacity key={t}
            style={[styles.toggleBtn, form.type === t && styles.toggleActive]}
            onPress={() => upd('type')(t)} activeOpacity={0.8}>
            <Text style={[styles.toggleText, form.type === t && styles.toggleTextActive]}>
              {t === 'DOG' ? '🐶 Dog' : '🐱 Cat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Fields */}
      {[
        { key: 'name', label: 'Pet Name *', placeholder: 'e.g. Buddy', kb: 'default' },
        { key: 'breed', label: 'Breed *', placeholder: 'e.g. Golden Retriever', kb: 'default' },
      ].map(({ key, label, placeholder }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput style={styles.input} value={(form as any)[key]} onChangeText={upd(key as any)}
            placeholder={placeholder} placeholderTextColor={c.textSecondary + '80'} />
        </View>
      ))}

      {/* Age */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Age (years)</Text>
          <TextInput style={styles.input} value={form.ageYears} onChangeText={upd('ageYears')}
            keyboardType="numeric" placeholder="0" placeholderTextColor={c.textSecondary + '80'} />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Age (months)</Text>
          <TextInput style={styles.input} value={form.ageMonths} onChangeText={upd('ageMonths')}
            keyboardType="numeric" placeholder="0" placeholderTextColor={c.textSecondary + '80'} />
        </View>
      </View>

      {/* Weight + size */}
      <View style={styles.field}>
        <Text style={styles.label}>Weight (kg) *</Text>
        <TextInput style={styles.input} value={form.weightKg} onChangeText={upd('weightKg')}
          keyboardType="decimal-pad" placeholder="e.g. 8.5" placeholderTextColor={c.textSecondary + '80'} />
        {currentSize && (
          <View style={styles.sizeChips}>
            {sizeOptions.map((s) => (
              <View key={s.value} style={[styles.sizeChip, s.value === currentSize && styles.sizeChipActive]}>
                <Text style={[styles.sizeChipText, s.value === currentSize && styles.sizeChipTextActive]}>
                  {s.label} ({s.range})
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Gender */}
      <View style={styles.field}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.toggleRow}>
          {(['MALE', 'FEMALE', 'UNKNOWN'] as const).map((g) => (
            <TouchableOpacity key={g}
              style={[styles.toggleBtn, form.gender === g && styles.genderActive]}
              onPress={() => upd('gender')(g)} activeOpacity={0.8}>
              <Text style={[styles.toggleText, form.gender === g && styles.toggleTextActive]}>
                {g === 'MALE' ? '♂ Male' : g === 'FEMALE' ? '♀ Female' : '? Unknown'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.field}>
        <Text style={styles.label}>Special Notes (optional)</Text>
        <TextInput style={[styles.input, styles.textarea]} value={form.specialNotes}
          onChangeText={upd('specialNotes')} multiline numberOfLines={3}
          placeholder="Allergies, behaviour, preferences..." placeholderTextColor={c.textSecondary + '80'} />
      </View>

      <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        onPress={handleSave} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.saveBtnText}>Add Pet</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8F7FF' },
  container: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 20 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, color: '#B91C1C' },
  photoPicker: {
    alignSelf: 'center', width: 100, height: 100, borderRadius: 20,
    overflow: 'hidden', marginBottom: 8, borderWidth: 2, borderStyle: 'dashed',
    borderColor: c.lavenderDark,
  },
  photoPreview: { width: 100, height: 100 },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.lavender },
  photoEmoji: { fontSize: 36 },
  photoLabel: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
  breedChip: {
    alignSelf: 'center', backgroundColor: c.lavender,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 14,
  },
  breedChipText: { fontSize: 12, color: c.primary, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: c.lavender, alignItems: 'center',
  },
  toggleActive: { backgroundColor: c.primary },
  genderActive: { backgroundColor: c.secondary },
  toggleText: { fontSize: 13, fontWeight: '600', color: c.primary },
  toggleTextActive: { color: '#fff' },
  field: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 13, fontWeight: '500', color: c.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: c.lavenderDark, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: c.textPrimary, backgroundColor: '#fff',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  sizeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  sizeChip: { backgroundColor: c.lavender, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  sizeChipActive: { backgroundColor: c.primary },
  sizeChipText: { fontSize: 11, color: c.textSecondary },
  sizeChipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
});
