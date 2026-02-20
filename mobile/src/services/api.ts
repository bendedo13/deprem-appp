/**
 * API Base konfigürasyonu — Axios instance + JWT interceptor.
 * Token otomatik header'a eklenir; 401 gelirse SecureStore temizlenir.
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

// VPS adresi veya local geliştirme — expo-constants üzerinden okunur
const BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://10.0.2.2:8000";

export const TOKEN_KEY = "deprem_access_token";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: her istekte JWT yükle ─────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: 401 → token temizle ─────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);
