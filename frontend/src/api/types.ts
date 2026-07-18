/**
 * API-layer type definitions
 *
 * These types are scoped to the HTTP/transport layer.
 * Domain-model types live in src/types/index.ts.
 */

import type { AxiosRequestConfig } from 'axios';

// ─── Request Options ──────────────────────────────────────────────

/**
 * Extended request options passed to every service method.
 * Wraps AxiosRequestConfig with SafeFusion-specific fields.
 */
export interface RequestOptions extends AxiosRequestConfig {
  /**
   * AbortController signal for request cancellation.
   * @example
   * const controller = new AbortController();
   * service.getMany({ signal: controller.signal });
   * controller.abort(); // cancels the in-flight request
   */
  signal?: AbortSignal;
  /**
   * Per-request timeout override (ms).
   * Defaults to the global client timeout (30 000 ms).
   */
  timeout?: number;
  /**
   * When true, suppresses the automatic error toast for this request.
   * Use when the caller handles errors manually.
   * @default false
   */
  silent?: boolean;
}

// ─── Pagination ───────────────────────────────────────────────────

/** Standard pagination query parameters. */
export interface PaginationParams {
  /** 1-based page number. @default 1 */
  page?: number;
  /** Number of items per page. @default 20 */
  pageSize?: number;
  /** Field to sort by (e.g. "createdAt"). */
  sortBy?: string;
  /** Sort direction. @default 'desc' */
  sortOrder?: 'asc' | 'desc';
}

// ─── Filter / Search ──────────────────────────────────────────────

/** Generic filter parameters merged into query strings. */
export interface FilterParams {
  /** Full-text search query. */
  search?: string;
  /** Arbitrary additional filters. */
  [key: string]: unknown;
}

/** Combined query type used by list endpoints. */
export type ListParams = PaginationParams & FilterParams;

// ─── Response Shapes ──────────────────────────────────────────────

/**
 * Shape returned by the backend for every successful single-resource
 * operation (GET one, POST, PUT, PATCH).
 */
export interface ApiSuccessResponse<T> {
  data:    T;
  message: string;
  success: true;
}

/**
 * Shape returned by the backend on validation / application errors.
 */
export interface ApiErrorResponse {
  message: string;
  /** Machine-readable error code (e.g. "RESOURCE_NOT_FOUND"). */
  code:    string;
  success: false;
  /** Field-level validation errors keyed by field name. */
  details?: Record<string, string[]>;
}

/**
 * Shape returned by the backend for paginated lists.
 */
export interface ApiPaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

// ─── Internal Request Metadata ────────────────────────────────────

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Injected request ID (used for log correlation). */
    _requestId?: string;
    /** Number of automatic retries already attempted for this request. */
    _retryCount?: number;
  }

  // `InternalAxiosRequestConfig` extends `AxiosRequestConfig`, so this
  // augmentation is inherited automatically — no separate declaration needed.
}
