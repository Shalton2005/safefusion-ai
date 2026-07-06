/**
 * API layer barrel
 *
 * Import from here to access the HTTP client, error class, and types:
 *
 *   import { apiClient, ApiError }    from '@/api';
 *   import type { RequestOptions }    from '@/api';
 */

export { default as apiClient, createRequestController } from './client';
export { ApiError }                                      from './errors';

export type {
  RequestOptions,
  PaginationParams,
  FilterParams,
  ListParams,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
} from './types';
