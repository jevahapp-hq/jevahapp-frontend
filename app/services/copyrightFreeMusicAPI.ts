/**
 * Copyright-free music API - re-exports from modular service
 * @see app/services/copyright-free/CopyrightFreeMusicService.ts
 * @see app/services/copyright-free/types.ts
 */
export { default } from "./copyright-free/CopyrightFreeMusicService";
export type {
  CopyrightFreeSongResponse,
  CopyrightFreeSongsResponse,
  CopyrightFreeSongCategoriesResponse,
} from "./copyright-free/types";
