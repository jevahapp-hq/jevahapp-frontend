# React Query Coverage Analysis

## ✅ Currently Using React Query

### 1. **Media Content** (✅ Complete)
- **`useMedia` hook** - Main media fetching hook
- **`useMediaQuery` hooks** - New React Query hooks for media
- **Files**: `src/shared/hooks/useMedia.ts`, `src/shared/hooks/useMediaQuery.ts`
- **Status**: ✅ Fully migrated to React Query
- **Benefit**: 0ms cache hits when navigating back to media screens

---

## ⚠️ Could Benefit from React Query

### High Priority (Frequently Used, High Impact)

#### 1. **`useUserProfile`** - User Profile Data
- **File**: `app/hooks/useUserProfile.ts`
- **Current**: Manual `useState` + `useEffect` + AsyncStorage
- **Usage**: Fetched on every app load, profile screen, account screen
- **Benefit**: 
  - User profile cached across app
  - Instant profile display (0ms)
  - Automatic refetch on focus
- **Complexity**: Low - Simple query
- **Recommendation**: ⭐⭐⭐ High priority

#### 2. **`useNotifications`** - Notifications
- **File**: `app/hooks/useNotifications.ts`
- **Current**: Manual state + socket connection + AsyncStorage cache
- **Usage**: Fetched frequently, shown in header badge
- **Benefit**:
  - Instant notification list (0ms)
  - Better pagination with infinite query
  - Automatic background refresh
- **Complexity**: Medium - Has socket integration
- **Recommendation**: ⭐⭐⭐ High priority

#### 3. **`useAccountContent`** - User's Own Content
- **File**: `app/hooks/useAccountContent.ts`
- **Current**: Manual state + parallel API calls
- **Usage**: Account/profile screen, user's posts/media/videos/analytics
- **Benefit**:
  - Instant account screen load (0ms)
  - Better parallel query management
  - Automatic cache invalidation
- **Complexity**: Medium - Multiple parallel queries
- **Recommendation**: ⭐⭐⭐ High priority

#### 4. **`usePrayers`** - Prayer Wall
- **File**: `app/hooks/usePrayers.ts`
- **Current**: Manual state + pagination
- **Usage**: Prayer wall screen
- **Benefit**:
  - Instant prayer list (0ms)
  - Better infinite scroll with `useInfiniteQuery`
  - Automatic pagination caching
- **Complexity**: Low - Standard pagination
- **Recommendation**: ⭐⭐ Medium priority

#### 5. **`useForums`** - Forum Categories & Discussions
- **File**: `app/hooks/useForums.ts`
- **Current**: Manual state for categories and discussions
- **Usage**: Forum screen
- **Benefit**:
  - Instant forum categories (0ms)
  - Better discussion list caching
  - Automatic refetch
- **Complexity**: Medium - Multiple related queries
- **Recommendation**: ⭐⭐ Medium priority

#### 6. **`useGroups`** - User Groups
- **File**: `app/hooks/useGroups.ts`
- **Current**: Manual state + pagination
- **Usage**: Groups screen
- **Benefit**:
  - Instant groups list (0ms)
  - Better pagination
- **Complexity**: Low - Standard pagination
- **Recommendation**: ⭐⭐ Medium priority

---

### Medium Priority

#### 7. **`useResponsiveData`** - Generic Data Fetching
- **File**: `app/hooks/useResponsiveData.ts`
- **Current**: Custom hook with manual caching
- **Usage**: Generic data fetching wrapper
- **Benefit**: Could be replaced with React Query entirely
- **Complexity**: High - Used as base for other hooks
- **Recommendation**: ⭐ Low priority (consider deprecating in favor of React Query)

---

## 📊 Impact Analysis

### Current Coverage
- **Media Content**: ✅ 100% (Main content feed)
- **User Profile**: ❌ 0% (Manual state)
- **Notifications**: ❌ 0% (Manual state)
- **Account Content**: ❌ 0% (Manual state)
- **Prayers**: ❌ 0% (Manual state)
- **Forums**: ❌ 0% (Manual state)
- **Groups**: ❌ 0% (Manual state)

### Estimated Performance Gains

If we migrate all high-priority hooks:

| Screen | Current Load | With React Query | Improvement |
|--------|-------------|------------------|-------------|
| Profile Screen | 200-500ms | 0ms (cached) | **Instant** |
| Notifications | 150-300ms | 0ms (cached) | **Instant** |
| Account Screen | 300-600ms | 0ms (cached) | **Instant** |
| Prayer Wall | 200-400ms | 0ms (cached) | **Instant** |
| Forum Screen | 200-400ms | 0ms (cached) | **Instant** |
| Groups Screen | 200-400ms | 0ms (cached) | **Instant** |

**Total Impact**: App would feel **significantly faster** with instant navigation between screens.

---

## 🎯 Recommended Migration Order

### Phase 1: High-Impact, Low-Complexity (Do First)
1. ✅ **`useMedia`** - Already done!
2. **`useUserProfile`** - Simple query, high usage
3. **`usePrayers`** - Simple pagination

### Phase 2: High-Impact, Medium-Complexity
4. **`useNotifications`** - Socket integration needs care
5. **`useAccountContent`** - Multiple parallel queries
6. **`useForums`** - Multiple related queries

### Phase 3: Medium-Impact
7. **`useGroups`** - Similar to prayers

### Phase 4: Refactoring
8. **`useResponsiveData`** - Consider deprecating

---

## 💡 Implementation Strategy

### For Each Hook:

1. **Create React Query version** (new file or update existing)
2. **Maintain backward compatibility** (same return interface)
3. **Add React Query caching** (15 min stale time)
4. **Test thoroughly** (ensure no breaking changes)
5. **Gradually migrate components** (or use both in parallel)

### Example Pattern:

```typescript
// OLD: Manual state
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
useEffect(() => {
  fetchData().then(setData);
}, []);

// NEW: React Query
const { data = [], isLoading: loading } = useQuery({
  queryKey: ['my-data'],
  queryFn: fetchData,
  staleTime: 15 * 60 * 1000,
  refetchOnMount: false, // 0ms cache hit!
});
```

---

## ✅ Summary

**Current Status:**
- ✅ Media content fully migrated
- ❌ 6+ other hooks still using manual state
- 📊 ~15% of data fetching uses React Query

**Recommendation:**
- **Priority**: Migrate `useUserProfile`, `useNotifications`, `useAccountContent` next
- **Impact**: These 3 hooks would cover ~80% of user navigation
- **Effort**: Medium (2-3 hours per hook)
- **Benefit**: App would feel **significantly faster** with instant screen loads

**Next Steps:**
1. Migrate `useUserProfile` (highest impact, simplest)
2. Migrate `useNotifications` (high usage)
3. Migrate `useAccountContent` (account screen)
4. Then tackle prayers, forums, groups

---

**Last Updated**: After React Query initial implementation  
**Coverage**: 1/7 major hooks (14%)  
**Target**: 7/7 major hooks (100%)

