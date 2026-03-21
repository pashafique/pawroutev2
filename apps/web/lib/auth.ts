/**
 * @file auth.ts
 * @description Auth helper functions for the web app.
 */

import { api } from './api';

export async function register(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const res = await api.post('/auth/register', data);
  const { accessToken, refreshToken } = res.data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  return res.data.data;
}

export async function login(identifier: string, password: string) {
  const res = await api.post('/auth/login', { identifier, password });
  const { accessToken, refreshToken } = res.data.data;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
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

export async function resetPassword(token: string, newPassword: string) {
  await api.post('/auth/reset-password', { token, newPassword });
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}
