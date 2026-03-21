/**
 * @file api.ts
 * @description Axios client for PawRoute API with JWT + SecureStore on mobile.
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { appConfig } from '@pawroute/config';

export const api = axios.create({
  baseURL: `${appConfig.api.baseUrl}/api/${appConfig.api.version}`,
  timeout: appConfig.api.timeout,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(
          `${appConfig.api.baseUrl}/api/${appConfig.api.version}/auth/refresh`,
          { refreshToken }
        );
        await SecureStore.setItemAsync('accessToken', data.data.accessToken);
        await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        // Redirect to auth handled by root layout
      }
    }
    return Promise.reject(error);
  }
);
