# Delete Option Not Showing - Debugging Guide

## 🚨 Quick Diagnostic Steps

If you can't see the delete option for items you uploaded, follow these steps:

---

## Step 1: Check Console Logs

Open your browser/React Native debugger console and look for:

```
🔍 isMediaOwner check: {
  currentUserId: "...",
  uploadedById: "...",
  isOwner: true/false,
  ...
}
```

**What to check:**
- ✅ Are both `currentUserId` and `uploadedById` present?
- ✅ Do they match exactly? (case-sensitive)
- ✅ Are they both strings?

---

## Step 2: Verify User ID in AsyncStorage

```typescript
// In your app, check what's stored:
const userStr = await AsyncStorage.getItem("user");
const user = JSON.parse(userStr);
console.log("Current User:", {
  _id: user._id,
  id: user.id,
  userId: user.userId,
  fullUser: user
});
```

**What to check:**
- ✅ Does `user._id` exist?
- ✅ Is it a valid ObjectId (24 hex characters)?
- ✅ Does it match the `uploadedBy` field in your media?

---

## Step 3: Verify Media Item Structure

```typescript
// Check what fields exist on your media item:
console.log("Media Item:", {
  uploadedBy: mediaItem.uploadedBy,
  author: mediaItem.author,
  authorInfo: mediaItem.authorInfo,
  authorId: mediaItem.author?._id,
  authorInfoId: mediaItem.authorInfo?._id,
});
```

**What to check:**
- ✅ Does `mediaItem.uploadedBy` exist?
- ✅ Does `mediaItem.author._id` exist?
- ✅ Does `mediaItem.authorInfo._id` exist?
- ✅ Is the value an ObjectId string (24 hex characters)?

---

## Step 4: Check ContentActionModal Props

Add this logging in `ContentActionModal.tsx`:

```typescript
console.log("ContentActionModal Props:", {
  hasOnDelete: !!onDelete,
  showDelete,
  hasMediaItem: !!mediaItem,
  uploadedBy,
  isOwnerFromHook,
  finalIsOwner: isOwner,
  shouldCheckOwnership,
});
```

**What to check:**
- ✅ Is `onDelete` provided? (must be truthy)
- ✅ Is `showDelete` `true`? (or `undefined` to trigger hook check)
- ✅ Is `mediaItem` provided?
- ✅ What is `finalIsOwner`? (must be `true` for delete to show)

---

## Step 5: Verify Ownership Check Runs

Add this logging in `useMediaOwnership.ts`:

```typescript
console.log("Ownership Check Trigger:", {
  checkOnModalOpen,
  isModalVisible,
  hasMediaItem: !!mediaItem,
  shouldCheck: checkOnModalOpen && isModalVisible,
});
```

**What to check:**
- ✅ Is `checkOnModalOpen` `true`?
- ✅ Is `isModalVisible` `true` when check runs?
- ✅ Is `mediaItem` provided?

---

## Common Issues & Solutions

### Issue 1: User ID Format Mismatch

**Symptom:** `currentUserId` and `uploadedById` don't match even though they should

**Solution:**
```typescript
// Ensure both are strings and trimmed
const currentUserId = String(user._id).trim();
const uploadedById = String(mediaItem.uploadedBy).trim();

console.log("Comparison:", {
  currentUserId,
  uploadedById,
  match: currentUserId === uploadedById,
  lengthMatch: currentUserId.length === uploadedById.length,
});
```

---

### Issue 2: `uploadedBy` Field Missing

**Symptom:** `uploadedById` is empty string

**Solution:**
- Check backend response - ensure `uploadedBy` field is included
- Check if it's in `author._id` or `authorInfo._id` instead
- Verify backend returns the field correctly

---

### Issue 3: User Not Stored Correctly

**Symptom:** `currentUserId` is empty string

**Solution:**
```typescript
// After login, verify user is stored:
const loginResult = await authService.login(email, password);
if (loginResult.data.user) {
  await AsyncStorage.setItem("user", JSON.stringify(loginResult.data.user));
  console.log("User stored:", loginResult.data.user);
}
```

---

### Issue 4: Modal Props Not Passed

**Symptom:** `onDelete` is `undefined` or `showDelete` is `false`

**Solution:**
```typescript
// In your content card, ensure:
<ContentActionModal
  onDelete={handleDeletePress}  // ← Must be provided
  showDelete={isOwner}           // ← Must be true
  mediaItem={video}              // ← Must be provided
  uploadedBy={getUploadedBy(video)} // ← Optional but helpful
/>
```

---

## Quick Test Script

Add this to your content card component temporarily:

```typescript
useEffect(() => {
  const debugOwnership = async () => {
    const userStr = await AsyncStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const currentUserId = String(user?._id || user?.id || "").trim();
    
    const uploadedBy = getUploadedBy(video);
    const uploadedById = String(
      video.uploadedBy ||
      video.author?._id ||
      video.authorInfo?._id ||
      ""
    ).trim();
    
    console.log("🔍 DEBUG Ownership Check:", {
      currentUserId,
      uploadedById,
      match: currentUserId === uploadedById,
      videoUploadedBy: video.uploadedBy,
      videoAuthor: video.author,
      videoAuthorInfo: video.authorInfo,
      userObject: user,
    });
  };
  
  debugOwnership();
}, [video]);
```

---

## Expected Console Output (Success Case)

```
🔍 isMediaOwner check: {
  currentUserId: "507f1f77bcf86cd799439011",
  uploadedById: "507f1f77bcf86cd799439011",
  isOwner: true,
  currentUserIdType: "string",
  uploadedByIdType: "string",
  uploadedByValue: "507f1f77bcf86cd799439011",
  hasAuthorInfo: false,
  hasAuthor: true
}
```

---

## Expected Console Output (Failure Case)

```
🔍 isMediaOwner check: {
  currentUserId: "507f1f77bcf86cd799439011",
  uploadedById: "507f191e810c19729de860ea",  // ← Different ID!
  isOwner: false,  // ← This is why delete doesn't show
  ...
}
```

---

## Next Steps

1. Run the diagnostic steps above
2. Check console logs for ownership comparison
3. Verify user IDs match exactly
4. If IDs don't match, check:
   - Backend returns correct `uploadedBy` field
   - User is stored correctly after login
   - Media item has correct ownership information

---

**If issue persists after debugging, share:**
- Console logs from ownership check
- User object structure
- Media item structure
- Backend response structure

