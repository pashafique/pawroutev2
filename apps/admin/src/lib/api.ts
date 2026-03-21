/**
 * @file api.ts
 * @description Axios client for PawRoute Admin API with JWT interceptor.
 */

import axios from 'axios';
import { appConfig } from '@pawroute/config';

export const api = axios.create({
  baseURL: `${appConfig.api.baseUrl}/api/${appConfig.api.version}`,
  timeout: appConfig.api.timeout,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminAccessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(
          `${appConfig.api.baseUrl}/api/${appConfig.api.version}/admin/auth/refresh`,
          { refreshToken }
        );
        localStorage.setItem('adminAccessToken', data.data.accessToken);
        localStorage.setItem('adminRefreshToken', data.data.refreshToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem('adminAccessToken');
}
