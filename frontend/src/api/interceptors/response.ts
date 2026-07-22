/**
 * Response Interceptors
 *
 * Pure functions applied to every Axios response / error by client.ts.
 */

import type { AxiosResponse } from 'axios';
import env from '@/config/env';
import { ApiError } from '../errors';

// ─── Success path ─────────────────────────────────────────────────

/**
 * Logs successful responses in development.
 * Returns the response unchanged so the data chain is unaffected.
 */
export function logResponse(response: AxiosResponse): AxiosResponse {
  if (env.isDev) {
    const status = String(response.status).padEnd(3, ' ');
    const method = response.config.method?.toUpperCase().padEnd(6, ' ') ?? '';
    console.debug(
      `%c[API ←] ${status} ${method} ${response.config.url}`,
      'color:#4ade80',
    );
  }
  return response;
}

// ─── Error path ───────────────────────────────────────────────────

/**
 * Converts every Axios error into a typed ApiError and rejects the
 * promise with it.  Callers never receive a raw AxiosError.
 *
 * Side-effects handled here (not in client.ts to keep it clean):
 *  - 401 → clears stored tokens and redirects to /login
 *  - 429 → logs a rate-limit warning
 */
export function handleResponseError(error: unknown): Promise<never> {
  const apiError = ApiError.from(error);

  // ── Dev logging ──────────────────────────────────────────────────
  if (env.isDev && !apiError.isCancelledError) {
    console.error(
      `%c[API ✗] ${apiError.statusCode} ${apiError.code} — ${apiError.message}`,
      'color:#f87171',
      apiError,
    );
  }


  // ── 429 rate-limit warning ────────────────────────────────────────
  if (apiError.isRateLimitError && env.isDev) {
    console.warn('[API] Rate limit hit. Back off before retrying.');
  }

  return Promise.reject(apiError);
}

// ─── Retry helper ─────────────────────────────────────────────────

const MAX_RETRIES   = 2;
const RETRY_DELAY   = 1_000; // ms — doubles on each attempt

/**
 * Returns `true` when a failed request is eligible for an automatic retry.
 *
 * Retries on:
 *  - Network errors (no response received)
 *  - 5xx server errors (transient server issues)
 *
 * Never retries on:
 *  - 4xx client errors
 *  - Cancelled requests
 *  - Requests that already reached the retry limit
 */
export function shouldRetry(error: ApiError, retryCount: number): boolean {
  if (retryCount >= MAX_RETRIES)    return false;
  if (error.isCancelledError)       return false;
  if (error.isTimeoutError)         return false;
  if (error.isClientError)          return false;  // 4xx — fix the request
  return error.isNetworkError || error.isServerError;
}

export { MAX_RETRIES, RETRY_DELAY };
