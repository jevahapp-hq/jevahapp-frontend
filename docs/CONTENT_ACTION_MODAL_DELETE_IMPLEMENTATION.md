# ContentActionModal Delete Option - Complete Implementation Guide

## 📋 Overview

This document explains how the `ContentActionModal` dynamically creates and shows the delete option for media authors. It covers the complete flow from content card rendering to deletion confirmation, including ownership checking mechanisms.

**Last Updated**: 2024-12-19  
**Status**: ✅ Fully Implemented  
**Backend Verified**: ✅ Matches backend structure (uploadedBy as populated object)

## ⚠️ Important Backend Structure Note

**Backend returns `uploadedBy` as a populated object** for Media content:
```typescript
{
  uploadedBy: {
    _id: "507f1f77bcf86cd799439012",  // ← ObjectId as string
    firstName: "John",
    lastName: "Doe",
    avatar: "https://..."
  }
}
```

The frontend implementation handles this by checking `uploadedBy._id` first (Priority 1), matching the backend's structure.

---

## 🎯 Key Components

### 1. ContentActionModal Component
**Location**: `src/shared/components/ContentActionModal.tsx`

The main modal component that displays content actions (View Details, Save, Delete, Download, Report).

### 2. useMediaOwnership Hook
**Location**: `src/shared/hooks/useMediaOwnership.ts`

Checks if the current user owns a media item by comparing user IDs.

### 3. useMediaDeletion Hook
**Location**: `src/shared/hooks/useMediaDeletion.ts`

Combines ownership checking and deletion logic.

### 4. useDeleteMedia Hook
**Location**: `app/hooks/useDeleteMedia.ts`

Handles the actual deletion API call and ownership checking logic.

### 5. mediaDeleteAPI Service
**Location**: `app/utils/mediaDeleteAPI.ts`

Contains the `isMediaOwner()` function and `deleteMedia()` API call.

---

## 🔄 Complete Flow: How Delete Option Appears

### Step 1: Content Card Renders

When a content card (VideoCard, EbookCard, MusicCard) renders, it:

```typescript
// Example from VideoCard.tsx
const {
  isOwner,
  showDeleteModal,
  openDeleteModal,
  closeDeleteModal,
  handleDeleteConfirm: handleDeleteConfirmInternal,
} = useMediaDeletion({
  mediaItem: video,
  isModalVisible: isModalVisible || modalVisible === modalKey,
  onDeleteSuccess: (deletedVideo) => {
    closeModal();
    if (onDelete) {
      onDelete(deletedVideo);
    }
  },
});
```

**What happens:**
- `useMediaDeletion` hook is called with the `video` media item
- Hook internally calls `useMediaOwnership` to check ownership
- Ownership check happens automatically when modal opens

---

### Step 2: User Opens Action Modal

When user taps the three-dots menu on a content card:

```typescript
// ContentActionModal receives props
<ContentActionModal
  isVisible={isModalVisible}
  onDelete={handleDeletePress}
  showDelete={isOwner}  // ← Key prop!
  mediaItem={video}
  uploadedBy={getUploadedBy(video)}
  // ... other props
/>
```

**Props passed:**
- `onDelete`: Handler function (required for delete button to appear)
- `showDelete`: Boolean indicating if user is owner (from `useMediaDeletion` hook)
- `mediaItem`: Full media item object
- `uploadedBy`: Extracted uploadedBy value

---

### Step 3: ContentActionModal Ownership Logic

Inside `ContentActionModal`, there's a **three-tier priority system**:

```typescript
// Priority 1: If showDelete is explicitly provided, use it
// Priority 2: If showDelete is false, don't show delete
// Priority 3: Otherwise, check ownership internally using hook

const shouldCheckOwnership = showDelete === undefined && (!!mediaItem || !!uploadedBy);
const { isOwner: isOwnerFromHook } = useMediaOwnership({
  mediaItem: mediaItem || (uploadedBy ? { uploadedBy } : undefined),
  isModalVisible: internalVisible && onDelete !== undefined && shouldCheckOwnership,
  checkOnModalOpen: shouldCheckOwnership,
});

const isOwner = showDelete === true 
  ? true 
  : showDelete === false 
  ? false 
  : isOwnerFromHook;
```

**Logic Flow:**
1. **If `showDelete` is explicitly `true`**: Show delete (trust parent's check)
2. **If `showDelete` is explicitly `false`**: Hide delete
3. **If `showDelete` is `undefined`**: Use `useMediaOwnership` hook result

---

### Step 4: Delete Button Rendering

The delete button is conditionally rendered:

```typescript
{/* Delete button - only show if user is the owner */}
{onDelete && isOwner && (
  <TouchableOpacity
    onPress={() => {
      if (onDelete) {
        onDelete();
      }
      handleClose();
    }}
    // ... styling
  >
    <Ionicons name="trash-outline" />
    <Text>Delete</Text>
  </TouchableOpacity>
)}
```

**Conditions for showing delete:**
- ✅ `onDelete` prop must be provided
- ✅ `isOwner` must be `true`

---

## 🔍 Ownership Checking Mechanism

### How Ownership is Determined

#### 1. Extract `uploadedBy` Value

```typescript
// From mediaHelpers.ts
export const getUploadedBy = (mediaItem: any): string | { _id: string } | undefined => {
  if (!mediaItem) return undefined;
  
  return (
    mediaItem.uploadedBy ||
    mediaItem.author?._id ||
    mediaItem.authorInfo?._id ||
    undefined
  );
};
```

**Priority order (matches backend structure):**
1. `mediaItem.uploadedBy` (can be populated object `{_id: "...", firstName: "..."}` or string)
2. `mediaItem.author._id` (for Devotional content)
3. `mediaItem.authorInfo._id` (fallback for other content types)

**⚠️ Backend Note**: Backend returns `uploadedBy` as a **populated object** for Media content:
```typescript
uploadedBy: {
  _id: "507f1f77bcf86cd799439012",
  firstName: "John",
  lastName: "Doe"
}
```

---

#### 2. Get Current User ID

```typescript
// From mediaDeleteAPI.ts - isMediaOwner()
const userStr = await AsyncStorage.getItem("user");
let user = null;
if (userStr) {
  user = JSON.parse(userStr);
}

let currentUserId = String(
  user._id ||
  user.id ||
  user.userId ||
  user.userID ||
  (user.profile && (user.profile._id || user.profile.id)) ||
  ""
).trim();
```

**Tries multiple fields:**
- `user._id`
- `user.id`
- `user.userId`
- `user.userID`
- `user.profile._id`
- `user.profile.id`

---

#### 3. Extract `uploadedBy` ID from Media Item

**⚠️ IMPORTANT**: Backend returns `uploadedBy` as a **populated object** with `_id` inside it for Media content:
```typescript
{
  uploadedBy: {
    _id: "507f1f77bcf86cd799439012",  // ← ObjectId as string
    firstName: "John",
    lastName: "Doe",
    avatar: "https://..."
  }
}
```

```typescript
// From mediaDeleteAPI.ts - isMediaOwner()
// Priority order matches backend structure:
let uploadedById: string = "";

// Priority 1: uploadedBy object (populated) with _id - BACKEND RETURNS THIS FOR MEDIA
if (
  mediaItem?.uploadedBy &&
  typeof mediaItem.uploadedBy === "object" &&
  (mediaItem.uploadedBy._id || mediaItem.uploadedBy.id)
) {
  uploadedById = String(
    mediaItem.uploadedBy._id || mediaItem.uploadedBy.id
  ).trim();
}
// Priority 2: uploadedBy parameter as object with _id
else if (uploadedBy && typeof uploadedBy === "object" && (uploadedBy._id || uploadedBy.id)) {
  uploadedById = String(uploadedBy._id || uploadedBy.id || uploadedBy.userId || "").trim();
}
// Priority 3: uploadedBy as direct ObjectId string
else if (typeof uploadedBy === "string") {
  const trimmed = String(uploadedBy).trim();
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    uploadedById = trimmed;
  } else {
    // It's a name, not an ID - assume ownership (backend will verify)
    return true;
  }
}
// Priority 4: mediaItem.uploadedBy as direct string (if not populated)
else if (mediaItem?.uploadedBy && typeof mediaItem.uploadedBy === "string") {
  const trimmed = String(mediaItem.uploadedBy).trim();
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    uploadedById = trimmed;
  }
}
// Priority 5: author._id - for Devotional content
else if (mediaItem?.author?._id) {
  uploadedById = String(mediaItem.author._id).trim();
}
// Priority 6: authorInfo._id - fallback for other content types
else if (mediaItem?.authorInfo?._id) {
  uploadedById = String(mediaItem.authorInfo._id).trim();
}
```

**Priority Order Explanation:**
1. **`uploadedBy._id`** (populated object) - For Media content (backend returns this)
2. **`uploadedBy`** (direct string/ObjectId) - If not populated
3. **`author._id`** - For Devotional content
4. **`authorInfo._id`** - Fallback for other content types

---

#### 4. Compare IDs

```typescript
// Final comparison
const isOwner = String(currentUserId) === String(uploadedById);

console.log("🔍 isMediaOwner check:", {
  currentUserId,
  uploadedById,
  isOwner,
  currentUserIdType: typeof currentUserId,
  uploadedByIdType: typeof uploadedById,
});
```

**Comparison:**
- Both IDs are converted to strings
- Direct string comparison: `currentUserId === uploadedById`
- Returns `true` if IDs match, `false` otherwise

---

### Edge Cases & Fallbacks

#### Case 1: Cannot Determine Ownership

```typescript
if (!uploadedById) {
  console.log("❌ isMediaOwner: Could not extract uploadedBy ID");
  // If we can't determine, assume ownership (backend will verify)
  return true;
}
```

**Behavior:** Shows delete option, backend will verify

---

#### Case 2: `uploadedBy` is a Name (Not ID)

```typescript
if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
  uploadedById = trimmed;
} else {
  // It's likely a full name, so we can't reliably check ownership
  // But we'll assume ownership if user is logged in (backend will verify)
  console.log("⚠️ isMediaOwner: uploadedBy appears to be a name, not an ID");
  return true;
}
```

**Behavior:** Shows delete option, backend will verify

---

#### Case 3: No User ID Found But Token Exists

```typescript
if (!currentUserId) {
  const token = await AsyncStorage.getItem("userToken") || 
                await AsyncStorage.getItem("token");
  
  if (!token) {
    return false; // No user, no ownership
  }
  
  // Token exists but no explicit user ID
  // Trust frontend ownership check and defer final check to backend
  console.log("⚠️ No explicit user ID found, but token exists");
}
```

**Behavior:** May show delete option, backend will verify

---

#### Case 4: Error During Check

```typescript
catch (error) {
  console.error("❌ Error checking media ownership:", error);
  // On error, assume ownership (backend will verify)
  return true;
}
```

**Behavior:** Shows delete option, backend will verify

---

## 🎨 Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Card Renders                     │
│  (VideoCard, EbookCard, MusicCard)                         │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              useMediaDeletion Hook Called                   │
│  - Receives: mediaItem                                      │
│  - Calls: useMediaOwnership internally                      │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            useMediaOwnership Hook Executes                  │
│  - Extracts uploadedBy using getUploadedBy()                │
│  - Gets currentUserId from AsyncStorage                     │
│  - Compares: currentUserId === uploadedById                 │
│  - Returns: isOwner (boolean)                               │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Content Card Passes Props to Modal                  │
│  - onDelete: handler function                               │
│  - showDelete: isOwner (from hook)                         │
│  - mediaItem: full media object                            │
│  - uploadedBy: extracted value                             │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         ContentActionModal Receives Props                   │
│  - Checks: showDelete prop (priority 1)                    │
│  - Falls back to: useMediaOwnership hook (priority 2)       │
│  - Determines: final isOwner value                         │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Conditional Rendering                               │
│  {onDelete && isOwner && (                                 │
│    <DeleteButton />                                         │
│  )}                                                         │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Delete Button Visible?                         │
│  ✅ YES: If onDelete exists AND isOwner === true           │
│  ❌ NO: If either condition fails                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Model

### Frontend (UX Optimization)
- **Purpose**: Show/hide delete option for better UX
- **Method**: Compare user IDs client-side
- **Fallback**: If uncertain, show option (backend will verify)
- **Not Secure**: Can be bypassed by modifying code

### Backend (Security Enforcement)
- **Purpose**: Actually enforce deletion permissions
- **Method**: Verify ownership before deletion
- **Check**: `media.uploadedBy.toString() !== userId && userRole !== "admin"`
- **Secure**: Cannot be bypassed

### Why This Works
1. **Frontend** optimizes UX by hiding delete for non-owners
2. **Backend** enforces security by verifying ownership
3. **Even if** frontend shows delete incorrectly, backend will reject unauthorized deletions

---

## 📊 Comparison: Frontend vs Backend

| Aspect | Frontend | Backend |
|--------|----------|---------|
| **Ownership Check** | Compares `currentUserId === uploadedById` | Compares `media.uploadedBy === userId` |
| **User ID Source** | AsyncStorage `user` object | JWT token `userId` field |
| **Media ID Source** | `mediaItem.uploadedBy` / `author._id` / `authorInfo._id` | `media.uploadedBy` from database |
| **Admin Override** | Not checked | ✅ Admins can delete any content |
| **Fallback Behavior** | Shows delete if uncertain | Rejects unauthorized deletions |
| **Security Level** | UX optimization | Actual security enforcement |
| **Can Be Bypassed** | Yes (code modification) | No (server-side check) |

---

## 🐛 Troubleshooting: Why Delete Option Might Not Show

### Issue 1: User ID Mismatch

**Symptom:** Delete option doesn't show for content you uploaded

**Possible Causes:**
1. `currentUserId` doesn't match `uploadedById`
2. User ID format mismatch (string vs ObjectId)
3. User ID stored in different field than expected

**Debug Steps:**
```typescript
// Add logging in isMediaOwner()
console.log("🔍 Ownership Check:", {
  currentUserId,
  uploadedById,
  currentUserIdType: typeof currentUserId,
  uploadedByIdType: typeof uploadedById,
  userObject: user,
  mediaItem: {
    uploadedBy: mediaItem.uploadedBy,
    author: mediaItem.author,
    authorInfo: mediaItem.authorInfo,
  }
});
```

**Check:**
- Is `currentUserId` the same format as `uploadedById`?
- Are both strings? (should be)
- Do they match exactly? (case-sensitive)

---

### Issue 2: `uploadedBy` Field Missing or Wrong Format

**Symptom:** Delete option doesn't show even though you're the owner

**Possible Causes:**
1. `mediaItem.uploadedBy` is missing
2. `mediaItem.author._id` is missing
3. `mediaItem.authorInfo._id` is missing
4. `uploadedBy` is a name instead of ID

**Debug Steps:**
```typescript
// Check what fields exist
console.log("Media Item Fields:", {
  hasUploadedBy: !!mediaItem.uploadedBy,
  uploadedByValue: mediaItem.uploadedBy,
  hasAuthor: !!mediaItem.author,
  authorId: mediaItem.author?._id,
  hasAuthorInfo: !!mediaItem.authorInfo,
  authorInfoId: mediaItem.authorInfo?._id,
});
```

**Solution:**
- Ensure backend returns `uploadedBy` field
- Ensure it's an ObjectId string (24 hex characters)
- Check if it matches your user ID

---

### Issue 3: Modal Not Receiving Correct Props

**Symptom:** Delete option doesn't show even though ownership check passes

**Possible Causes:**
1. `onDelete` prop not passed to ContentActionModal
2. `showDelete` prop is `false` or `undefined`
3. `mediaItem` prop missing

**Debug Steps:**
```typescript
// In ContentActionModal, add logging
console.log("ContentActionModal Props:", {
  hasOnDelete: !!onDelete,
  showDelete,
  hasMediaItem: !!mediaItem,
  uploadedBy,
  isOwnerFromHook,
  finalIsOwner: isOwner,
});
```

**Check:**
- Is `onDelete` function provided?
- Is `showDelete` explicitly `true`?
- Is `mediaItem` passed correctly?

---

### Issue 4: Ownership Check Not Running

**Symptom:** Delete option doesn't show, no errors

**Possible Causes:**
1. `checkOnModalOpen` is `false`
2. `isModalVisible` is `false` when check runs
3. `mediaItem` is `null` or `undefined`

**Debug Steps:**
```typescript
// In useMediaOwnership hook
console.log("Ownership Check Trigger:", {
  checkOnModalOpen,
  isModalVisible,
  hasMediaItem: !!mediaItem,
  shouldCheck: checkOnModalOpen && isModalVisible,
});
```

**Solution:**
- Ensure `checkOnModalOpen` is `true`
- Ensure modal is visible when check runs
- Ensure `mediaItem` is provided

---

## ✅ Testing Checklist

### Test Case 1: Owner Sees Delete Option
- [ ] Upload content as User A
- [ ] Open action modal on that content
- [ ] Verify delete option is visible
- [ ] Verify `isOwner === true` in logs

### Test Case 2: Non-Owner Doesn't See Delete Option
- [ ] User A uploads content
- [ ] User B opens action modal
- [ ] Verify delete option is NOT visible
- [ ] Verify `isOwner === false` in logs
- [ ] Verify report option IS visible

### Test Case 3: Ownership Check Accuracy
- [ ] Check console logs for ownership comparison
- [ ] Verify `currentUserId` matches `uploadedById`
- [ ] Verify both are strings
- [ ] Verify format is correct (ObjectId: 24 hex chars)

### Test Case 4: Backend Verification
- [ ] Try to delete content you own → Should succeed
- [ ] Try to delete content you don't own → Should fail (403)
- [ ] Verify backend returns correct error message

---

## 📝 Code Examples

### Example 1: Content Card Implementation

```typescript
// VideoCard.tsx
const {
  isOwner,
  showDeleteModal,
  openDeleteModal,
  closeDeleteModal,
  handleDeleteConfirm,
} = useMediaDeletion({
  mediaItem: video,
  isModalVisible: isModalVisible || modalVisible === modalKey,
  onDeleteSuccess: (deletedVideo) => {
    closeModal();
    if (onDelete) {
      onDelete(deletedVideo);
    }
  },
});

// Pass to modal
<ContentActionModal
  onDelete={handleDeletePress}
  showDelete={isOwner}  // ← From hook
  mediaItem={video}
  uploadedBy={getUploadedBy(video)}
/>
```

---

### Example 2: Manual Ownership Check

```typescript
// If you need to check ownership manually
import { useDeleteMedia } from "../hooks/useDeleteMedia";

const { checkOwnership } = useDeleteMedia();

const verifyOwnership = async () => {
  const uploadedBy = getUploadedBy(mediaItem);
  const isOwner = await checkOwnership(uploadedBy, mediaItem);
  
  if (isOwner) {
    // Show delete option
  } else {
    // Hide delete option
  }
};
```

---

### Example 3: Direct API Ownership Check

```typescript
// If you need to check ownership without hooks
import { isMediaOwner } from "../utils/mediaDeleteAPI";

const checkOwnership = async (mediaItem: any) => {
  const uploadedBy = mediaItem.uploadedBy || 
                     mediaItem.author?._id || 
                     mediaItem.authorInfo?._id;
  
  const isOwner = await isMediaOwner(uploadedBy, mediaItem);
  return isOwner;
};
```

---

## 🔄 Complete Deletion Flow

```
1. User clicks three-dots menu
   ↓
2. ContentActionModal opens
   ↓
3. useMediaOwnership checks ownership
   ↓
4. Delete button appears (if isOwner === true)
   ↓
5. User clicks Delete
   ↓
6. DeleteMediaConfirmation modal opens
   ↓
7. User confirms deletion
   ↓
8. DELETE /api/media/:id called
   ↓
9. Backend verifies ownership
   ↓
10. Backend deletes media (if authorized)
   ↓
11. Frontend updates UI (removes from list)
```

---

## 🎯 Key Takeaways

1. **Delete option visibility** is determined by:
   - `onDelete` prop must exist
   - `isOwner` must be `true`
   - Ownership is checked by comparing user IDs

2. **Ownership check** happens:
   - Automatically when modal opens (if `checkOnModalOpen === true`)
   - Manually via `checkOwnership()` function
   - Compares `currentUserId` with `uploadedById`

3. **Security model**:
   - Frontend: UX optimization (can be bypassed)
   - Backend: Actual enforcement (cannot be bypassed)

4. **Fallback behavior**:
   - If ownership cannot be determined, show delete option
   - Backend will verify and reject unauthorized deletions

5. **Debugging**:
   - Check console logs for ownership comparison
   - Verify user IDs match exactly
   - Ensure `uploadedBy` field exists and is correct format

---

## 📚 Related Files

- `src/shared/components/ContentActionModal.tsx` - Main modal component
- `src/shared/hooks/useMediaOwnership.ts` - Ownership checking hook
- `src/shared/hooks/useMediaDeletion.ts` - Deletion logic hook
- `app/hooks/useDeleteMedia.ts` - Delete API hook
- `app/utils/mediaDeleteAPI.ts` - Ownership check & delete API
- `src/shared/utils/mediaHelpers.ts` - Helper functions

---

**Last Updated**: 2024-12-19  
**Status**: ✅ Complete Implementation  
**Next Review**: When ownership checking logic changes

