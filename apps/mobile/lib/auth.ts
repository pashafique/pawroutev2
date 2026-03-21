/**
 * @file auth.ts
 * @description Auth helpers for the mobile app using expo-secure-store.
 */

import * as SecureStore from 'expo-secure-store';
import { api } from './api';

export async function register(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const res = await api.post('/auth/register', data);
  const { accessToken, refreshToken } = res.data.data;
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
  return res.data.data;
}

export async function login(identifier: string, password: string) {
  const res = await api.post('/auth/login', { identifier, password });
  const { accessToken, refreshToken } = res.data.data;
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
  return res.data.data;
}

export async function sendOtp(target: string, type: 'email' | 'whatsapp', name: string) {
  await api.post('/auth/otp/send', { target, type, name });
}

export async function verifyOtp(target: string, otp: string, channel: 'email' | 'whatsapp') {
  await api.post('/auth/otp/verify', { target, otp, channel });
}

export async function forgotPassword(email: string) {
  await api.post('/auth/forgot-password', { email });
}

export async function logout() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await SecureStore.getItemAsync('accessToken');
  return !!token;
}
