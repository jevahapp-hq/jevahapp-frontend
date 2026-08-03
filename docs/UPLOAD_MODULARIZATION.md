# Upload Modularization

**Updated:** 2026-08-02  
**Status:** Screen shell already thin; form/success/validation hotspots split.

---

## Layout

| File | Role | Lines (approx) |
|------|------|---------------:|
| [`UploadScreen.tsx`](../app/categories/upload/UploadScreen.tsx) | Orchestrator only | ~233 |
| [`UploadFormFields.tsx`](../app/categories/upload/components/UploadFormFields.tsx) | Composes field sections | ~126 |
| `FieldLabel.tsx` | Label + help | ~72 |
| `TitleDescriptionFields.tsx` | Title / description inputs | ~96 |
| `AiDescriptionBlock.tsx` | AI generate + bible verses | ~203 |
| `CategoryTypeSection.tsx` | Category/type tags + eligibility | ~133 |
| `uploadFlow/uploadSuccess.ts` | Barrel | ~21 |
| `persistUploadedMedia.ts` | Feed seed after upload | ~130 |
| `scheduleUploadSuccessNavigation.ts` | Success UX + seekable poll | ~159 |
| `resolveProcessingStatus.ts` | Status / duration helpers | ~77 |
| `utils/uploadValidation.ts` | Barrel | ~26 |
| `eligibilityRules.ts` | Main eligibility | ~137 |
| `mimeCompatibility.ts` | MIME vs contentType | ~153 |
| `sizeLimits.ts` | Size caps | ~48 |

**Public exports unchanged** via barrels: `validateMediaEligibility`, `persistUploadedMedia`, `scheduleUploadSuccessNavigation`, etc.

---

## Rules

1. `UploadScreen` stays a wiring-only shell.  
2. Prefer new upload components under ~180 lines.  
3. Do not put API / socket logic in form field components.
