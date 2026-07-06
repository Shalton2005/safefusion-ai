/**
 * Base Service Factory
 *
 * `createService(basePath)` returns a typed CRUD helper object for
 * a given REST resource.  All service modules compose from this
 * instead of importing apiClient directly.
 *
 * Benefits
 * ────────
 *  • Single place to change HTTP verb semantics
 *  • Consistent generic typing across all resources
 *  • `RequestOptions` (signal, timeout, silent) propagated to every method
 *
 * @example
 * // src/services/devices.service.ts
 * import { createService } from './base.service';
 * import type { Device } from '@/types';
 *
 * const base = createService('/devices');
 *
 * export const devicesService = {
 *   ...base,
 *   // extend with resource-specific actions:
 *   reboot: (id: string) => base.action<void>(`/${id}/reboot`, 'POST'),
 * };
 */

import type { AxiosResponse } from 'axios';
import apiClient from '@/api/client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { RequestOptions, ListParams } from '@/api/types';

// ─── Service instance type ────────────────────────────────────────

export interface BaseService<T> {
  /**
   * GET /{basePath}/{id}
   * Fetch a single resource by primary key.
   */
  getOne(
    id:       string | number,
    options?: RequestOptions,
  ): Promise<AxiosResponse<ApiResponse<T>>>;

  /**
   * GET /{basePath}
   * Fetch a paginated list with optional filter / sort params.
   */
  getMany(
    params?:  ListParams,
    options?: RequestOptions,
  ): Promise<AxiosResponse<PaginatedResponse<T>>>;

  /**
   * POST /{basePath}
   * Create a new resource.
   */
  create<D = Partial<T>>(
    data:     D,
    options?: RequestOptions,
  ): Promise<AxiosResponse<ApiResponse<T>>>;

  /**
   * PUT /{basePath}/{id}
   * Replace a resource (full update).
   */
  update<D = Partial<T>>(
    id:       string | number,
    data:     D,
    options?: RequestOptions,
  ): Promise<AxiosResponse<ApiResponse<T>>>;

  /**
   * PATCH /{basePath}/{id}
   * Partially update a resource.
   */
  patch<D = Partial<T>>(
    id:       string | number,
    data:     D,
    options?: RequestOptions,
  ): Promise<AxiosResponse<ApiResponse<T>>>;

  /**
   * DELETE /{basePath}/{id}
   */
  remove(
    id:       string | number,
    options?: RequestOptions,
  ): Promise<AxiosResponse<ApiResponse<void>>>;

  /**
   * Escape hatch: fire any GET request under the basePath.
   * Use for sub-resource fetches (e.g. `/devices/{id}/metrics`).
   */
  get<R = ApiResponse<T>>(
    subPath:  string,
    params?:  Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<AxiosResponse<R>>;

  /**
   * Escape hatch: fire any POST request under the basePath.
   * Use for action endpoints (e.g. `/alerts/{id}/acknowledge`).
   */
  post<R = ApiResponse<T>, D = unknown>(
    subPath:  string,
    data?:    D,
    options?: RequestOptions,
  ): Promise<AxiosResponse<R>>;
}

// ─── Factory ──────────────────────────────────────────────────────

/**
 * Returns a `BaseService<T>` bound to the given REST base path.
 *
 * @param basePath — The resource root path without a trailing slash,
 *                   e.g. `'/alerts'`, `'/devices'`, `'/reports'`.
 */
export function createService<T>(basePath: string): BaseService<T> {
  /** Prefixes subPath with basePath, normalising slashes. */
  const url = (subPath = ''): string =>
    subPath ? `${basePath}/${subPath.replace(/^\//, '')}` : basePath;

  return {
    getOne: (id, options) =>
      apiClient.get<ApiResponse<T>>(url(String(id)), options),

    getMany: (params, options) =>
      apiClient.get<PaginatedResponse<T>>(basePath, { ...options, params }),

    create: (data, options) =>
      apiClient.post<ApiResponse<T>>(basePath, data, options),

    update: (id, data, options) =>
      apiClient.put<ApiResponse<T>>(url(String(id)), data, options),

    patch: (id, data, options) =>
      apiClient.patch<ApiResponse<T>>(url(String(id)), data, options),

    remove: (id, options) =>
      apiClient.delete<ApiResponse<void>>(url(String(id)), options),

    get: (subPath, params, options) =>
      apiClient.get(url(subPath), { ...options, params }),

    post: (subPath, data, options) =>
      apiClient.post(url(subPath), data, options),
  };
}
