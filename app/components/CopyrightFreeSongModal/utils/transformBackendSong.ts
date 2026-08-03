/**
 * Transform backend song format to frontend format (DRY → mapCopyrightFreeSong)
 */
import { mapCopyrightFreeSong } from "../../../services/copyright-free/mapCopyrightFreeSong";

export function transformBackendSong(backendSong: any): any {
  return mapCopyrightFreeSong(backendSong);
}
