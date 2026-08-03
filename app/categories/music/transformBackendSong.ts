import type { CopyrightFreeSongResponse } from "../../services/copyrightFreeMusicAPI";
import { mapCopyrightFreeSong } from "../../services/copyright-free/mapCopyrightFreeSong";

/** Transform backend copyright-free song format to UI song shape. */
export function transformBackendSong(backendSong: CopyrightFreeSongResponse): any {
  return mapCopyrightFreeSong(backendSong);
}
