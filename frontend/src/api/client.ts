/**
 * Axios API Client
 *
 * Central HTTP client shared by all service modules.
 *
 * Configuration
 * ─────────────
 *  • Base URL    — read from VITE_API_BASE_URL
 *  • Timeout     — 30 s (override per-request via RequestOptions.timeout)
 *  • Headers     — Content-Type: application/json, Accept, X-Client-Version
 *  • Credentials — false (cookie-based auth is not used)
 *
 * Interceptor pipeline
 * ────────────────────
 *  Request  →  attachRequestId → attachAuthToken → attachClientMetadata → logRequest
 *  Response →  logResponse
 *  Error    →  handleResponseError (normalises to ApiError) → retry (network/5xx)
 *
 * Usage
 * ─────
 *  import apiClient from '@/api/client';
 *  const { data } = await apiClient.get<ApiResponse<Device>>('/devices/1');
 *
 * For most use-cases, prefer the typed service modules (src/services/).
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import env from '@/config/env';
import {
  attachRequestId,
  attachAuthToken,
  attachClientMetadata,
  logRequest,
} from './interceptors/request';
import {
  logResponse,
  handleResponseError,
  shouldRetry,
  RETRY_DELAY,
} from './interceptors/response';
import { ApiError } from './errors';

// ─── Token Refresh State ──────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];
let isSessionDead = false;

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Instance ─────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL:         env.apiBaseUrl,
  timeout:         30_000,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

// ─── Request interceptors (applied first-in, first-out) ───────────

apiClient.interceptors.request.use(
  (config) => {
    if (config.url === '/auth/login') {
      isSessionDead = false;
    }

    if (isSessionDead && config.url !== '/auth/login' && config.url !== '/auth/refresh') {
      return Promise.reject(new ApiError({
        message: 'Your session has expired. Please sign in again.',
        code: 'AUTH_EXPIRED',
        statusCode: 401
      }));
    }

    attachRequestId(config);
    attachAuthToken(config);
    attachClientMetadata(config);
    logRequest(config);
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ─── Response interceptors ────────────────────────────────────────

apiClient.interceptors.response.use(
  (response) => {
    logResponse(response);
    return response;
  },
  async (error: unknown) => {
    // Convert to ApiError so shouldRetry has a typed value
    const apiError = ApiError.from(error);

    // ── Automatic retry for transient failures ───────────────────
    const config      = (error as AxiosError).config as any;
    const retryCount  = config?._retryCount ?? 0;

    // ── Token Refresh ────────────────────────────────────────────────
    if (apiError.isAuthError && !config?._isRetryForAuth) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (config) {
              config.headers['Authorization'] = 'Bearer ' + token;
              return apiClient.request(config);
            }
          })
          .catch((err) => Promise.reject(err));
      }

      if (config) config._isRetryForAuth = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${env.apiBaseUrl}/auth/refresh`, { refresh_token: refreshToken });
          const { access_token, refresh_token: new_refresh_token } = res.data;
          
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', new_refresh_token);
          
          isRefreshing = false;
          processQueue(null, access_token);
          
          if (config) {
            config.headers['Authorization'] = 'Bearer ' + access_token;
            return apiClient.request(config);
          }
        } catch (refreshErr) {
          isRefreshing = false;
          isSessionDead = true;
          processQueue(refreshErr as Error, null);
          return handleResponseError(apiError);
        }
      } else {
        isRefreshing = false;
        isSessionDead = true;
      }
    }

    if (config && shouldRetry(apiError, retryCount)) {
      const nextRetryCount = retryCount + 1;

      const delay = RETRY_DELAY * 2 ** retryCount; // 1s → 2s

      await new Promise<void>((resolve) => setTimeout(resolve, delay));

      if (env.isDev) {
        console.debug(`[API] Retrying request (attempt ${nextRetryCount})…`);
      }

      // Axios internally merges/clones the config passed to `request()`, so
      // mutating `config._retryCount` in place and relying on that same
      // object reference reaching this interceptor again on the next
      // failure does NOT reliably carry the count forward — it must be
      // set on the config object actually being dispatched.
      return apiClient.request({ ...config, _retryCount: nextRetryCount });
    }

    return handleResponseError(apiError);
  },
);

// ─── Exports ──────────────────────────────────────────────────────

export default apiClient;

/**
 * Creates a pre-configured AbortController for request cancellation.
 *
 * @example
 * const { controller, signal } = createRequestController();
 * apiClient.get('/devices', { signal });
 * controller.abort(); // cancels the request
 */
export function createRequestController(): {
  controller: AbortController;
  signal:     AbortSignal;
} {
  const controller = new AbortController();
  return { controller, signal: controller.signal };
}

