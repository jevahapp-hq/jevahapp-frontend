export type Result<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Every MediaApi method repeated the same success/error unwrapping around
 * `apiClient`. `pick` handles the few endpoints that reach into the payload
 * (comments, bookmarks) rather than returning `data` verbatim.
 */
export function unwrap<T = any>(
  response: any,
  fallbackError: string,
  pick?: (data: any) => T
): Result<T> {
  if (response?.success) {
    return { success: true, data: pick ? pick(response.data) : response.data };
  }
  return { success: false, error: response?.error || fallbackError };
}

/** Shared query-param builder for the paginated content list endpoints. */
export function buildListParams(options?: {
  page?: number;
  limit?: number;
  contentType?: string;
  sort?: string;
  order?: "asc" | "desc";
  profile?: string;
}): Record<string, any> | undefined {
  const params: Record<string, any> = {};
  if (options?.page !== undefined) params.page = options.page;
  if (options?.limit !== undefined) {
    params.limit = Math.min(100, Math.max(1, options.limit));
  }
  if (options?.contentType && options.contentType !== "ALL") {
    params.contentType = options.contentType;
  }
  if (options?.sort) params.sort = options.sort;
  if (options?.order) params.order = options.order;
  return Object.keys(params).length > 0 ? params : undefined;
}
