import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { appConfig } from '@pawroute/config';
import { verifyOtp, sendOtp } from '../../lib/auth';

const c = appConfig.brand.colors;

export default function OtpScreen() {
  const { target, channel, name } = useLocalSearchParams<{
    target: string;
    channel: 'email' | 'whatsapp';
    name: string;
  }>();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const expiryMin = channel === 'whatsapp'
    ? appConfig.auth.otpExpiryMinutesWhatsapp
    : appConfig.auth.otpExpiryMinutesEmail;

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await verifyOtp(target, otp, channel ?? 'email');
      router.replace('/(tabs)/');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await sendOtp(target, channel ?? 'email', name ?? 'there');
      setError('');
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Too many requests. Please wait before resending.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>{channel === 'whatsapp' ? '💬' : '📧'}</Text>
        </View>
        <Text style={styles.title}>Verify your {channel === 'whatsapp' ? 'phone' : 'email'}</Text>
        <Text style={styles.subtitle}>
          We sent a {expiryMin}-minute code to{'\n'}
          <Text style={styles.target}>{target}</Text>
        </Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <TextInput
          style={styles.otpInput}
          value={otp}
          onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={c.lavenderDark}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.btn, (loading || otp.length !== 6) && styles.btnDisabled]}
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#1a1a2e" />
            : <Text style={styles.btnText}>Verify</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleResend}
          disabled={resendLoading}
          style={styles.resendBtn}
        >
          <Text style={styles.resendText}>
            {resendLoading ? 'Sending…' : "Didn't get it? Resend"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrapper: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: c.lavender,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '700', color: c.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  target: { fontWeight: '600', color: c.textPrimary },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16, width: '100%' },
  errorText: { fontSize: 13, color: '#B91C1C', textAlign: 'center' },
  otpInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: c.lavenderDark,
    borderRadius: 16,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: '700',
    color: c.primary,
    letterSpacing: 12,
    backgroundColor: c.lavender,
    marginBottom: 20,
  },
  btn: {
    width: '100%',
    backgroundColor: c.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  resendBtn: { marginTop: 16 },
  resendText: { fontSize: 14, color: c.secondary, fontWeight: '500', textDecorationLine: 'underline' },
});
