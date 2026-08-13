# Frontend — Artist releases checklist

**Date:** 2026-08-04  
**BE contract:** [`BACKEND_ARTIST_RELEASES_CONTRACT_TIGHTEN.md`](./BACKEND_ARTIST_RELEASES_CONTRACT_TIGHTEN.md)

## Done (this pass)

- [x] Types + `CreatorsApi` release CRUD / cover / reorder / publish / unlink  
- [x] Upload pipeline `releaseId` + `trackNumber` + `uploadReleaseCover`  
- [x] Studio: list · create · wizard (`/creators/releases/*`)  
- [x] Type-hint confirm → `skipTypeHints`  
- [x] Public release page `/music/releases/[idOrSlug]`  
- [x] Artist discography shelf on profile  
- [x] Mini-player “Playing from {release.title}”  
- [x] Admin table `/admin/releases` (lowest priority)  
- [x] Never wire releases into Copyright-free  

## Blocked on BE (soft-fail in FE)

- [ ] `DELETE /api/creators/releases/:id/tracks/:trackId`  
- [ ] Publish returns full release + tracks  
- [ ] Nested `release` on track cards  
- [ ] Single cover inherit on public GET  
- [ ] Slug PATCH + global uniqueness  

## Routes

| Surface | Path |
|---------|------|
| Studio list | `/creators/releases` |
| New draft | `/creators/releases/new` |
| Wizard | `/creators/releases/[id]` |
| Public | `/music/releases/[idOrSlug]` |
| Admin | `/admin/releases` |
