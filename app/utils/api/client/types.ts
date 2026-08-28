import type { FetchOptions } from "../types";

/** The `ApiClient.request` method, passed into the endpoint modules. */
export type RequestFn = <T = any>(
  endpoint: string,
  options?: FetchOptions
) => Promise<T>;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};
