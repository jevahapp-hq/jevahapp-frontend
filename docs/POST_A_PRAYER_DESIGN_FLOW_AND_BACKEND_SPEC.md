# Post a Prayer - Complete Design Flow & Backend Integration Specification

## Table of Contents

1. [Overview](#overview)
2. [Design Flow & User Experience](#design-flow--user-experience)
3. [Frontend Implementation Flow](#frontend-implementation-flow)
4. [API Endpoints Specification](#api-endpoints-specification)
5. [Verse Integration](#verse-integration)
6. [Backend Refactoring Recommendations](#backend-refactoring-recommendations)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)
9. [Testing Checklist](#testing-checklist)

---

## Overview

The "Post a Prayer" feature allows users to create personalized prayer requests with customizable visual cards (colors and shapes) and optional Bible verse attachments. This document provides a complete specification for both frontend design flow and backend implementation requirements.

### Key Features

- **Customizable Prayer Cards**: 8 color options and 7 shape templates
- **Verse Integration**: Optional Bible verse text and reference
- **Real-time Preview**: Live preview of prayer card as user types
- **Edit Mode**: Ability to edit existing prayers
- **Validation**: Client-side and server-side validation
- **Optimistic Updates**: Immediate UI feedback with server sync

---

## Design Flow & User Experience

### 1. Entry Points

Users can access "Post a Prayer" from:
- **Prayer Wall Screen**: Floating action button or header button
- **Community Screen**: Navigation to Prayer Wall → Post Prayer
- **Direct Navigation**: Programmatic navigation with optional edit mode

### 2. Screen Layout & Components

```
┌─────────────────────────────────────┐
│  ← Back    Post a Prayer      ✕     │  ← AuthHeader
├─────────────────────────────────────┤
│                                       │
│  "Post a Prayer" (Title)             │
│  "And this is the confidence..."     │  ← Inspirational verse
│  - 1 John 5:14                       │
│                                       │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   [Prayer Card Preview]     │    │  ← Live preview card
│  │   Tap to write your prayer  │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                       │
│  [Post Prayer Button] (when typing)  │
│                                       │
│  ─────────────────────────────────    │
│                                       │
│  Color Selection:                    │
│  ⚫ ⚫ ⚫ ⚫ ⚫ ⚫ ⚫ ⚫  (horizontal)    │  ← Color picker
│                                       │
│  ─────────────────────────────────    │
│                                       │
│  Template Selection:                 │
│  [□] [○] [○] [□] [□] [~]  (horizontal) ← Shape picker
│                                       │
│  ─────────────────────────────────    │
│                                       │
│  Add Verse (Optional):               │  ← Verse section
│  ┌─────────────────────────────┐    │
│  │ Verse Text                  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Reference (e.g., John 3:16)  │    │
│  └─────────────────────────────┘    │
│  [Browse Bible]                     │  ← Verse browser button
│                                       │
└─────────────────────────────────────┘
```

### 3. User Flow Steps

#### Step 1: Initial State
- User lands on PostAPrayer screen
- Default color: Purple (#A16CE5)
- Default shape: Square
- Empty prayer text input
- "Tap to write your prayer" placeholder visible
- Post button hidden

#### Step 2: Typing Prayer Text
- User taps on preview card
- Text input becomes focused
- Placeholder disappears
- User types prayer text (max 2000 characters)
- Character count indicator (optional)
- Post button appears when text is entered

#### Step 3: Customization (Optional)
- User selects color from color picker
- Preview updates immediately
- User selects shape from template picker
- Preview updates immediately
- Changes are non-destructive (can switch back)

#### Step 4: Adding Verse (Optional)
- User taps "Add Verse" section
- Two input fields appear:
  - Verse Text: Full text of the Bible verse
  - Reference: Book, chapter, and verse (e.g., "John 3:16")
- User can:
  - Type manually
  - Use "Browse Bible" button to select from Bible reader
- Verse appears below prayer text in preview

#### Step 5: Posting Prayer
- User taps "Post Prayer" button
- Button shows loading state (spinner)
- Button disabled during submission
- On success:
  - Navigate to Prayer Wall
  - Show newly created prayer (highlighted)
  - Refresh prayer list
- On error:
  - Show error alert
  - Keep user on PostAPrayer screen
  - Allow retry

#### Step 6: Edit Mode (If Editing)
- Screen loads with existing prayer data
- All fields pre-populated
- Verse data loaded if exists
- "Update Prayer" button instead of "Post Prayer"
- Same validation and submission flow

### 4. Visual Design Elements

#### Color Palette
```typescript
const availableColors = [
  "#A16CE5", // Purple (default)
  "#1078B2", // Blue
  "#6360DE", // Indigo
  "#DFCC21", // Yellow
  "#FF69B4", // Pink
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Light Blue
];
```

#### Shape Templates
```typescript
const availableShapes = [
  { type: "rectangle", label: "Rectangle" },
  { type: "square", label: "Square" },
  { type: "square2", label: "Circle" },
  { type: "square3", label: "Circle 2" },
  { type: "square4", label: "Square 2" },
  { type: "scalloped", label: "Scalloped" },
];
```

#### Card Styling
- **Rectangle**: Full width, rounded corners, min height 120px
- **Square**: 156x156px, rounded corners, diagonal cut effect
- **Square2**: 183x183px, circular, diagonal cut effect
- **Square3**: 183x183px, circular, different diagonal cut
- **Square4**: 156x156px, rounded corners, triangle cut
- **Circle**: 160x160px, perfect circle
- **Scalloped**: 216x216px, decorative scalloped border

---

## Frontend Implementation Flow

### Component Architecture

```
PostAPrayer.tsx
├── State Management
│   ├── prayerText: string
│   ├── selectedColor: string
│   ├── selectedShape: ShapeType
│   ├── verseText: string
│   ├── verseReference: string
│   ├── isSubmitting: boolean
│   └── isEditMode: boolean
│
├── UI Components
│   ├── AuthHeader (back/cancel navigation)
│   ├── Preview Card (live preview)
│   ├── Color Picker (horizontal scroll)
│   ├── Shape Picker (horizontal scroll)
│   ├── Verse Input Section (optional)
│   └── Post Button (conditional render)
│
└── Logic Handlers
    ├── handlePost() - Main submission handler
    ├── validatePrayerForm() - Client-side validation
    └── getCardStyle() - Dynamic card styling
```

### Code Flow Diagram

```
User Action
    ↓
handlePost() triggered
    ↓
Client-side Validation
    ├── prayerText required & < 2000 chars
    ├── color valid hex format
    ├── shape valid enum value
    └── verse (if provided) has valid reference
    ↓
Validation Passed?
    ├── NO → Show error alert, stop
    └── YES → Continue
    ↓
Set isSubmitting = true
    ↓
Check Edit Mode
    ├── Edit Mode → communityAPI.updatePrayer()
    └── Create Mode → communityAPI.createPrayer()
    ↓
API Call
    ├── Success
    │   ├── Update local state (optimistic)
    │   ├── Navigate to PrayerWallScreen
    │   ├── Pass refresh=true param
    │   └── Pass highlightPrayerId param
    └── Error
        ├── Show error alert
        └── Keep user on screen
    ↓
Set isSubmitting = false
```

### Key Functions

#### 1. handlePost()
```typescript
const handlePost = async () => {
  // 1. Basic validation
  if (!prayerText.trim()) {
    Alert.alert("Error", "Please enter your prayer text");
    return;
  }

  // 2. Form validation
  const validation = validatePrayerForm({
    prayerText,
    color: selectedColor,
    shape: selectedShape,
    verse: verseText || verseReference
      ? { text: verseText, reference: verseReference }
      : undefined,
  });

  if (!validation.valid) {
    Alert.alert("Validation Error", validation.errors.join("\n"));
    return;
  }

  // 3. Set loading state
  setIsSubmitting(true);

  try {
    // 4. Prepare request payload
    const prayerData = {
      prayerText,
      color: selectedColor,
      shape: selectedShape,
      verse: verseText || verseReference
        ? { text: verseText, reference: verseReference }
        : undefined,
    };

    // 5. API call (create or update)
    const response = isEditMode && prayerId
      ? await communityAPI.updatePrayer(prayerId, prayerData)
      : await communityAPI.createPrayer(prayerData);

    // 6. Handle response
    if (response.success && response.data) {
      // Success: Navigate to prayer wall
      router.push({
        pathname: "/screens/PrayerWallScreen",
        params: {
          refresh: "true",
          highlightPrayerId: response.data._id,
        },
      });
    } else {
      // Error: Show alert
      Alert.alert("Error", response.error || "Failed to create prayer");
    }
  } catch (error: any) {
    Alert.alert("Error", error.message || "An error occurred");
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 2. Validation Logic
```typescript
const validatePrayerForm = (data: CreatePrayerRequest): ValidationResult => {
  const errors: string[] = [];

  // Prayer text validation
  if (!data.prayerText || data.prayerText.trim().length === 0) {
    errors.push("Prayer text is required");
  } else if (data.prayerText.length > 2000) {
    errors.push("Prayer text must be less than 2000 characters");
  }

  // Color validation
  if (data.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.color)) {
    errors.push("Invalid color format");
  }

  // Shape validation
  const validShapes = ["rectangle", "circle", "scalloped", "square", "square2", "square3", "square4"];
  if (data.shape && !validShapes.includes(data.shape)) {
    errors.push("Invalid shape");
  }

  // Verse validation
  if (data.verse?.reference && !data.verse.reference.trim()) {
    errors.push("Verse reference cannot be empty if verse text is provided");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
```

---

## API Endpoints Specification

### 1. Create Prayer Request

**Endpoint:** `POST /api/community/prayer-wall/create`

**Authentication:** Required (Bearer token)

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "prayerText": "Prayer for my job interview today. That I find favour in the sight of the employers",
  "verse": {
    "text": "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
    "reference": "Jeremiah 29:11"
  },
  "color": "#A16CE5",
  "shape": "square"
}
```

**Field Specifications:**
- `prayerText` (required): string, 1-2000 characters
- `verse` (optional): object
  - `text` (optional): string, verse text content
  - `reference` (optional): string, verse reference (e.g., "John 3:16")
- `color` (required): string, valid hex color code (#RRGGBB or #RGB)
- `shape` (required): string, one of: "rectangle", "circle", "scalloped", "square", "square2", "square3", "square4"

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "prayerText": "Prayer for my job interview today...",
    "verse": {
      "text": "For I know the plans I have for you...",
      "reference": "Jeremiah 29:11"
    },
    "color": "#A16CE5",
    "shape": "square",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860ea",
      "username": "abidemi_john",
      "firstName": "Abidemi",
      "lastName": "John",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  },
  "message": "Prayer created successfully"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "prayerText": "Prayer text is required",
    "color": "Invalid color format"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

### 2. Update Prayer Request

**Endpoint:** `PUT /api/community/prayer-wall/{prayerId}`

**Authentication:** Required (Bearer token)

**Authorization:** Only the creator can update their prayer

**Request Body:** (All fields optional - only send fields to update)
```json
{
  "prayerText": "Updated prayer text...",
  "color": "#1078B2",
  "shape": "circle",
  "verse": {
    "text": "Updated verse text",
    "reference": "John 3:16"
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "prayerText": "Updated prayer text...",
    "color": "#1078B2",
    "shape": "circle",
    "verse": {
      "text": "Updated verse text",
      "reference": "John 3:16"
    },
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Error Responses:**

**403 Forbidden:**
```json
{
  "success": false,
  "error": "You can only update your own prayers",
  "code": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Prayer not found",
  "code": "NOT_FOUND"
}
```

### 3. Get Prayer Request (for Edit Mode)

**Endpoint:** `GET /api/community/prayer-wall/{prayerId}`

**Authentication:** Required (Bearer token)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "prayerText": "Prayer for my job interview...",
    "verse": {
      "text": "For I know the plans I have for you...",
      "reference": "Jeremiah 29:11"
    },
    "color": "#A16CE5",
    "shape": "square",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 5,
    "commentsCount": 2,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860ea",
      "username": "abidemi_john",
      "firstName": "Abidemi",
      "lastName": "John",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }
}
```

---

## Verse Integration

### Verse Data Structure

```typescript
interface Verse {
  text?: string;      // Full verse text (optional)
  reference?: string; // Verse reference (e.g., "John 3:16")
}
```

### Verse Selection Flow

#### Option 1: Manual Entry
1. User types verse text in "Verse Text" field
2. User types reference in "Reference" field
3. Both fields are optional but recommended together

#### Option 2: Bible Browser Integration
1. User taps "Browse Bible" button
2. Navigate to Bible Reader Screen
3. User selects book → chapter → verse
4. Verse data auto-populates:
   - `verse.text` = selected verse text
   - `verse.reference` = "Book Chapter:Verse"
5. Return to PostAPrayer screen with verse data

### Verse Validation Rules

**Backend Validation:**
- If `verse.text` is provided, `verse.reference` should also be provided (recommended)
- If `verse.reference` is provided without `verse.text`, it's acceptable (reference-only)
- Verse reference format: "Book Chapter:Verse" or "Book Chapter:Verse-Verse"
- Validate verse reference format (optional but recommended)

**Frontend Validation:**
- If verse text is entered, recommend entering reference
- Reference format hint: "e.g., John 3:16"

### Verse Display in Prayer Card

When a verse is attached:
- Verse appears below prayer text
- Verse text in italic or different font style
- Reference displayed separately (e.g., "- Jeremiah 29:11")
- Verse styling matches card color theme

---

## Backend Refactoring Recommendations

### 1. Database Schema

#### Prayer Request Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId, // Reference to User
  prayerText: String, // Required, 1-2000 chars
  verse: {
    text: String, // Optional
    reference: String // Optional (e.g., "John 3:16")
  },
  color: String, // Required, hex color code
  shape: String, // Required, enum: rectangle|circle|scalloped|square|square2|square3|square4
  createdAt: Date,
  updatedAt: Date,
  likesCount: Number, // Default: 0
  commentsCount: Number, // Default: 0
  // Indexes
  indexes: [
    { userId: 1 },
    { createdAt: -1 },
    { "verse.reference": 1 } // For verse-based searches
  ]
}
```

### 2. API Route Structure

**Recommended Structure:**
```
/api/community/prayer-wall/
├── POST   /create              → Create prayer
├── GET    /                    → List prayers (paginated)
├── GET    /:prayerId           → Get single prayer
├── PUT    /:prayerId           → Update prayer
├── DELETE /:prayerId           → Delete prayer
├── POST   /:prayerId/like      → Like/unlike prayer
├── GET    /:prayerId/comments  → Get comments
├── POST   /:prayerId/comments  → Add comment
└── GET    /search              → Search prayers (AI-enhanced)
```

### 3. Controller Implementation

#### Create Prayer Controller
```javascript
async createPrayer(req, res) {
  try {
    // 1. Extract user ID from token
    const userId = req.user._id;

    // 2. Validate request body
    const { prayerText, verse, color, shape } = req.body;
    
    // Validation
    if (!prayerText || prayerText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Prayer text is required",
        code: "VALIDATION_ERROR"
      });
    }

    if (prayerText.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Prayer text must be less than 2000 characters",
        code: "VALIDATION_ERROR"
      });
    }

    if (!color || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return res.status(400).json({
        success: false,
        error: "Valid color is required",
        code: "VALIDATION_ERROR"
      });
    }

    const validShapes = ["rectangle", "circle", "scalloped", "square", "square2", "square3", "square4"];
    if (!shape || !validShapes.includes(shape)) {
      return res.status(400).json({
        success: false,
        error: "Valid shape is required",
        code: "VALIDATION_ERROR"
      });
    }

    // 3. Validate verse (if provided)
    if (verse) {
      if (verse.text && verse.text.length > 2000) {
        return res.status(400).json({
          success: false,
          error: "Verse text must be less than 2000 characters",
          code: "VALIDATION_ERROR"
        });
      }
      // Optional: Validate verse reference format
      if (verse.reference && !/^[A-Za-z\s]+ \d+:\d+(-\d+)?$/.test(verse.reference)) {
        // Warning: Invalid format but allow it (flexible)
      }
    }

    // 4. Create prayer document
    const prayer = await Prayer.create({
      userId,
      prayerText: prayerText.trim(),
      verse: verse ? {
        text: verse.text?.trim(),
        reference: verse.reference?.trim()
      } : undefined,
      color,
      shape,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 5. Populate author information
    await prayer.populate({
      path: 'userId',
      select: 'username firstName lastName avatarUrl'
    });

    // 6. Format response
    const response = {
      _id: prayer._id,
      userId: prayer.userId._id,
      prayerText: prayer.prayerText,
      verse: prayer.verse,
      color: prayer.color,
      shape: prayer.shape,
      createdAt: prayer.createdAt,
      updatedAt: prayer.updatedAt,
      likesCount: prayer.likesCount,
      commentsCount: prayer.commentsCount,
      userLiked: false, // Current user hasn't liked yet
      author: {
        _id: prayer.userId._id,
        username: prayer.userId.username,
        firstName: prayer.userId.firstName,
        lastName: prayer.userId.lastName,
        avatarUrl: prayer.userId.avatarUrl
      }
    };

    // 7. Return success response
    res.status(201).json({
      success: true,
      data: response,
      message: "Prayer created successfully"
    });

  } catch (error) {
    console.error("Error creating prayer:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

#### Update Prayer Controller
```javascript
async updatePrayer(req, res) {
  try {
    const { prayerId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    // 1. Find prayer
    const prayer = await Prayer.findById(prayerId);
    if (!prayer) {
      return res.status(404).json({
        success: false,
        error: "Prayer not found",
        code: "NOT_FOUND"
      });
    }

    // 2. Check authorization
    if (prayer.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only update your own prayers",
        code: "FORBIDDEN"
      });
    }

    // 3. Validate updates
    if (updates.prayerText !== undefined) {
      if (!updates.prayerText || updates.prayerText.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Prayer text cannot be empty",
          code: "VALIDATION_ERROR"
        });
      }
      if (updates.prayerText.length > 2000) {
        return res.status(400).json({
          success: false,
          error: "Prayer text must be less than 2000 characters",
          code: "VALIDATION_ERROR"
        });
      }
      prayer.prayerText = updates.prayerText.trim();
    }

    if (updates.color !== undefined) {
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(updates.color)) {
        return res.status(400).json({
          success: false,
          error: "Invalid color format",
          code: "VALIDATION_ERROR"
        });
      }
      prayer.color = updates.color;
    }

    if (updates.shape !== undefined) {
      const validShapes = ["rectangle", "circle", "scalloped", "square", "square2", "square3", "square4"];
      if (!validShapes.includes(updates.shape)) {
        return res.status(400).json({
          success: false,
          error: "Invalid shape",
          code: "VALIDATION_ERROR"
        });
      }
      prayer.shape = updates.shape;
    }

    if (updates.verse !== undefined) {
      if (updates.verse === null) {
        // Remove verse
        prayer.verse = undefined;
      } else {
        // Update verse
        prayer.verse = {
          text: updates.verse.text?.trim(),
          reference: updates.verse.reference?.trim()
        };
      }
    }

    // 4. Update timestamp
    prayer.updatedAt = new Date();

    // 5. Save prayer
    await prayer.save();

    // 6. Populate author
    await prayer.populate({
      path: 'userId',
      select: 'username firstName lastName avatarUrl'
    });

    // 7. Format and return response
    const response = {
      _id: prayer._id,
      userId: prayer.userId._id,
      prayerText: prayer.prayerText,
      verse: prayer.verse,
      color: prayer.color,
      shape: prayer.shape,
      createdAt: prayer.createdAt,
      updatedAt: prayer.updatedAt,
      likesCount: prayer.likesCount,
      commentsCount: prayer.commentsCount,
      userLiked: false, // Check if current user liked
      author: {
        _id: prayer.userId._id,
        username: prayer.userId.username,
        firstName: prayer.userId.firstName,
        lastName: prayer.userId.lastName,
        avatarUrl: prayer.userId.avatarUrl
      }
    };

    res.status(200).json({
      success: true,
      data: response,
      message: "Prayer updated successfully"
    });

  } catch (error) {
    console.error("Error updating prayer:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

### 4. Middleware Recommendations

#### Authentication Middleware
```javascript
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "UNAUTHORIZED"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid token",
        code: "UNAUTHORIZED"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
      code: "UNAUTHORIZED"
    });
  }
};
```

#### Validation Middleware
```javascript
const validatePrayerRequest = (req, res, next) => {
  const { prayerText, color, shape } = req.body;
  const errors = [];

  if (!prayerText || prayerText.trim().length === 0) {
    errors.push("Prayer text is required");
  } else if (prayerText.length > 2000) {
    errors.push("Prayer text must be less than 2000 characters");
  }

  if (!color || !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    errors.push("Valid color is required");
  }

  const validShapes = ["rectangle", "circle", "scalloped", "square", "square2", "square3", "square4"];
  if (!shape || !validShapes.includes(shape)) {
    errors.push("Valid shape is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: errors
    });
  }

  next();
};
```

### 5. Response Format Standardization

**Standardize all responses:**
```javascript
// Success Response
{
  success: true,
  data: { ... },
  message?: string
}

// Error Response
{
  success: false,
  error: string,
  code: string,
  details?: any
}
```

### 6. Error Handling Best Practices

1. **Consistent Error Codes:**
   - `VALIDATION_ERROR` - Request validation failed
   - `UNAUTHORIZED` - Authentication required
   - `FORBIDDEN` - Insufficient permissions
   - `NOT_FOUND` - Resource not found
   - `INTERNAL_ERROR` - Server error

2. **Error Logging:**
   - Log all errors with context
   - Include user ID, request path, and error details
   - Use structured logging (e.g., Winston, Pino)

3. **Error Messages:**
   - User-friendly messages
   - Avoid exposing internal details
   - Include actionable guidance

---

## Data Models

### Frontend Types (TypeScript)

```typescript
interface CreatePrayerRequest {
  prayerText: string;
  verse?: {
    text: string;
    reference: string;
  };
  color: string;
  shape: "rectangle" | "circle" | "scalloped" | "square" | "square2" | "square3" | "square4";
  anonymous?: boolean;
  media?: string[];
}

interface PrayerRequest {
  _id: string;
  userId: string;
  prayerText: string;
  verse?: {
    text: string;
    reference: string;
  };
  color: string;
  shape: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}
```

### Backend Schema (Mongoose/Sequelize)

```javascript
// Mongoose Example
const prayerSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  prayerText: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  },
  verse: {
    text: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  color: {
    type: String,
    required: true,
    match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  shape: {
    type: String,
    required: true,
    enum: ['rectangle', 'circle', 'scalloped', 'square', 'square2', 'square3', 'square4']
  },
  likesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
prayerSchema.index({ userId: 1, createdAt: -1 });
prayerSchema.index({ 'verse.reference': 1 });
prayerSchema.index({ createdAt: -1 });
```

---

## Error Handling

### Frontend Error Handling

```typescript
// In communityAPI.ts
async createPrayer(prayerData: CreatePrayerRequest): Promise<ApiResponse<PrayerRequest>> {
  try {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/api/community/prayer-wall/create`, {
      method: "POST",
      headers,
      body: JSON.stringify(prayerData),
    });

    const result = await this.handleResponse<PrayerRequest>(response);
    return result;
  } catch (error) {
    console.error("Error creating prayer:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create prayer",
      code: "NETWORK_ERROR",
    };
  }
}
```

### Backend Error Handling

```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: Object.values(err.errors).map(e => e.message)
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
      code: "UNAUTHORIZED"
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: "Internal server error",
    code: "INTERNAL_ERROR"
  });
});
```

---

## Testing Checklist

### Frontend Testing

- [ ] User can type prayer text
- [ ] Character limit (2000) is enforced
- [ ] Color selection updates preview
- [ ] Shape selection updates preview
- [ ] Verse text and reference can be entered
- [ ] Post button appears when text is entered
- [ ] Post button shows loading state
- [ ] Validation errors are displayed
- [ ] Success navigation works
- [ ] Error alerts are shown on failure
- [ ] Edit mode loads existing prayer data
- [ ] Update prayer works correctly

### Backend Testing

- [ ] Create prayer with all fields
- [ ] Create prayer without verse
- [ ] Create prayer with verse text only
- [ ] Create prayer with verse reference only
- [ ] Create prayer with both verse fields
- [ ] Validation errors for invalid data
- [ ] Authentication required
- [ ] Update prayer (authorized user)
- [ ] Update prayer (unauthorized user)
- [ ] Update prayer with partial fields
- [ ] Remove verse from prayer
- [ ] Get single prayer for edit
- [ ] Error handling for missing prayer
- [ ] Response format consistency

### Integration Testing

- [ ] End-to-end prayer creation flow
- [ ] End-to-end prayer update flow
- [ ] Verse integration with Bible browser
- [ ] Prayer appears in prayer wall after creation
- [ ] Updated prayer reflects changes
- [ ] Error scenarios (network, validation, auth)

---

## Implementation Priority

### Phase 1: Core Functionality (MVP)
1. ✅ Create prayer endpoint
2. ✅ Update prayer endpoint
3. ✅ Basic validation
4. ✅ Authentication
5. ✅ Response formatting

### Phase 2: Verse Integration
1. Verse data structure
2. Verse validation
3. Verse display in responses
4. Bible browser integration (frontend)

### Phase 3: Enhancements
1. Advanced validation
2. Error handling improvements
3. Performance optimization
4. Caching (if needed)
5. Analytics tracking

---

## Summary

This specification provides a complete guide for implementing the "Post a Prayer" feature with seamless frontend-backend integration. Key points:

1. **Design Flow**: Clear user journey from entry to submission
2. **API Specification**: Detailed endpoint requirements with examples
3. **Verse Integration**: Flexible verse attachment system
4. **Backend Refactoring**: Recommended structure and implementation
5. **Error Handling**: Consistent error responses
6. **Testing**: Comprehensive testing checklist

The backend should implement:
- Standardized response format
- Proper validation
- Authorization checks
- Error handling
- Verse support (optional but recommended)

The frontend expects:
- Consistent API responses
- Proper error messages
- User-friendly validation
- Optimistic updates
- Seamless navigation

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** Frontend & Backend Teams

