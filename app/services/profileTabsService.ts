import { apiAxios } from "../utils/api";

export type ProfileTabKey = "photos" | "posts" | "videos" | "audios";

export interface ProfileTabDescriptor {
  key: ProfileTabKey;
  label: string;
  count: number;
}

export interface ProfileTabsResponse {
  success: boolean;
  user: { id: string; displayName?: string; avatarUrl?: string };
  tabs: ProfileTabDescriptor[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

async function get<T>(url: string, params?: Record<string, any>) {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params).reduce((a, [k, v]) => {
          if (v !== undefined && v !== null) a[k] = String(v);
          return a;
        }, {} as Record<string, string>)
      ).toString()
    : "";
  const res = await apiAxios
    .get(url + qs)
    .catch((e) => ({ data: { success: false, error: String(e) } } as any));
  return (res as any).data;
}

export const profileTabsService = {
  async fetchTabs(userId?: string): Promise<ProfileTabsResponse> {
    return await get<ProfileTabsResponse>("/api/user/tabs", { userId });
  },
  async fetchTabItems<T = any>(
    key: ProfileTabKey,
    opts: {
      userId?: string;
      page?: number;
      limit?: number;
      sort?: "recent" | "popular";
    } = {}
  ): Promise<PaginatedResponse<T>> {
    const { userId, page = 1, limit = 20, sort = "recent" } = opts;
    return await get<PaginatedResponse<T>>(`/api/user/${key}`, {
      userId,
      page,
      limit,
      sort,
    });
  },
  async fetchItem<T = any>(
    id: string
  ): Promise<{ success: boolean; item?: T }> {
    return await get<{ success: boolean; item?: T }>(`/api/user/content/${id}`);
  },
};

export default profileTabsService;
