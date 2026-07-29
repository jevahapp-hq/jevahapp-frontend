/**
 * Thin scroll bridge — focus decisions live in useFeedFocusLoop.
 */
import { useCallback, useRef } from "react";
import type { View } from "react-native";
import type { FeedFocusMediaType } from "./useFeedFocusLoop";

export function useAllContentTikTokScroll(options: {
  onScrollForFocus: () => void;
  registerFocusTarget: (
    key: string,
    type: FeedFocusMediaType,
    ref: { current: View | null } | null
  ) => void;
  evaluateFocus: () => void;
}) {
  const { onScrollForFocus, registerFocusTarget, evaluateFocus } = options;
  const lastScrollUpdate = useRef(0);
  const bindCacheRef = useRef(
    new Map<string, (node: View | null) => void>()
  );

  const handleScroll = useCallback(
    (_event: any) => {
      const now = Date.now();
      if (now - lastScrollUpdate.current < 48) return;
      lastScrollUpdate.current = now;
      onScrollForFocus();
    },
    [onScrollForFocus]
  );

  const handleScrollEnd = useCallback(() => {
    evaluateFocus();
  }, [evaluateFocus]);

  /** Stable ref callbacks per key so cards don't thrash registration */
  const bindFocusRef = useCallback(
    (key: string, type: FeedFocusMediaType) => {
      const cacheKey = `${type}:${key}`;
      let fn = bindCacheRef.current.get(cacheKey);
      if (!fn) {
        fn = (node: View | null) => {
          registerFocusTarget(key, type, node ? { current: node } : null);
        };
        bindCacheRef.current.set(cacheKey, fn);
      }
      return fn;
    },
    [registerFocusTarget]
  );

  return {
    handleScroll,
    handleScrollEnd,
    bindFocusRef,
  };
}
