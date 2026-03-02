# Backend Edit Profile Dynamic UI Specification

## Overview

This document specifies the backend API endpoints and response formats required to support a dynamic Edit Profile UI. The frontend will dynamically render profile settings based on the backend response, replacing hardcoded content.

## Base URL

All endpoints use the base URL: `https://jevahapp-backend.onrender.com`

## Authentication

All endpoints require Bearer token authentication in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Get Profile Settings Configuration

### Endpoint
```
GET /api/user/profile/settings-config
```

### Purpose
Returns the dynamic configuration for the Edit Profile UI, including available settings, their current values, and metadata for rendering.

### Response Format

```json
{
  "success": true,
  "data": {
    "profileImage": {
      "type": "image",
      "currentValue": "https://cdn.example.com/avatars/user123.jpg",
      "uploadEndpoint": "/api/user/profile/upload-avatar",
      "maxSizeBytes": 5242880,
      "allowedFormats": ["jpg", "jpeg", "png", "webp"],
      "previewUrl": "https://cdn.example.com/avatars/user123_thumb.jpg"
    },
    "name": {
      "type": "editable_text",
      "currentValue": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "fieldType": "name", // "name" indicates firstName + lastName fields
      "maxLength": {
        "firstName": 50,
        "lastName": 50
      },
      "updateEndpoint": "/api/user/profile/update-name"
    },
    "profileLock": {
      "type": "toggle",
      "currentValue": false,
      "label": "Profile lock",
      "description": "When enabled, only approved followers can see your profile",
      "updateEndpoint": "/api/user/profile/update-lock",
      "enabled": true // Whether this setting is available/enabled
    },
    "liveSettings": {
      "type": "toggle",
      "currentValue": false,
      "label": "Live settings",
      "description": "Configure your live streaming preferences",
      "updateEndpoint": "/api/user/profile/update-live-settings",
      "enabled": false, // Currently not available - UI should show but disable
      "comingSoon": true // Indicates this feature is coming soon
    },
    "pushNotifications": {
      "type": "toggle",
      "currentValue": true,
      "label": "Push notifications",
      "description": "Receive push notifications for important updates",
      "updateEndpoint": "/api/user/profile/update-push-notifications",
      "enabled": true
    },
    "recommendationSettings": {
      "type": "toggle",
      "currentValue": true,
      "label": "Recommendation settings",
      "description": "Allow content recommendations based on your preferences",
      "updateEndpoint": "/api/user/profile/update-recommendations",
      "enabled": true
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## 2. Get Current User Profile

### Endpoint
```
GET /api/user/profile
```

### Purpose
Returns the current user's profile information including avatar, name, and all settings values.

### Response Format

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "avatar": "https://cdn.example.com/avatars/user123.jpg",
      "avatarUpload": "https://cdn.example.com/avatars/user123_original.jpg",
      "bio": "Software developer passionate about technology",
      "section": "adult",
      "role": "learner",
      "settings": {
        "profileLock": false,
        "liveSettings": false,
        "pushNotifications": true,
        "recommendationSettings": true
      },
      "isProfileComplete": true,
      "isEmailVerified": true,
      "isOnline": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T14:22:00Z"
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

---

## 3. Upload/Update Profile Avatar

### Endpoint
```
POST /api/user/profile/upload-avatar
```

### Purpose
Uploads a new profile image and updates the user's avatar.

### Request

**Content-Type:** `multipart/form-data`

**Form Data:**
- `avatar` (file): Image file (jpg, jpeg, png, webp)
  - Max size: 5MB
  - Recommended dimensions: 400x400px minimum, square aspect ratio

### Response Format

```json
{
  "success": true,
  "data": {
    "avatar": "https://cdn.example.com/avatars/user123_new.jpg",
    "avatarUpload": "https://cdn.example.com/avatars/user123_new_original.jpg",
    "previewUrl": "https://cdn.example.com/avatars/user123_new_thumb.jpg",
    "message": "Avatar uploaded successfully"
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": "File too large. Maximum size is 5MB",
  "code": "FILE_TOO_LARGE"
}
```

```json
{
  "success": false,
  "error": "Invalid file format. Allowed formats: jpg, jpeg, png, webp",
  "code": "INVALID_FILE_FORMAT"
}
```

```json
{
  "success": false,
  "error": "Failed to upload avatar",
  "code": "UPLOAD_FAILED"
}
```

---

## 4. Update User Name

### Endpoint
```
PUT /api/user/profile/update-name
```

### Purpose
Updates the user's first name and/or last name.

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
- `firstName`: Optional string, max 50 characters, trimmed
- `lastName`: Optional string, max 50 characters, trimmed
- At least one field must be provided
- Cannot be empty strings after trimming
- Cannot contain only whitespace

### Response Format

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "updatedAt": "2024-01-20T15:30:00Z"
    },
    "message": "Name updated successfully"
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": "First name cannot exceed 50 characters",
  "code": "VALIDATION_ERROR",
  "field": "firstName"
}
```

```json
{
  "success": false,
  "error": "At least one name field must be provided",
  "code": "VALIDATION_ERROR"
}
```

---

## 5. Update Profile Lock

### Endpoint
```
PUT /api/user/profile/update-lock
```

### Purpose
Updates the profile lock setting. When enabled, only approved followers can view the user's profile.

### Request Body

```json
{
  "profileLock": true
}
```

**Validation Rules:**
- `profileLock`: Required boolean
- When set to `true`, the profile becomes private
- When set to `false`, the profile becomes public

### Response Format

```json
{
  "success": true,
  "data": {
    "settings": {
      "profileLock": true
    },
    "message": "Profile lock updated successfully"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Invalid profile lock value",
  "code": "VALIDATION_ERROR"
}
```

---

## 6. Update Live Settings (Placeholder)

### Endpoint
```
PUT /api/user/profile/update-live-settings
```

### Purpose
**Note:** This endpoint is a placeholder for future live streaming settings. Currently returns a "coming soon" response.

### Request Body

```json
{
  "liveSettings": true
}
```

### Response Format (Coming Soon)

```json
{
  "success": false,
  "error": "Live settings feature is coming soon",
  "code": "FEATURE_NOT_AVAILABLE",
  "comingSoon": true
}
```

---

## 7. Update Push Notifications

### Endpoint
```
PUT /api/user/profile/update-push-notifications
```

### Purpose
Updates the user's push notification preferences.

### Request Body

```json
{
  "pushNotifications": false
}
```

**Validation Rules:**
- `pushNotifications`: Required boolean

### Response Format

```json
{
  "success": true,
  "data": {
    "settings": {
      "pushNotifications": false
    },
    "message": "Push notification settings updated successfully"
  }
}
```

---

## 8. Update Recommendation Settings

### Endpoint
```
PUT /api/user/profile/update-recommendations
```

### Purpose
Updates the user's content recommendation preferences.

### Request Body

```json
{
  "recommendationSettings": false
}
```

**Validation Rules:**
- `recommendationSettings`: Required boolean

### Response Format

```json
{
  "success": true,
  "data": {
    "settings": {
      "recommendationSettings": false
    },
    "message": "Recommendation settings updated successfully"
  }
}
```

---

## 9. Combined Profile Update (Alternative)

### Endpoint
```
PUT /api/user/profile
```

### Purpose
Alternative endpoint that allows updating multiple profile fields in a single request.

### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "settings": {
    "profileLock": false,
    "pushNotifications": true,
    "recommendationSettings": true
  }
}
```

**Validation Rules:**
- All fields are optional
- Each field follows its individual validation rules
- Only provided fields will be updated

### Response Format

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "Doe",
      "settings": {
        "profileLock": false,
        "pushNotifications": true,
        "recommendationSettings": true
      },
      "updatedAt": "2024-01-20T16:00:00Z"
    },
    "message": "Profile updated successfully"
  }
}
```

---

## Data Models

### Profile Settings Configuration Object

```typescript
interface SettingConfig {
  type: "image" | "editable_text" | "toggle";
  currentValue: any;
  label?: string;
  description?: string;
  updateEndpoint?: string;
  enabled?: boolean;
  comingSoon?: boolean;
  
  // Image-specific fields
  uploadEndpoint?: string;
  maxSizeBytes?: number;
  allowedFormats?: string[];
  previewUrl?: string;
  
  // Text-specific fields
  fieldType?: "name" | "text" | "email" | "bio";
  maxLength?: number | { [key: string]: number };
  
  // Toggle-specific fields
  // (none additional beyond base fields)
}
```

### User Profile Object

```typescript
interface UserProfile {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string | null;
  avatarUpload?: string | null;
  bio?: string | null;
  section: string;
  role: string;
  settings: {
    profileLock: boolean;
    liveSettings: boolean;
    pushNotifications: boolean;
    recommendationSettings: boolean;
  };
  isProfileComplete: boolean;
  isEmailVerified: boolean;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## Frontend Implementation Guidelines

### Dynamic UI Rendering

1. **Fetch Configuration on Load:**
   - Call `GET /api/user/profile/settings-config` when the Edit Profile modal opens
   - Store the configuration in component state

2. **Render Settings Dynamically:**
   - Loop through the configuration object
   - Render each setting based on its `type`:
     - `image`: Show current avatar with upload button
     - `editable_text`: Show text input fields (for name: firstName + lastName)
     - `toggle`: Show switch component

3. **Handle Disabled Settings:**
   - If `enabled: false`, render the UI element but disable interaction
   - If `comingSoon: true`, show a "Coming Soon" badge or indicator
   - Apply visual styling (opacity, disabled state) to indicate non-interactive state

4. **Update Operations:**
   - For each setting, use its `updateEndpoint` when the user makes changes
   - Handle success/error responses appropriately
   - Update local state and refresh configuration after successful updates

### Profile Image Upload Flow

1. User selects image from gallery/camera
2. Validate file (size, format) on frontend before upload
3. Call `POST /api/user/profile/upload-avatar` with FormData
4. On success, update avatar display immediately
5. Optionally refresh profile data to get updated URLs

### Name Update Flow

1. User edits firstName/lastName fields
2. On save/submit, call `PUT /api/user/profile/update-name`
3. Validate input (max length, not empty) before sending
4. Update local state on success
5. Show success message to user

### Toggle Settings Flow

1. User toggles a setting switch
2. Immediately update UI (optimistic update)
3. Call the setting's `updateEndpoint` (e.g., `/api/user/profile/update-lock`)
4. On error, revert toggle state and show error message
5. On success, confirm state is saved

### Live Settings Handling

- Render the toggle UI element
- Set `disabled={true}` or make it non-interactive
- Show "Coming Soon" indicator/badge
- Optionally show a tooltip explaining it's not yet available
- Do NOT call the update endpoint when user attempts to toggle

---

## Error Handling

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed (check `field` property if present)
- `UNAUTHORIZED`: Authentication required or token expired
- `FORBIDDEN`: User doesn't have permission
- `NOT_FOUND`: Resource not found
- `FILE_TOO_LARGE`: Uploaded file exceeds size limit
- `INVALID_FILE_FORMAT`: File format not supported
- `UPLOAD_FAILED`: File upload processing failed
- `FEATURE_NOT_AVAILABLE`: Feature is not yet implemented
- `NETWORK_ERROR`: Network request failed
- `SERVER_ERROR`: Internal server error

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "field": "fieldName" // Optional, for validation errors
}
```

---

## Backend Implementation Requirements

### Database Schema

The user model should include:

```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String,
  avatar: String, // URL to avatar image
  avatarUpload: String, // URL to original uploaded image
  settings: {
    profileLock: Boolean,
    liveSettings: Boolean, // Placeholder for future
    pushNotifications: Boolean,
    recommendationSettings: Boolean
  },
  // ... other user fields
}
```

### Profile Lock Logic

When `profileLock` is `true`:
- Profile should only be visible to:
  - The user themselves
  - Users who follow the profile AND have been approved (if approval system exists)
  - System administrators
- Public profile listings should exclude or show minimal info for locked profiles
- Content posted by locked profiles may have visibility restrictions

### Image Upload Processing

1. Validate file size (max 5MB)
2. Validate file format (jpg, jpeg, png, webp)
3. Process/resize image:
   - Create optimized version for avatar display (400x400px recommended)
   - Store original for future use
   - Generate thumbnail if needed
4. Upload to CDN/storage service (AWS S3, Cloudinary, etc.)
5. Store URLs in user document
6. Optionally delete old avatar images to save storage

### Settings Validation

- All toggle settings must be boolean values
- Profile lock changes should trigger appropriate access control updates
- Push notification settings should integrate with notification service
- Recommendation settings should integrate with recommendation engine (if applicable)

---

## Testing Scenarios

### Success Cases

1. ✅ Fetch settings configuration successfully
2. ✅ Upload valid avatar image
3. ✅ Update first name only
4. ✅ Update last name only
5. ✅ Update both first and last name
6. ✅ Toggle profile lock on
7. ✅ Toggle profile lock off
8. ✅ Toggle push notifications
9. ✅ Toggle recommendation settings
10. ✅ Update multiple fields in combined endpoint

### Error Cases

1. ❌ Upload image exceeding 5MB limit
2. ❌ Upload invalid image format
3. ❌ Update name with empty string
4. ❌ Update name exceeding character limit
5. ❌ Update settings without authentication
6. ❌ Attempt to update live settings (should return coming soon)
7. ❌ Network error handling
8. ❌ Server error handling

---

## Version History

- **v1.0.0** (2024-01-20): Initial specification
  - Basic profile settings endpoints
  - Avatar upload functionality
  - Name update functionality
  - Toggle settings for profile lock, notifications, recommendations
  - Live settings placeholder (coming soon)

---

## Notes for Backend Team

1. **Profile Lock Implementation:**
   - Ensure profile visibility queries check the `settings.profileLock` field
   - Implement follower approval system if not already in place
   - Update content visibility rules when profile lock is toggled

2. **Image Upload:**
   - Consider using image processing library (sharp, imagemagick) for resizing
   - Implement CDN integration for optimal delivery
   - Add image optimization (WebP conversion, compression)
   - Consider adding image moderation/validation

3. **Live Settings Future Implementation:**
   - Keep endpoint structure ready for future implementation
   - Document what settings will be available when feature launches
   - Consider streaming preferences, quality settings, privacy controls

4. **Performance:**
   - Cache user profile data appropriately
   - Optimize image upload endpoints for large files
   - Consider batch update endpoints for multiple setting changes

5. **Security:**
   - Validate all inputs server-side
   - Sanitize user-uploaded images
   - Implement rate limiting on update endpoints
   - Ensure proper authorization checks (users can only update their own profile)

