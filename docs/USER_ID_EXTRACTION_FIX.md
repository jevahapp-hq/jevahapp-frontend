# User ID Extraction Fix - Delete Option Issue

## 🚨 Problem Identified

From console logs:
```
currentUserId: ""  // ← EMPTY!
uploadedById: "68b607db0e67a29dc6452526"  // ← EXISTS
isOwner: false  // ← False because currentUserId is empty
```

**Root Cause**: User ID is not being extracted from AsyncStorage correctly.

---

## ✅ Fix Applied

### 1. Added JWT Token Parsing Fallback

**File**: `app/utils/mediaDeleteAPI.ts`

**Added**: Extract `userId` from JWT token if not found in AsyncStorage:

```typescript
// Fallback: Extract from JWT token
if (!currentUserId && token) {
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      if (payload.userId || payload.user_id || payload.id) {
        currentUserId = String(payload.userId || payload.user_id || payload.id).trim();
        console.log("✅ Extracted user ID from JWT token:", currentUserId);
      }
    }
  } catch (tokenError) {
    console.warn("⚠️ Failed to extract user ID from token:", tokenError);
  }
}
```

### 2. Enhanced Logging

**Added**: More detailed logging to see what's in the user object:

```typescript
console.log("🔍 isMediaOwner check:", {
  // ... existing fields
  userObject: user ? {
    keys: Object.keys(user),
    hasId: !!(user._id || user.id || user.userId),
    idValue: user._id || user.id || user.userId,
  } : null,
});
```

### 3. Fallback Behavior

**Updated**: If token exists but no user ID found, return `true` (show delete option) and let backend verify:

```typescript
if (!currentUserId && token) {
  // Return true to show delete option - backend will verify actual ownership
  return true;
}
```

---

## 🔍 Debugging Steps

### Step 1: Check What's in AsyncStorage

Add this temporary code to check user storage:

```typescript
// In your component or console
const userStr = await AsyncStorage.getItem("user");
const user = userStr ? JSON.parse(userStr) : null;
console.log("🔍 User in AsyncStorage:", {
  exists: !!user,
  keys: user ? Object.keys(user) : [],
  _id: user?._id,
  id: user?.id,
  userId: user?.userId,
  fullUser: user,
});
```

### Step 2: Check JWT Token

Add this to extract user ID from token:

```typescript
const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("userToken");
if (token) {
  try {
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));
    console.log("🔍 JWT Token Payload:", {
      userId: payload.userId,
      user_id: payload.user_id,
      id: payload.id,
      allKeys: Object.keys(payload),
    });
  } catch (e) {
    console.error("Failed to parse token:", e);
  }
}
```

### Step 3: Verify After Login

After login, check if user is stored correctly:

```typescript
// After login completes
const userStr = await AsyncStorage.getItem("user");
console.log("✅ User stored after login:", {
  exists: !!userStr,
  parsed: userStr ? JSON.parse(userStr) : null,
});
```

---

## 🎯 Expected Behavior After Fix

### Scenario 1: User ID in AsyncStorage

```
currentUserId: "68b607db0e67a29dc6452526"  // ← From AsyncStorage
uploadedById: "68b607db0e67a29dc6452526"  // ← From media item
isOwner: true  // ← Match!
```

### Scenario 2: User ID in JWT Token Only

```
currentUserId: "68b607db0e67a29dc6452526"  // ← Extracted from JWT
uploadedById: "68b607db0e67a29dc6452526"  // ← From media item
isOwner: true  // ← Match!
```

### Scenario 3: No User ID Found But Token Exists

```
currentUserId: ""  // ← Not found
uploadedById: "68b607db0e67a29dc6452526"
isOwner: true  // ← Returns true, backend will verify
```

---

## 🔧 Additional Fixes Needed

### Check 1: User Storage After Login

**File**: `app/services/authService.ts` line 189

**Verify**: User object has `_id` field:

```typescript
if (data.user) {
  console.log("🔍 Login user data structure:", {
    hasId: !!(data.user._id || data.user.id),
    idValue: data.user._id || data.user.id,
    allKeys: Object.keys(data.user),
  });
  await AsyncStorage.setItem("user", JSON.stringify(data.user));
}
```

### Check 2: User Profile Fetch

**File**: `app/hooks/useUserProfile.ts`

**Verify**: Profile fetch returns user with `_id`:

```typescript
if (userData && userData.user) {
  const userWithSection = {
    ...userData.user,
    id: userData.user.id || userData.user._id || "",  // ← Ensure _id is preserved
    // ...
  };
  await AsyncStorage.setItem("user", JSON.stringify(userWithSection));
}
```

---

## ✅ Testing Checklist

- [ ] Login and check console for user storage
- [ ] Verify user object has `_id` field
- [ ] Check JWT token payload for `userId`
- [ ] Open action modal on uploaded content
- [ ] Check console logs for ownership check
- [ ] Verify `currentUserId` is not empty
- [ ] Verify `isOwner` is `true` for your content

---

## 🚨 If Still Not Working

1. **Check Backend Response**: Verify backend returns user with `_id` field in login response
2. **Check AsyncStorage**: Verify user is stored correctly after login
3. **Check JWT Token**: Verify token contains `userId` field
4. **Check Media Item**: Verify `uploadedBy` field exists and matches your user ID

---

**Last Updated**: 2024-12-19  
**Status**: ✅ Fix Applied - Testing Required



