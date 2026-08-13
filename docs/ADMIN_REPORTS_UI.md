# Admin reports — Report Detail & Review

Mobile admin surface for media report moderation.

## Routes

| Path | Screen |
|------|--------|
| `/admin` | Hub (Reports + Releases) |
| `/admin/reports` | Report list (filter by status) |
| `/admin/reports/[id]` | **Report Detail & Review** |
| `/reader/PdfViewer` | Full ebook reader (opened from book reports) |

Admin users also see **Admin console** on Account.

## Book reports

When reported media is an ebook/PDF (`contentType` books/ebook/pdf or `.pdf` URL):

1. Detail shows a dark inspect card with cover
2. **Read book** opens the existing `PdfViewer` with `fileUrl` / `pdfUrl`
3. Admin can read the full book before **reviewed** / **resolved**

## API (admin JWT)

```http
GET  /api/admin/reports?status=pending
GET  /api/admin/reports/:id
PATCH /api/admin/reports/:id
  { "status": "reviewed"|"resolved", "resolutionNotes": "…" }
# fallback
POST /api/admin/reports/:id/resolve
```

Client: `app/services/admin/AdminApi.ts` (flexible field mapping for media, reporter, siblings).
