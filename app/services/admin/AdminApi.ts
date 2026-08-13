/**
 * Ops admin API — releases + media report moderation.
 * Requires admin JWT / role on backend.
 */
import { BaseApiClient } from "../../../src/core/api/BaseApiClient";
import {
  normalizeArtistRelease,
  type ArtistRelease,
} from "../creators/releaseTypes";

function unwrap(payload: any): any {
  return payload?.data?.data ?? payload?.data ?? payload;
}

export type AdminReportStatus =
  | "pending"
  | "reviewed"
  | "resolved"
  | "dismissed"
  | string;

export type AdminReportMedia = {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  contentType?: string;
  fileUrl?: string;
  pdfUrl?: string;
  thumbnailUrl?: string;
  coverImageUrl?: string;
  imageUrl?: string;
  speaker?: string;
  moderationStatus?: string;
  uploadedBy?:
    | string
    | {
        _id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
      };
};

export type AdminReport = {
  id: string;
  mediaId: string;
  reason: string;
  description?: string;
  status: AdminReportStatus;
  createdAt?: string;
  updatedAt?: string;
  resolutionNotes?: string;
  reporterEmail?: string;
  uploaderEmail?: string;
  media?: AdminReportMedia | null;
  siblingReports?: AdminReport[];
  mediaTitle?: string;
};

function pickEmail(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string" && v.includes("@")) return v;
  return (
    v.email ||
    v.userEmail ||
    v.reporterEmail ||
    v.uploaderEmail ||
    undefined
  );
}

function normalizeReport(raw: any): AdminReport | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw._id || raw.id || "").trim();
  if (!id) return null;

  const media =
    raw.media ||
    raw.content ||
    raw.targetMedia ||
    raw.reportedMedia ||
    null;

  const mediaId = String(
    raw.mediaId ||
      raw.contentId ||
      media?._id ||
      media?.id ||
      ""
  ).trim();

  const siblingsRaw =
    raw.siblingReports ||
    raw.siblings ||
    raw.otherReports ||
    [];

  return {
    id,
    mediaId,
    reason: String(raw.reason || raw.category || "other"),
    description: raw.description || raw.details || raw.note || "",
    status: String(raw.status || "pending").toLowerCase(),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    resolutionNotes:
      raw.resolutionNotes || raw.adminNotes || raw.reviewNotes || "",
    reporterEmail:
      pickEmail(raw.reporter) ||
      pickEmail(raw.reportedBy) ||
      pickEmail(raw.user) ||
      raw.reporterEmail,
    uploaderEmail:
      pickEmail(raw.uploader) ||
      pickEmail(media?.uploadedBy) ||
      pickEmail(raw.mediaOwner) ||
      raw.uploaderEmail,
    media: media
      ? {
          _id: media._id || media.id,
          id: media.id || media._id,
          title: media.title,
          description: media.description,
          contentType: media.contentType,
          fileUrl: media.fileUrl || media.pdfUrl || media.url,
          pdfUrl: media.pdfUrl || media.fileUrl,
          thumbnailUrl:
            media.thumbnailUrl || media.coverImageUrl || media.imageUrl,
          coverImageUrl: media.coverImageUrl,
          imageUrl: media.imageUrl,
          speaker: media.speaker,
          moderationStatus: media.moderationStatus,
          uploadedBy: media.uploadedBy,
        }
      : null,
    siblingReports: Array.isArray(siblingsRaw)
      ? siblingsRaw
          .map(normalizeReport)
          .filter((r): r is AdminReport => !!r && r.id !== id)
      : [],
    mediaTitle:
      raw.mediaTitle ||
      media?.title ||
      raw.title ||
      undefined,
  };
}

class AdminApiClient extends BaseApiClient {
  async listReleases(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    releases: ArtistRelease[];
    total?: number;
  }> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? 30));
    const qs = q.toString() ? `?${q.toString()}` : "";

    const res = await this.request<any>(`/api/admin/releases${qs}`, {
      method: "GET",
      requireAuth: true,
    });

    if (!res.success) {
      throw new Error(res.error || res.message || "Failed to load admin releases");
    }

    const payload = unwrap(res);
    const list =
      payload?.releases ||
      payload?.items ||
      (Array.isArray(payload) ? payload : []);

    const releases = (list as any[])
      .map((row) => {
        const base = normalizeArtistRelease(row);
        if (!base) return null;
        return {
          ...base,
          artistName:
            base.artistName ||
            row.artistDisplayName ||
            row.creatorName ||
            undefined,
          artistSlug: base.artistSlug || row.artistSlug || undefined,
        } as ArtistRelease & { creatorId?: string };
      })
      .filter(Boolean) as ArtistRelease[];

    return { releases, total: payload?.total };
  }

  async listReports(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ reports: AdminReport[]; total?: number }> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit ?? 40));
    const qs = q.toString() ? `?${q.toString()}` : "";

    const res = await this.request<any>(`/api/admin/reports${qs}`, {
      method: "GET",
      requireAuth: true,
    });

    if (!res.success) {
      throw new Error(res.error || res.message || "Failed to load reports");
    }

    const payload = unwrap(res);
    const list =
      payload?.reports ||
      payload?.items ||
      payload?.data ||
      (Array.isArray(payload) ? payload : []);

    const reports = (list as any[])
      .map(normalizeReport)
      .filter((r): r is AdminReport => !!r);

    return { reports, total: payload?.total ?? reports.length };
  }

  async getReport(reportId: string): Promise<AdminReport> {
    const res = await this.request<any>(
      `/api/admin/reports/${encodeURIComponent(reportId)}`,
      { method: "GET", requireAuth: true }
    );

    if (!res.success) {
      throw new Error(res.error || res.message || "Failed to load report");
    }

    const payload = unwrap(res);
    const raw = payload?.report || payload;
    const report = normalizeReport(raw);
    if (!report) throw new Error("Invalid report payload");
    return report;
  }

  /**
   * Mark report reviewed / resolved with optional notes.
   * Tries PATCH then POST …/resolve for backend compatibility.
   */
  async updateReportStatus(
    reportId: string,
    body: {
      status: AdminReportStatus;
      resolutionNotes?: string;
      notes?: string;
    }
  ): Promise<AdminReport> {
    const notes = body.resolutionNotes || body.notes || "";
    const payload = {
      status: body.status,
      resolutionNotes: notes,
      notes,
      adminNotes: notes,
    };

    let res = await this.request<any>(
      `/api/admin/reports/${encodeURIComponent(reportId)}`,
      {
        method: "PATCH",
        requireAuth: true,
        body: payload,
      }
    );

    if (!res.success) {
      res = await this.request<any>(
        `/api/admin/reports/${encodeURIComponent(reportId)}/resolve`,
        {
          method: "POST",
          requireAuth: true,
          body: payload,
        }
      );
    }

    if (!res.success) {
      throw new Error(res.error || res.message || "Failed to update report");
    }

    const data = unwrap(res);
    const report = normalizeReport(data?.report || data);
    if (report) return report;

    return {
      id: reportId,
      mediaId: "",
      reason: "",
      status: body.status,
      resolutionNotes: notes,
    };
  }
}

export const adminApi = new AdminApiClient();
export default adminApi;

/** True when reported media is an ebook / PDF book. */
export function isAdminReportEbook(media?: AdminReportMedia | null): boolean {
  if (!media) return false;
  const ct = String(media.contentType || "").toLowerCase().trim();
  if (
    ct === "ebook" ||
    ct === "ebooks" ||
    ct === "e-books" ||
    ct === "books" ||
    ct === "book" ||
    ct === "pdf"
  ) {
    return true;
  }
  const url = String(media.fileUrl || media.pdfUrl || "").toLowerCase();
  return (
    url.includes(".pdf") ||
    url.includes("application/pdf") ||
    url.includes("/ebook") ||
    url.includes("/books/")
  );
}

export function getAdminReportPdfUrl(
  media?: AdminReportMedia | null
): string | null {
  if (!media) return null;
  const raw = media.pdfUrl || media.fileUrl || "";
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!url) return null;
  if (!/^(https?|file):\/\//i.test(url)) return null;
  return url;
}
