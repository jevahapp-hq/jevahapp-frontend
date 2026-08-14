# Snappiness contract (press = paint)

**Rule:** a tap never waits on mount, a native `Modal`, `measureInWindow`, or network. Overlay chrome is already in the tree. Data fills in behind a skeleton or cache.

```
tap → root overlay visible → sheet/player paints → memory/MMKV rows → background fetch
```

## Overlay hosts (root)

| Surface | Host | Open |
|---|---|---|
| Comments | `CommentModalV2` in `DeferredRootOverlays` | `showCommentModal` |
| Full audio player | `CopyrightFreeSongOverlayHost` | `useCopyrightFreeOverlayStore.open(song)` |

Do **not** mount a second `CopyrightFreeSongModal` (RN `Modal`) for Music tab, artist profile, or mini-bar expand.

## Do not

- Wrap comment / play / tab / like / save / share in `fastPress`
- `React.lazy` the home feed (`AllContentTikTok`)
- Put `null` or `false` in NativeWind `style={[]}` arrays (`cond ? style : undefined`)

## Out of this frontend pass

- Expo Go without MMKV: native binary required — see `docs/MMKV_AND_REACT_QUERY.md`
- Like `POST` 504: send `docs/BACKEND_LIKE_UNLIKE_CORROBORATION.md` to backend
- Content ⋯ menu / `MediaDetailsModal` RN Modal (not the core loop)

## Test checklist

- [ ] Cold Home → first comment on a **video** and a **music/ebook** card: sheet slides immediately
- [ ] Second comment tap: no remount hitch
- [ ] Music tab first card + mini-bar expand: same overlay, no native Modal flash
- [ ] Artist profile play: same overlay
- [ ] Category chips and bottom tabs: no swallowed first tap
- [ ] No `Text strings must be rendered within a <Text>` when comments open
- [ ] Native client kill + relaunch: comment sheet can show disk cache without waiting on network
