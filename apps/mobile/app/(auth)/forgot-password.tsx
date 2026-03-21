import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { forgotPassword } from '../../lib/auth';

const c = appConfig.brand.colors;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.center}>
        <Text style={styles.successIcon}>📬</Text>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.desc}>
          If <Text style={styles.bold}>{email}</Text> is registered, we&apos;ve sent a reset link.
          {'\n'}It expires in {appConfig.auth.passwordResetExpiryMinutes} minutes.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.btnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.desc}>Enter your email and we&apos;ll send a reset link.</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="jane@email.com"
            placeholderTextColor={c.textSecondary + '80'}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#1a1a2e" />
            : <Text style={styles.btnText}>Send Reset Link</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  container: { flex: 1, padding: 28, paddingTop: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 8 },
  desc: { fontSize: 14, color: c.textSecondary, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  bold: { fontWeight: '600', color: c.textPrimary },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#B91C1C' },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', color: c.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: c.lavenderDark,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, color: c.textPrimary, backgroundColor: '#FAFAFA',
  },
  btn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
});
