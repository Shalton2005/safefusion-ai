/**
 * ApiError
 *
 * Typed error class that normalises every possible Axios failure
 * (network error, timeout, HTTP 4xx/5xx, cancellation) into a
 * single consistent shape.
 *
 * All service methods reject with `ApiError`, never with a raw
 * AxiosError — so callers only need to handle one error type.
 *
 * @example
 * try {
 *   await alertsService.getAlerts();
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     if (err.isValidationError) showFieldErrors(err.details);
 *     else toast.error(err.toUserMessage());
 *   }
 * }
 */

import { isAxiosError } from 'axios';

// ─── Constructor Payload ──────────────────────────────────────────

interface ApiErrorInit {
  message:       string;
  code:          string;
  statusCode:    number;
  details?:      Record<string, string[]>;
  requestId?:    string;
  isNetwork?:    boolean;
  isTimeout?:    boolean;
  isCancelled?:  boolean;
}

// ─── Class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  /** HTTP status code (0 for network / timeout errors). */
  readonly statusCode:  number;
  /** Machine-readable error code from the backend or the client. */
  readonly code:        string;
  /** Field-level validation errors (present on 422 responses). */
  readonly details:     Record<string, string[]> | undefined;
  /** Correlates the error with a specific outbound request in logs. */
  readonly requestId:   string | undefined;
  /** True when the request never reached the server. */
  readonly isNetworkError:   boolean;
  /** True when the request exceeded the configured timeout. */
  readonly isTimeoutError:   boolean;
  /** True when the request was deliberately cancelled via AbortController. */
  readonly isCancelledError: boolean;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name        = 'ApiError';
    this.statusCode  = init.statusCode;
    this.code        = init.code;
    this.details     = init.details;
    this.requestId   = init.requestId;
    this.isNetworkError   = init.isNetwork   ?? false;
    this.isTimeoutError   = init.isTimeout   ?? false;
    this.isCancelledError = init.isCancelled ?? false;

    // Maintain proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // ── Semantic Predicates ─────────────────────────────────────────

  /** 4xx — the request was understood but rejected by the server. */
  get isClientError(): boolean { return this.statusCode >= 400 && this.statusCode < 500; }

  /** 5xx — the server encountered an unexpected condition. */
  get isServerError(): boolean { return this.statusCode >= 500; }

  /** 401 — session missing or expired. */
  get isAuthError(): boolean { return this.statusCode === 401; }

  /** 403 — authenticated but not authorised. */
  get isForbiddenError(): boolean { return this.statusCode === 403; }

  /** 404 — resource does not exist. */
  get isNotFoundError(): boolean { return this.statusCode === 404; }

  /** 409 — resource state conflict (e.g. duplicate entry). */
  get isConflictError(): boolean { return this.statusCode === 409; }

  /** 422 — request understood but semantically invalid; `details` contains field errors. */
  get isValidationError(): boolean { return this.statusCode === 422; }

  /** 429 — client has exceeded the server's rate limit. */
  get isRateLimitError(): boolean { return this.statusCode === 429; }

  // ── UI-Safe Message ─────────────────────────────────────────────

  /**
   * Returns a user-friendly, non-technical message safe to display
   * in toasts, banners, and empty states.
   */
  toUserMessage(): string {
    if (this.isCancelledError) return 'Request was cancelled.';
    if (this.isNetworkError)   return 'Connection error. Check your network and try again.';
    if (this.isTimeoutError)   return 'The request timed out. Please try again.';
    if (this.isAuthError)      return 'Your session has expired. Please sign in again.';
    if (this.isForbiddenError) return 'You do not have permission to perform this action.';
    if (this.isNotFoundError)  return 'The requested resource was not found.';
    if (this.isRateLimitError) return 'Too many requests. Please wait a moment and try again.';
    if (this.isServerError)    return 'A server error occurred. Our team has been notified.';
    return this.message;
  }

  // ── Static Factory ──────────────────────────────────────────────

  /**
   * Converts any thrown value (AxiosError, Error, unknown) to an ApiError.
   * This is the single place where Axios internals are translated.
   */
  static from(error: unknown): ApiError {
    // Already normalised
    if (error instanceof ApiError) return error;

    if (!isAxiosError(error)) {
      return new ApiError({
        message:    error instanceof Error ? error.message : 'An unexpected error occurred.',
        code:       'UNKNOWN_ERROR',
        statusCode: 0,
      });
    }

    // Cancelled by AbortController / CancelToken
    if (error.code === 'ERR_CANCELED') {
      return new ApiError({
        message:     'Request cancelled.',
        code:        'CANCELLED',
        statusCode:  0,
        isCancelled: true,
      });
    }

    // Timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({
        message:    'Request timed out. Please try again.',
        code:       'TIMEOUT',
        statusCode: 408,
        isTimeout:  true,
      });
    }

    // No response — network error
    if (!error.response) {
      return new ApiError({
        message:   'Unable to reach the server. Check your network connection.',
        code:      'NETWORK_ERROR',
        statusCode: 0,
        isNetwork: true,
      });
    }

    // Server returned a response
    const { response, config } = error;
    const body = response.data as Record<string, unknown> | null | undefined;

    return new ApiError({
      message:    (body?.message as string | undefined) ?? error.message ?? 'An unexpected error occurred.',
      code:       (body?.code    as string | undefined) ?? `HTTP_${response.status}`,
      statusCode: response.status,
      details:    body?.details as Record<string, string[]> | undefined,
      requestId:  config?._requestId,
    });
  }
}
