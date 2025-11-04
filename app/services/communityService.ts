import { apiAxios } from "../utils/api";

export type CommunityModuleKey =
  | "prayer_wall"
  | "forum"
  | "polls"
  | "groups";

export interface CommunityModuleDescriptor {
  id: string;
  key: CommunityModuleKey;
  title: string;
  color?: string;
  order?: number;
  visible?: boolean;
  route?: string; // optional explicit route override from backend
}

export interface CommunityModulesResponse {
  success: boolean;
  modules: CommunityModuleDescriptor[];
}

async function get<T>(url: string, params?: Record<string, any>) {
  const qs = params
    ? "?" + new URLSearchParams(params as any).toString()
    : "";
  const res = await apiAxios
    .get(url + qs)
    .catch((e) => ({ data: { success: false, error: String(e) } } as any));
  return (res as any).data as T;
}

export const communityService = {
  async fetchModules(): Promise<CommunityModulesResponse> {
    return await get<CommunityModulesResponse>("/api/community/modules");
  },
};

export default communityService;



