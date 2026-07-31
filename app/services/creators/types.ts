/**
 * Creator (artist / minister / podcaster) session types — Spotify-for-Gospel.
 * Driven by backend capabilities / nextStep (do not scatter status if/else).
 */

export type CreatorType = "artist" | "minister" | "podcaster";

export type CreatorNextStep =
  | "apply"
  | "wait_review"
  | "upload_first_track"
  | "manage_catalog"
  | "contact_support";

export type CreatorStatus = "pending" | "active" | "suspended" | null;

export type ArtistCard = {
  id?: string;
  _id?: string;
  displayName?: string;
  slug?: string;
  bio?: string;
  avatarUrl?: string;
  genres?: string[];
  creatorTypes?: CreatorType[];
  isVerified?: boolean;
  status?: CreatorStatus;
  socials?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
  };
};

export type CreatorCapabilities = {
  canApply: boolean;
  canEditProfile: boolean;
  canUploadTracks: boolean;
  canPublishTracks: boolean;
  showPendingBanner: boolean;
  showCreatorHub: boolean;
  showPublicProfile: boolean;
  publicProfilePath: string | null;
  nextStep: CreatorNextStep;
  statusMessage: string;
};

export type CreatorMe = {
  artist: ArtistCard | null;
  capabilities: CreatorCapabilities;
  status: CreatorStatus;
  canUpload: boolean;
  nextStep: CreatorNextStep | string;
};

export type CreatorApplyBody = {
  displayName: string;
  bio?: string;
  genres?: string[];
  creatorTypes: CreatorType[];
  socials?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
  };
  applicationNote?: string;
  avatarUrl?: string;
};

/** PATCH /api/creators/me — public profile edit */
export type CreatorProfileUpdateBody = {
  displayName?: string;
  bio?: string;
  genres?: string[];
  avatarUrl?: string;
  socials?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
  };
};

/** Safe defaults when `/me` is missing (404) or offline — show Apply CTA. */
export function emptyCreatorMe(): CreatorMe {
  return {
    artist: null,
    capabilities: {
      canApply: true,
      canEditProfile: false,
      canUploadTracks: false,
      canPublishTracks: false,
      showPendingBanner: false,
      showCreatorHub: false,
      showPublicProfile: false,
      publicProfilePath: null,
      nextStep: "apply",
      statusMessage: "Share your music on Jevah as an artist, minister, or podcaster.",
    },
    status: null,
    canUpload: false,
    nextStep: "apply",
  };
}

export function normalizeCreatorMe(raw: any): CreatorMe {
  const caps = raw?.capabilities || {};
  const nextStep = (caps.nextStep || raw?.nextStep || "apply") as CreatorNextStep;
  return {
    artist: raw?.artist ?? null,
    capabilities: {
      canApply: Boolean(caps.canApply ?? nextStep === "apply"),
      canEditProfile: Boolean(caps.canEditProfile),
      canUploadTracks: Boolean(caps.canUploadTracks ?? raw?.canUpload),
      canPublishTracks: Boolean(caps.canPublishTracks),
      showPendingBanner: Boolean(caps.showPendingBanner ?? nextStep === "wait_review"),
      showCreatorHub: Boolean(caps.showCreatorHub ?? nextStep !== "apply"),
      showPublicProfile: Boolean(caps.showPublicProfile),
      publicProfilePath: caps.publicProfilePath ?? null,
      nextStep,
      statusMessage:
        caps.statusMessage ||
        (nextStep === "wait_review"
          ? "Your application is under review."
          : nextStep === "contact_support"
            ? "Your creator account needs attention. Contact support."
            : "Share your music on Jevah."),
    },
    status: (raw?.status ?? raw?.artist?.status ?? null) as CreatorStatus,
    canUpload: Boolean(raw?.canUpload ?? caps.canUploadTracks),
    nextStep,
  };
}
