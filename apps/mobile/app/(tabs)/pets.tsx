import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { listPets, deletePet } from '../../lib/pets';
import type { Pet } from '@pawroute/types';

const c = appConfig.brand.colors;

const SIZE_COLORS: Record<string, { bg: string; text: string }> = {
  SMALL:  { bg: c.lavender, text: c.primary },
  MEDIUM: { bg: '#E8E4F8', text: '#5C4EB0' },
  LARGE:  { bg: '#FFF0B3', text: '#7A5500' },
  XL:     { bg: '#FFE4EE', text: '#8B1A4A' },
};

export default function PetsScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setPets(await listPets());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (pet: Pet) => {
    Alert.alert(
      'Remove Pet',
      `Remove ${pet.name} from your account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await deletePet(pet.id);
            setPets((p) => p.filter((x) => x.id !== pet.id));
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pets}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={c.primary} />}
        contentContainerStyle={pets.length === 0 ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>My Pets</Text>
              <Text style={styles.subtitle}>
                {pets.length} / {appConfig.booking.maxPetsPerUser} pets
              </Text>
            </View>
            {pets.length < appConfig.booking.maxPetsPerUser && (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/(app)/pets/new')}
                activeOpacity={0.8}
              >
                <Text style={styles.addBtnText}>+ Add Pet</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🐾</Text>
            <Text style={styles.emptyTitle}>No pets yet</Text>
            <Text style={styles.emptyDesc}>Add your first pet to start booking</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(app)/pets/new')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyBtnText}>Add Your Pet</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: pet }) => {
          const sizeBadge = SIZE_COLORS[pet.sizeCategory] ?? SIZE_COLORS['MEDIUM']!;
          return (
            <View style={styles.card}>
              {/* Avatar */}
              <View style={styles.avatar}>
                {pet.photo
                  ? <Image source={{ uri: pet.photo }} style={styles.avatarImage} />
                  : <Text style={styles.avatarEmoji}>{pet.type === 'DOG' ? '🐶' : '🐱'}</Text>
                }
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <View style={styles.cardRow}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <View style={[styles.sizeBadge, { backgroundColor: sizeBadge.bg }]}>
                    <Text style={[styles.sizeBadgeText, { color: sizeBadge.text }]}>
                      {pet.sizeCategory}
                    </Text>
                  </View>
                </View>
                <Text style={styles.petBreed}>{pet.breed}</Text>
                <Text style={styles.petMeta}>
                  {pet.weightKg}kg · {pet.ageYears}y {pet.ageMonths}m · {pet.gender.toLowerCase()}
                </Text>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push(`/(app)/pets/${pet.id}`)}
                  >
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.bookBtn]}
                    onPress={() => router.push({ pathname: '/(app)/book', params: { petId: pet.id } })}
                  >
                    <Text style={styles.bookBtnText}>Book</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(pet)}
                  >
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: c.primary },
  subtitle: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontWeight: '600', color: '#1a1a2e', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: c.primary },
  emptyDesc: { fontSize: 13, color: c.textSecondary, marginTop: 6, marginBottom: 20 },
  emptyBtn: { backgroundColor: c.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    flexDirection: 'row', gap: 12,
    marginBottom: 12, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: c.lavender, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 64, height: 64 },
  avatarEmoji: { fontSize: 30 },
  cardInfo: { flex: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  petName: { fontSize: 17, fontWeight: '700', color: c.primary },
  petBreed: { fontSize: 12, color: c.textSecondary, marginTop: 1 },
  petMeta: { fontSize: 11, color: c.textSecondary, marginTop: 3 },
  sizeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sizeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  actionBtn: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: c.lavender,
  },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: c.primary },
  bookBtn: { backgroundColor: c.accent },
  bookBtnText: { fontSize: 11, fontWeight: '600', color: '#1a1a2e' },
  deleteBtn: { backgroundColor: '#FEF2F2', marginLeft: 'auto' },
  deleteBtnText: { fontSize: 11, fontWeight: '600', color: '#B91C1C' },
});
