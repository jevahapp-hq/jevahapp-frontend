import type { ContentInteractionClient } from "./client";

type MentionCandidate = {
  userId: string;
  displayName: string;
  avatar?: string;
};

function firstArray(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  for (const key of ["data", "users", "results"]) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
}

/** GET /api/users/search?q=&limit= — mention directory (optional enrichment). */
export async function searchUsersForMentions(
  ctx: ContentInteractionClient,
  q: string,
  limit: number = 10
): Promise<MentionCandidate[]> {
  const query = String(q || "").trim();
  if (query.length < 2) return [];

  try {
    const headers = await ctx.getAuthHeaders();
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(20, Math.max(1, limit))),
    });
    const response = await fetch(
      `${ctx.baseURL}/api/users/search?${params.toString()}`,
      { headers }
    );
    if (!response.ok) return [];

    return firstArray(await response.json())
      .map((u: any): MentionCandidate => {
        const full = `${String(u?.firstName || "").trim()} ${String(
          u?.lastName || ""
        ).trim()}`.trim();
        return {
          userId: String(u?._id || u?.id || u?.userId || ""),
          displayName: full || u?.username || u?.displayName || u?.name || "",
          avatar: u?.avatar || u?.avatarUrl || undefined,
        };
      })
      .filter((u) => !!u.userId && !!u.displayName);
  } catch {
    return [];
  }
}
