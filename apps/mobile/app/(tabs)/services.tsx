import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { listCategories } from '../../lib/services';
import type { ServiceCategory } from '@pawroute/types';

const c = appConfig.brand.colors;
const CUR = appConfig.locale.currencySymbol;

function formatDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function ServicesScreen() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DOG' | 'CAT'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try { setCategories(await listCategories()); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'ALL' ? categories : categories.filter((c) => c.petType === filter);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={c.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={c.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Services</Text>
            <Text style={styles.subtitle}>Professional grooming for dogs & cats</Text>
            <View style={styles.filterRow}>
              {(['ALL', 'DOG', 'CAT'] as const).map((t) => (
                <TouchableOpacity key={t}
                  style={[styles.filterBtn, filter === t && styles.filterActive]}
                  onPress={() => setFilter(t)} activeOpacity={0.8}>
                  <Text style={[styles.filterText, filter === t && styles.filterTextActive]}>
                    {t === 'ALL' ? '🐾 All' : t === 'DOG' ? '🐶 Dogs' : '🐱 Cats'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: cat }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{cat.name}</Text>
            {(cat as any).services?.map((svc: any) => (
              <View key={svc.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.svcName}>{svc.name}</Text>
                    <Text style={styles.svcDesc} numberOfLines={2}>{svc.description}</Text>
                    <Text style={styles.svcDuration}>⏱ {formatDuration(svc.durationMin)}</Text>
                  </View>
                  <View style={styles.priceCol}>
                    {svc.pricing?.map((p: any) => (
                      <Text key={p.sizeLabel} style={styles.price}>
                        <Text style={styles.priceLabel}>{p.sizeLabel[0]} </Text>
                        {CUR}{p.price}
                      </Text>
                    ))}
                  </View>
                </View>

                {svc.addons?.length > 0 && (
                  <View style={styles.addonsWrap}>
                    {svc.addons.map((a: any) => (
                      <View key={a.id} style={styles.addonChip}>
                        <Text style={styles.addonText}>{a.name} +{CUR}{a.price}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => router.push({ pathname: '/(app)/book', params: { serviceId: svc.id } })}
                  activeOpacity={0.8}>
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 2 },
  subtitle: { fontSize: 13, color: c.textSecondary, marginBottom: 14 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: c.lavender, alignItems: 'center' },
  filterActive: { backgroundColor: c.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: c.primary },
  filterTextActive: { color: '#fff' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: c.primary, marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    marginBottom: 10, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', gap: 10 },
  svcName: { fontSize: 15, fontWeight: '700', color: c.primary },
  svcDesc: { fontSize: 12, color: c.textSecondary, marginTop: 3, lineHeight: 18 },
  svcDuration: { fontSize: 11, color: c.secondary, marginTop: 4 },
  priceCol: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  price: { fontSize: 12, fontWeight: '600', color: c.primary, lineHeight: 18 },
  priceLabel: { color: c.textSecondary, fontWeight: '400' },
  addonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  addonChip: { backgroundColor: c.lavender, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  addonText: { fontSize: 10, color: c.primary },
  bookBtn: {
    marginTop: 12, backgroundColor: c.accent,
    borderRadius: 10, paddingVertical: 9, alignItems: 'center',
  },
  bookBtnText: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
});
