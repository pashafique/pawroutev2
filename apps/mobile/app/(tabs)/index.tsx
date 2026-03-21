import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { mobileTheme } from '@pawroute/config';

const c = mobileTheme.colors;
const sp = mobileTheme.spacing;

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Banner */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🐾</Text>
        <Text style={styles.heroTitle}>{appConfig.product.tagline}</Text>
        <Text style={styles.heroSubtitle}>{appConfig.product.shortDescription}</Text>
        <TouchableOpacity style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>Book a Grooming</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {[
          { label: 'My Pets', emoji: '🐶' },
          { label: 'Services', emoji: '✂️' },
          { label: 'Gallery', emoji: '📸' },
          { label: 'Support', emoji: '💬' },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.quickCard}>
            <Text style={styles.quickEmoji}>{item.emoji}</Text>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: sp.lg },
  hero: {
    backgroundColor: c.primary,
    borderRadius: 20,
    padding: sp.xl,
    alignItems: 'center',
    marginBottom: sp.xl,
  },
  heroEmoji: { fontSize: 48, marginBottom: sp.sm },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: sp.lg,
  },
  bookBtn: {
    backgroundColor: c.accent, // #FFC212 golden yellow
    paddingHorizontal: sp['2xl'],
    paddingVertical: sp.md,
    borderRadius: 12,
  },
  bookBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: c.textPrimary,
    marginBottom: sp.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sp.md,
  },
  quickCard: {
    width: '46%',
    backgroundColor: c.lavender, // #E0DFFD soft lavender
    borderRadius: 16,
    padding: sp.lg,
    alignItems: 'center',
    gap: sp.sm,
  },
  quickEmoji: { fontSize: 32 },
  quickLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.primary },
});
