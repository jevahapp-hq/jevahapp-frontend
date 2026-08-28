// Shared request boilerplate for the community domain APIs
// (forum / prayer / polls / groups).
import { Platform } from "react-native";
import type { CommunityAPIClient } from "./client";
import type { ApiResponse } from "./types";

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "expo-platform": Platform.OS,
};

export function validationError(error: string): ApiResponse<any> {
  return { success: false, error, code: "VALIDATION_ERROR" };
}

export function networkError(
  error: unknown,
  fallback: string
): ApiResponse<any> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
    code: "NETWORK_ERROR",
  };
}

/**
 * Auth headers for a public endpoint: send the token when we have one, but
 * fall back to anonymous JSON headers instead of failing the request.
 */
export async function optionalAuthHeaders(
  ctx: CommunityAPIClient
): Promise<HeadersInit> {
  try {
    return await ctx.getAuthHeaders();
  } catch {
    return { ...JSON_HEADERS };
  }
}

/** Build a query string, skipping undefined/empty values. */
export function toQuery(
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    query.append(key, String(value));
  }
  return query.toString();
}

/**
 * Backends inconsistently return the entity bare or nested under `data`.
 */
export function unwrapEntity<T>(result: ApiResponse<any>): ApiResponse<T> {
  if (result.success && result.data) {
    return { success: true, data: ((result.data as any).data || result.data) as T };
  }
  return result as ApiResponse<T>;
}

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

/**
 * Unwrap a paginated list that may arrive as `{ items, pagination }` or
 * `{ data: { items, pagination } }`, synthesising pagination when absent.
 */
export function unwrapList<K extends string, T>(
  result: ApiResponse<any>,
  key: K,
  params?: { page?: number; limit?: number }
): ApiResponse<{ [P in K]: T[] } & { pagination: any }> {
  if (result.success && result.data) {
    const data = result.data as any;
    const items: T[] = data[key] || data.data?.[key] || [];
    const pagination =
      data.pagination ||
      data.data?.pagination || {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: items.length,
        totalPages: 1,
        hasMore: false,
      };
    return { success: true, data: { [key]: items, pagination } as any };
  }
  return result as any;
}
