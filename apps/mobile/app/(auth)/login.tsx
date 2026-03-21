import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { login } from '../../lib/auth';

const c = appConfig.brand.colors;

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace('/(tabs)/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.paw}>🐾</Text>
          <Text style={styles.brand}>{appConfig.product.name}</Text>
          <Text style={styles.tagline}>{appConfig.product.tagline}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to manage your bookings</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email or Phone</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="jane@email.com or +971 50..."
              placeholderTextColor={c.textSecondary + '80'}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.link}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={c.textSecondary + '80'}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#1a1a2e" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.switchText}>
            New to {appConfig.product.name}?{' '}
            <Text style={styles.switchLink}>Create account</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.primary },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 60, paddingBottom: 32 },
  paw: { fontSize: 48, marginBottom: 8 },
  brand: { fontSize: 32, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: c.textSecondary, marginBottom: 20 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#B91C1C' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: c.textPrimary, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  link: { fontSize: 12, color: c.secondary, fontWeight: '500' },
  input: {
    borderWidth: 1.5,
    borderColor: c.lavenderDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: c.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  btn: {
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  switchText: { textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  switchLink: { fontWeight: '700', color: '#fff', textDecorationLine: 'underline' },
});
