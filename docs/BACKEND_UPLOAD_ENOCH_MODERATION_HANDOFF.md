# Backend Handoff — Book of Enoch / Apocrypha Upload Rejected

**Audience:** Backend / moderation  
**Date:** 2026-07-26  
**Frontend:** `jevahapp-frontend`  
**Related:** Upload `POST /api/media/upload`, gospel content policy, AI verification

---

## Verdict (FE)

**Not a frontend bug.** There is **no** client keyword block for “Enoch” / “Book of Enoch”.  
FE only validates file, title length, category, type, and size — then posts to the API.

**Important product rule:** title text never decides media type. A short film titled “Book of Enoch” is still a **video** (`contentType=videos`) if the file is `video/*`. Only MIME/extension + the user’s selected type (with file bytes winning on conflict) set the type.

If the user sees **“Needs a small tweak” / “Upload Needs Adjustment”** (or a 403 toast), that is **server moderation** rejecting the content (often framed as non-gospel / community guidelines).

If they see **“Upload Failed”** with timeout/network wording, that is transport — not policy.

---

## What FE already does

| Step | Behavior |
|------|----------|
| Local eligibility | Required fields + MIME/size — **no title blocklist** |
| Upload | `POST /api/media/upload` (+ optional socket progress) |
| **HTTP 403** + `moderationResult` | Treated as moderation → premium result modal |
| Other HTTP / network | Generic error result modal |

Expected 403 body:

```json
{
  "message": "Content does not meet our community guidelines.",
  "moderationResult": {
    "status": "rejected" | "under_review",
    "reason": "…",
    "flags": ["not gospel", "…"]
  }
}
```

FE maps flag `"not gospel"` → gospel-alignment copy.

---

## Ask (backend)

1. **Reproduce** upload with title/description containing “Book of Enoch” / “Enoch” (ebook or video). Capture status + full JSON (`message`, `moderationResult`, any `code`).
2. Confirm policy: is **apocrypha / pseudepigrapha** intentionally hard-rejected as non-gospel?
3. If this product should allow scholarly/gospel-adjacent Enoch teaching:
   - allowlist phrases, **or**
   - soft path `under_review` instead of hard reject, **or**
   - category exception (e.g. Teachings / Books).
4. Document exact `flags` / `reason` strings for gospel rejects so FE copy stays accurate.
5. Ensure 403 always includes `moderationResult` (never empty body) so users don’t get a vague “Upload failed”.

---

## Out of scope for FE alone

Changing acceptance of Book of Enoch **requires backend policy / classifier change**. FE can only improve messaging (now using a premium result modal).
