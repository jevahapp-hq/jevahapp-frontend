/**
 * useAllContentTikTokSocket — thin feed wrapper over shared engagement socket.
 */
import {
  useEngagementSocket,
  type UseEngagementSocketOptions,
} from "../../../../../app/hooks/useEngagementSocket";

export type UseAllContentTikTokSocketOptions = UseEngagementSocketOptions;

export function useAllContentTikTokSocket(
  options: UseAllContentTikTokSocketOptions = {}
) {
  useEngagementSocket(options);
}
