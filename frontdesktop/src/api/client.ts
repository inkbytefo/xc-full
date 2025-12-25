// ============================================================================
// XCORD API Client - With Auth Token Management
// ============================================================================

import type { ApiError } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

// Simple in-flight request tracking to prevent duplicate requests
const inFlightRequests = new Map<string, Promise<unknown>>();

// Rate limit state
let rateLimitedUntil = 0;

// Auth logout handler - will be set by auth store
let authLogoutHandler: (() => void) | null = null;

// Track if a refresh is currently in progress to queue concurrent 401s
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

export function setAuthLogoutHandler(handler: () => void) {
  authLogoutHandler = handler;
}

class ApiClient {
  private getRequestKey(method: string, path: string): string {
    return `${method}:${path}`;
  }

  private async request<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<T> {
    // Check if we're rate limited
    if (Date.now() < rateLimitedUntil) {
      const waitTime = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      throw new HttpError(`Rate limited. Please wait ${waitTime} seconds.`, 429);
    }

    // For GET requests, deduplicate in-flight requests (only if not a retry)
    const requestKey = this.getRequestKey(method, path);
    if (method === "GET" && !isRetry) {
      const existing = inFlightRequests.get(requestKey);
      if (existing) {
        return existing as Promise<T>;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const performRequest = async (): Promise<T> => {
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          method,
          headers,
          credentials: "include", // essential for cookies
          body: body ? JSON.stringify(body) : undefined,
        });

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok) {
          const err = json as ApiError | null;
          const message = err?.error?.message ?? `HTTP ${res.status}`;
          const code = err?.error?.code;

          // Handle rate limit
          if (res.status === 429) {
            const retryAfter = res.headers.get("Retry-After");
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
            rateLimitedUntil = Date.now() + waitMs;
            throw new HttpError("Too many requests. Please try again later.", 429, code);
          }

          // Handle unauthorized
          if (res.status === 401) {
            const isAuthEndpoint = path.includes("/auth/");

            // If we are already on an auth endpoint (like login), don't retry, just fail
            if (isAuthEndpoint) {
              throw new HttpError(message, 401, code);
            }

            // If not an auth endpoint, try to refresh
            if (!isRetry) {
              if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                  failedQueue.push({ resolve, reject });
                }).then(() => {
                  return this.request<T>(method, path, body, true);
                });
              }

              isRefreshing = true;

              try {
                const refreshed = await this.refreshToken();

                if (refreshed) {
                  processQueue(null);
                  return this.request<T>(method, path, body, true);
                } else {
                  throw new HttpError("Session expired", 401);
                }
              } catch (refreshErr) {
                processQueue(refreshErr as Error);
                if (authLogoutHandler) {
                  authLogoutHandler();
                }
                throw new HttpError("Session expired", 401);
              } finally {
                isRefreshing = false;
              }
            }

            // If we already retried and still got 401, fail
            if (authLogoutHandler) authLogoutHandler();
            throw new HttpError(message, 401, code);
          }

          // Handle forbidden
          if (res.status === 403) {
            throw new HttpError(message, 403, code);
          }

          throw new HttpError(message, res.status, code);
        }

        return json as T;
      } finally {
        // Clean up in-flight tracking
        if (method === "GET") {
          inFlightRequests.delete(requestKey);
        }
      }
    };

    const requestPromise = performRequest();

    // Track GET requests
    if (method === "GET" && !isRetry) {
      inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  }

  // Helper to refresh token
  private async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>) {
    let fullPath = path;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) searchParams.set(k, String(v));
      });
      const queryString = searchParams.toString();
      if (queryString) {
        fullPath = `${path}?${queryString}`;
      }
    }
    return this.request<T>("GET", fullPath);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export const api = new ApiClient();
