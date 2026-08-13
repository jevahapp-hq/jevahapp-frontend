/**
 * Studio helpers for artist releases — wraps CreatorsApi + normalizers.
 */
import { creatorsApi } from "./CreatorsApi";
import {
  normalizeArtistRelease,
  type ArtistRelease,
  type CreateReleaseBody,
  type PatchReleaseBody,
  type PublishReleaseBody,
} from "./releaseTypes";

function unwrap(payload: any): any {
  return payload?.data?.data ?? payload?.data ?? payload;
}

export async function createArtistRelease(
  body: CreateReleaseBody
): Promise<ArtistRelease> {
  const res = await creatorsApi.createRelease(body as any);
  if (!res.success) {
    throw new Error(res.error || res.message || "Failed to create release");
  }
  const release = normalizeArtistRelease(unwrap(res));
  if (!release) throw new Error("Invalid create release response");
  return release;
}

export async function listArtistReleases(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ releases: ArtistRelease[]; total?: number }> {
  const res = await creatorsApi.listMyReleases(params);
  if (!res.success) return { releases: [] };
  const payload = unwrap(res);
  const list =
    payload?.releases ||
    payload?.items ||
    (Array.isArray(payload) ? payload : []);
  const releases = (list as any[])
    .map(normalizeArtistRelease)
    .filter((r): r is ArtistRelease => !!r);
  return { releases, total: payload?.total };
}

export async function getArtistRelease(
  releaseId: string
): Promise<ArtistRelease | null> {
  const res = await creatorsApi.getMyRelease(releaseId);
  if (!res.success) return null;
  return normalizeArtistRelease(unwrap(res));
}

export async function patchArtistRelease(
  releaseId: string,
  body: PatchReleaseBody
): Promise<ArtistRelease | null> {
  const res = await creatorsApi.patchRelease(releaseId, body as any);
  if (!res.success) {
    throw new Error(res.error || res.message || "Failed to update release");
  }
  return normalizeArtistRelease(unwrap(res));
}

export async function deleteArtistRelease(releaseId: string): Promise<void> {
  const res = await creatorsApi.deleteRelease(releaseId);
  if (!res.success) {
    throw new Error(res.error || res.message || "Failed to delete release");
  }
}

export async function reorderArtistReleaseTracks(
  releaseId: string,
  orderedTrackIds: string[]
): Promise<ArtistRelease | null> {
  const res = await creatorsApi.reorderReleaseTracks(
    releaseId,
    orderedTrackIds
  );
  if (!res.success) {
    throw new Error(res.error || res.message || "Failed to reorder tracks");
  }
  return normalizeArtistRelease(unwrap(res));
}

export async function unlinkArtistReleaseTrack(
  releaseId: string,
  trackId: string
): Promise<void> {
  const res = await creatorsApi.unlinkReleaseTrack(releaseId, trackId);
  if (!res.success) {
    const status = (res as any).status || (res as any).statusCode;
    if (status === 404 || String(res.error || "").includes("404")) {
      throw new Error(
        "Unlink not available yet — backend needs DELETE /releases/:id/tracks/:trackId"
      );
    }
    throw new Error(res.error || res.message || "Failed to remove track");
  }
}

export type PublishReleaseResult = {
  release: ArtistRelease;
  code?: string;
  raw?: any;
};

export async function publishArtistRelease(
  releaseId: string,
  body?: PublishReleaseBody
): Promise<PublishReleaseResult> {
  const res = await creatorsApi.publishRelease(releaseId, body);
  if (!res.success) {
    const code = (res as any).code || unwrap(res)?.code;
    const err = new Error(
      res.error || res.message || "Failed to publish release"
    ) as Error & { code?: string; data?: any };
    err.code = code;
    err.data = unwrap(res) || (res as any).data;
    throw err;
  }
  const release = normalizeArtistRelease(unwrap(res));
  if (!release) throw new Error("Publish succeeded but release payload missing");
  return { release, raw: unwrap(res) };
}
