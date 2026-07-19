/**
 * Request Interceptors
 *
 * Pure functions that transform an outgoing AxiosRequestConfig.
 * Applied in order by client.ts before the request is dispatched.
 */

import type { InternalAxiosRequestConfig } from 'axios';
import env from '@/config/env';

// ─── Counter for request IDs ──────────────────────────────────────
let _requestCounter = 0;

// ─── Interceptors ─────────────────────────────────────────────────

/**
 * Attaches a unique X-Request-ID header to every outgoing request.
 * The ID is also stored on the config object so it can be correlated
 * with the matching error in the response interceptor.
 */
export function attachRequestId(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  const id = `${Date.now()}-${String(++_requestCounter).padStart(4, '0')}`;
  config.headers['X-Request-ID'] = id;
  config._requestId              = id;
  return config;
}

/**
 * Attaches the Authorization Bearer token when one is present in
 * localStorage. Tokens are written by useAuthStore on login and
 * cleared on logout / 401 (see interceptors/response.ts).
 */
export function attachAuthToken(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  // Certain routes must never carry an auth header (e.g. public health checks)
  if (config.headers['X-Skip-Auth']) {
    delete config.headers['X-Skip-Auth'];
    return config;
  }

  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

/**
 * Attaches static client metadata headers.
 * Used by the backend for diagnostics and version-mismatch detection.
 */
export function attachClientMetadata(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  config.headers['X-Client-Version'] = env.appVersion;
  config.headers['X-Client-Env']     = env.appEnv;
  return config;
}

/**
 * Logs outgoing requests to the browser console in development.
 * No-op in production.
 */
export function logRequest(
  config: InternalAxiosRequestConfig,
): InternalAxiosRequestConfig {
  if (env.isDev) {
    const method = config.method?.toUpperCase().padEnd(6, ' ') ?? 'GET   ';
    console.debug(`%c[API →] ${method} ${config.baseURL ?? ''}${config.url}`, 'color:#60a5fa');
  }
  return config;
}
