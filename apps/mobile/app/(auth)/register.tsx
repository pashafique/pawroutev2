import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { register, sendOtp } from '../../lib/auth';

const c = appConfig.brand.colors;

export default function RegisterScreen() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    const { name, email, phone, password } = form;
    if (!name.trim() || !email.trim() || !phone.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      if (appConfig.features.emailOtp) {
        await sendOtp(email.trim(), 'email', name.trim());
        router.push({ pathname: '/(auth)/otp', params: { target: email.trim(), channel: 'email', name: name.trim() } });
      } else {
        router.replace('/(tabs)/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.paw}>🐾</Text>
          <Text style={styles.brand}>{appConfig.product.name}</Text>
          <Text style={styles.tagline}>Book grooming for your pet in minutes</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create account</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          {([
            { key: 'name', label: 'Full Name', placeholder: 'Jane Smith', type: 'default' },
            { key: 'email', label: 'Email', placeholder: 'jane@email.com', type: 'email-address' },
            { key: 'phone', label: 'Phone', placeholder: '+971 50 000 0000', type: 'phone-pad' },
            { key: 'password', label: 'Password', placeholder: 'Min 8 chars, uppercase, number', type: 'default', secure: true },
          ] as const).map(({ key, label, placeholder, type, secure }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={form[key]}
                onChangeText={update(key)}
                placeholder={placeholder}
                placeholderTextColor={c.textSecondary + '80'}
                keyboardType={type}
                secureTextEntry={secure}
                autoCapitalize={key === 'name' ? 'words' : 'none'}
                autoComplete={key === 'email' ? 'email' : key === 'password' ? 'password-new' : 'off'}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#1a1a2e" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.switchText}>
            Already have an account?{' '}
            <Text style={styles.switchLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.primary },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingTop: 48, paddingBottom: 24 },
  paw: { fontSize: 40, marginBottom: 6 },
  brand: { fontSize: 28, fontWeight: '700', color: '#fff' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, elevation: 8 },
  title: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: '#B91C1C' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '500', color: c.textPrimary, marginBottom: 6 },
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
  btn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  switchText: { textAlign: 'center', marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  switchLink: { fontWeight: '700', color: '#fff', textDecorationLine: 'underline' },
});
