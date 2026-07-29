import type { CommentMention, MentionCandidate } from "./types";

/** Active @query at caret, if any. */
export function getActiveMentionQuery(
  text: string,
  cursor: number
): { start: number; query: string } | null {
  const before = text.slice(0, Math.max(0, cursor));
  const match = before.match(/(^|[\s])@([^\s@]*)$/);
  if (!match) return null;
  const atIndex = before.lastIndexOf("@");
  if (atIndex < 0) return null;
  return { start: atIndex, query: match[2] || "" };
}

export function filterMentionCandidates(
  candidates: MentionCandidate[],
  query: string
): MentionCandidate[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: MentionCandidate[] = [];
  for (const c of candidates) {
    const key = c.userId || c.displayName.toLowerCase();
    if (!c.displayName?.trim() || seen.has(key)) continue;
    if (q && !c.displayName.toLowerCase().includes(q)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= 8) break;
  }
  return out;
}

/** Build unique pool from creator + thread authors. */
export function buildMentionPool(args: {
  creator?: MentionCandidate | null;
  thread: Array<{ userId?: string; userName?: string; avatar?: string }>;
  excludeUserId?: string;
}): MentionCandidate[] {
  const pool: MentionCandidate[] = [];
  const seen = new Set<string>();

  const push = (c: MentionCandidate) => {
    const key = (c.userId || c.displayName).toLowerCase();
    if (!key || seen.has(key)) return;
    if (args.excludeUserId && c.userId && c.userId === args.excludeUserId) {
      return;
    }
    seen.add(key);
    pool.push(c);
  };

  if (args.creator?.displayName) {
    push({ ...args.creator, isCreator: true });
  }

  for (const row of args.thread) {
    if (!row.userName) continue;
    push({
      userId: row.userId || `name:${row.userName}`,
      displayName: row.userName,
      avatar: row.avatar,
    });
    if (Array.isArray((row as any).replies)) {
      for (const r of (row as any).replies) {
        if (!r?.userName) continue;
        push({
          userId: r.userId || `name:${r.userName}`,
          displayName: r.userName,
          avatar: r.avatar,
        });
      }
    }
  }

  return pool;
}

export function insertMentionAt(
  text: string,
  cursor: number,
  mentionStart: number,
  candidate: MentionCandidate
): { text: string; cursor: number; mention: CommentMention } {
  const insert = `@${candidate.displayName} `;
  const next = text.slice(0, mentionStart) + insert + text.slice(cursor);
  return {
    text: next.slice(0, 500),
    cursor: mentionStart + insert.length,
    mention: {
      userId: candidate.userId.startsWith("name:") ? "" : candidate.userId,
      displayName: candidate.displayName,
    },
  };
}

/** Mentions present in final text (by @DisplayName match). */
export function resolveMentionsInText(
  text: string,
  selected: CommentMention[]
): CommentMention[] {
  const found: CommentMention[] = [];
  const seen = new Set<string>();
  for (const m of selected) {
    const token = `@${m.displayName}`;
    if (!text.includes(token)) continue;
    const key = m.userId || m.displayName;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(m);
  }
  return found;
}
