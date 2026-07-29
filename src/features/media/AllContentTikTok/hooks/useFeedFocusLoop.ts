/**
 * TikTok-standard feed focus: the media whose frame is closest to the
 * list viewport center (and sufficiently visible) is the only focused item.
 *
 * Uses measureInWindow so ListHeader cards and FlashList rows share one space —
 * parent-relative onLayout.y was causing the item *beneath* to win.
 */
import { useCallback, useEffect, useRef } from "react";
import type { View } from "react-native";

export type FeedFocusMediaType = "video" | "music";

type RegisteredTarget = {
  key: string;
  type: FeedFocusMediaType;
  ref: { current: View | null };
};

const SWITCH_MS = 120;
const MIN_VISIBLE_RATIO = 0.45;
const HOLD_VISIBLE_RATIO = 0.28;
const SCORE_MARGIN = 0.08;

function intersectRatio(
  itemTop: number,
  itemBottom: number,
  viewTop: number,
  viewBottom: number
): number {
  const top = Math.max(itemTop, viewTop);
  const bottom = Math.min(itemBottom, viewBottom);
  const visible = Math.max(0, bottom - top);
  const height = Math.max(1, itemBottom - itemTop);
  return visible / height;
}

export function useFeedFocusLoop(options: {
  enabled: boolean;
  focusedKey: string | null;
  setFocusedKey: (key: string | null) => void;
  /** Prefer video over music when scores are close */
  preferVideo?: boolean;
}) {
  const { enabled, focusedKey, setFocusedKey, preferVideo = true } = options;
  const targetsRef = useRef<Map<string, RegisteredTarget>>(new Map());
  const listHostRef = useRef<View | null>(null);
  const lastSwitchRef = useRef(0);
  const focusedKeyRef = useRef(focusedKey);
  focusedKeyRef.current = focusedKey;
  const evaluatingRef = useRef(false);
  const evaluateFocusRef = useRef<() => void>(() => {});

  const registerFocusTarget = useCallback(
    (
      key: string,
      type: FeedFocusMediaType,
      ref: { current: View | null } | null
    ) => {
      if (!key) return;
      if (!ref) {
        targetsRef.current.delete(key);
        return;
      }
      targetsRef.current.set(key, { key, type, ref });
      setTimeout(() => evaluateFocusRef.current(), 32);
    },
    []
  );

  const setListHostRef = useCallback((node: View | null) => {
    listHostRef.current = node;
  }, []);

  const evaluateFocus = useCallback(() => {
    if (!enabled) return;
    if (evaluatingRef.current) return;
    const host = listHostRef.current;
    if (!host || typeof (host as any).measureInWindow !== "function") return;

    evaluatingRef.current = true;
    (host as any).measureInWindow(
      (hx: number, hy: number, _hw: number, hh: number) => {
        const viewTop = hy;
        const viewBottom = hy + hh;
        const centerY = hy + hh / 2;
        const entries = Array.from(targetsRef.current.values());
        if (entries.length === 0) {
          evaluatingRef.current = false;
          return;
        }

        type Score = {
          key: string;
          type: FeedFocusMediaType;
          ratio: number;
          score: number;
        };
        const scores: Score[] = [];
        let pending = entries.length;

        const finish = () => {
          evaluatingRef.current = false;
          if (scores.length === 0) return;

          scores.sort((a, b) => {
            if (Math.abs(b.score - a.score) > 0.001) return b.score - a.score;
            if (preferVideo && a.type !== b.type) {
              return a.type === "video" ? -1 : 1;
            }
            return 0;
          });

          const best = scores[0];
          const current = focusedKeyRef.current;
          const currentScore = scores.find((s) => s.key === current);

          // Stickiness: don't flicker away unless challenger clearly wins
          if (
            current &&
            currentScore &&
            currentScore.ratio >= HOLD_VISIBLE_RATIO &&
            best.key !== current &&
            best.score < currentScore.score + SCORE_MARGIN
          ) {
            return;
          }

          if (best.ratio < MIN_VISIBLE_RATIO) {
            if (current && (!currentScore || currentScore.ratio < HOLD_VISIBLE_RATIO)) {
              setFocusedKey(null);
            }
            return;
          }

          if (best.key === current) return;
          const now = Date.now();
          if (now - lastSwitchRef.current < SWITCH_MS) return;
          lastSwitchRef.current = now;
          setFocusedKey(best.key);
        };

        for (const target of entries) {
          const node = target.ref.current;
          if (!node || typeof (node as any).measureInWindow !== "function") {
            pending -= 1;
            if (pending === 0) finish();
            continue;
          }
          (node as any).measureInWindow(
            (_x: number, y: number, _w: number, h: number) => {
              const itemTop = y;
              const itemBottom = y + h;
              const ratio = intersectRatio(
                itemTop,
                itemBottom,
                viewTop,
                viewBottom
              );
              if (ratio > 0.05) {
                const itemCenter = itemTop + h / 2;
                const dist = Math.abs(itemCenter - centerY);
                const proximity = 1 - Math.min(1, dist / Math.max(hh * 0.5, 1));
                // Center proximity dominates — TikTok “what’s in the middle plays”
                const score = ratio * 0.35 + proximity * 0.65;
                scores.push({
                  key: target.key,
                  type: target.type,
                  ratio,
                  score,
                });
              }
              pending -= 1;
              if (pending === 0) finish();
            }
          );
        }
      }
    );
  }, [enabled, preferVideo, setFocusedKey]);

  const onScrollForFocus = useCallback(() => {
    evaluateFocus();
  }, [evaluateFocus]);

  useEffect(() => {
    evaluateFocusRef.current = evaluateFocus;
  }, [evaluateFocus]);

  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => evaluateFocus(), 80);
    return () => clearTimeout(t);
  }, [enabled, evaluateFocus, focusedKey]);

  return {
    setListHostRef,
    registerFocusTarget,
    onScrollForFocus,
    evaluateFocus,
  };
}
