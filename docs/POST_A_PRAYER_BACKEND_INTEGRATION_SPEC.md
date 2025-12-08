# Post a Prayer - Backend Integration Specification

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Data Models](#data-models)
6. [Validation Rules](#validation-rules)
7. [Error Handling](#error-handling)
8. [Backend Implementation Guide](#backend-implementation-guide)
9. [Frontend Integration Points](#frontend-integration-points)
10. [Testing Checklist](#testing-checklist)

---

## Overview

The "Post a Prayer" feature allows users to create prayer requests with:
- Customizable prayer text (up to 2000 characters)
- Optional Bible verse with text and reference
- Customizable card color (hex color codes)
- Customizable card shape (7 different shapes)
- Real-time preview of the prayer card

The frontend sends prayer data to the backend, which stores it and returns the created prayer with all necessary metadata for display.

---

## User Flow

### Frontend Flow

1. **User opens Post a Prayer screen**
   - Default verse text: "And this is the confidence that we have toward Him, that if we ask anything according to His will, He hears us."
   - Default reference: "1 John 5:14"
   - Default color: Purple (#A16CE5)
   - Default shape: Square

2. **User edits prayer content**
   - Types prayer text in the preview card (editable TextInput)
   - Optionally edits verse text (editable TextInput)
   - Optionally edits verse reference (editable TextInput)
   - Selects color from color picker
   - Selects shape from template picker
   - Sees real-time preview

3. **User clicks "Post Prayer" button**
   - Button appears when any content is entered (prayer text, verse text, or reference)
   - Frontend validates form client-side
   - Sends POST request to `/api/community/prayer-wall/create`
   - Shows loading state on button

4. **Backend processes request**
   - Validates authentication token
   - Validates request body
   - Creates prayer document in database
   - Populates author information
   - Returns created prayer with full details

5. **Frontend handles response**
   - On success: Navigates to Prayer Wall with `refresh=true` and `highlightPrayerId`
   - On error: Shows error alert, keeps user on Post a Prayer screen

### Backend Flow

```
User Request → Authentication Middleware → Validation → Database → Response
     ↓                ↓                      ↓            ↓          ↓
  POST /create    Extract userId      Validate fields  Save prayer  Return JSON
```

---

## API Endpoints

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
  "shape": "square",
  "anonymous": false
}
```

**Field Specifications:**

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|-------------|
| `prayerText` | string | Yes | The prayer content | 1-2000 characters, trimmed |
| `verse` | object | No | Bible verse information | - |
| `verse.text` | string | No* | Full verse text | Max 500 characters if provided |
| `verse.reference` | string | No* | Verse reference (e.g., "John 3:16") | Max 50 characters if provided |
| `color` | string | Yes | Hex color code for card | Valid hex format (#RRGGBB or #RGB) |
| `shape` | string | Yes | Card shape type | One of: "rectangle", "circle", "scalloped", "square", "square2", "square3", "square4" |
| `anonymous` | boolean | No | Whether prayer is anonymous | Default: false |

*Note: If `verse` object is provided, at least one of `text` or `reference` should be present.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "prayerText": "Prayer for my job interview today. That I find favour in the sight of the employers",
    "verse": {
      "text": "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.",
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
    },
    "anonymous": false
  },
  "message": "Prayer created successfully"
}
```

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "Prayer text is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "prayerText",
    "message": "Prayer text cannot be empty"
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
  "error": "Failed to create prayer",
  "code": "INTERNAL_ERROR"
}
```

---

### 2. Update Prayer Request

**Endpoint:** `PUT /api/community/prayer-wall/:prayerId`

**Authentication:** Required (Bearer token)

**Authorization:** User must own the prayer

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**
- `prayerId` (string, required): MongoDB ObjectId of the prayer

**Request Body:** (Same as Create Prayer, all fields optional)
```json
{
  "prayerText": "Updated prayer text...",
  "verse": {
    "text": "Updated verse text",
    "reference": "John 3:16"
  },
  "color": "#1078B2",
  "shape": "circle"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "prayerText": "Updated prayer text...",
    "verse": {
      "text": "Updated verse text",
      "reference": "John 3:16"
    },
    "color": "#1078B2",
    "shape": "circle",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z",
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

---

### 3. Get Single Prayer (for Edit Mode)

**Endpoint:** `GET /api/community/prayer-wall/:prayerId`

**Authentication:** Optional (for `userLiked` field)

**URL Parameters:**
- `prayerId` (string, required): MongoDB ObjectId of the prayer

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

## Request/Response Formats

### Standard Response Format

All endpoints follow this response structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}
```

### Success Response
- `success`: Always `true`
- `data`: The response payload (prayer object, array, etc.)
- `message`: Optional success message

### Error Response
- `success`: Always `false`
- `error`: Human-readable error message
- `code`: Machine-readable error code (e.g., "VALIDATION_ERROR", "UNAUTHORIZED")
- `details`: Optional additional error details

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
  anonymous?: boolean;
}
```

### Backend Schema (Mongoose Example)

```javascript
const mongoose = require('mongoose');

const verseSchema = new mongoose.Schema({
  text: {
    type: String,
    maxlength: 500,
    trim: true
  },
  reference: {
    type: String,
    maxlength: 50,
    trim: true
  }
}, { _id: false });

const prayerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
    type: verseSchema,
    default: null
  },
  color: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Invalid color format. Must be a valid hex color code.'
    }
  },
  shape: {
    type: String,
    required: true,
    enum: ['rectangle', 'circle', 'scalloped', 'square', 'square2', 'square3', 'square4']
  },
  anonymous: {
    type: Boolean,
    default: false
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
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
prayerSchema.index({ userId: 1, createdAt: -1 });
prayerSchema.index({ createdAt: -1 });
prayerSchema.index({ likesCount: -1 });
prayerSchema.index({ commentsCount: -1 });

// Virtual for author population
prayerSchema.virtual('author', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

module.exports = mongoose.model('Prayer', prayerSchema);
```

### Backend Schema (Sequelize Example)

```javascript
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prayer = sequelize.define('Prayer', {
    _id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: '_id'
      },
      index: true
    },
    prayerText: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000]
      }
    },
    verseText: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500]
      }
    },
    verseReference: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    shape: {
      type: DataTypes.ENUM('rectangle', 'circle', 'scalloped', 'square', 'square2', 'square3', 'square4'),
      allowNull: false
    },
    anonymous: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['createdAt'] },
      { fields: ['likesCount'] },
      { fields: ['commentsCount'] }
    ]
  });

  Prayer.associate = (models) => {
    Prayer.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });
  };

  return Prayer;
};
```

---

## Validation Rules

### Backend Validation Checklist

#### Prayer Text
- ✅ Required field
- ✅ Must be non-empty after trimming whitespace
- ✅ Minimum length: 1 character
- ✅ Maximum length: 2000 characters
- ✅ Trim leading/trailing whitespace

#### Verse Object
- ✅ Optional field
- ✅ If provided, must be an object
- ✅ If `verse.text` is provided:
  - Maximum length: 500 characters
  - Trim whitespace
- ✅ If `verse.reference` is provided:
  - Maximum length: 50 characters
  - Trim whitespace
- ✅ At least one of `verse.text` or `verse.reference` must be present if `verse` object is provided

#### Color
- ✅ Required field
- ✅ Must match hex color format: `#RRGGBB` or `#RGB`
- ✅ Valid regex: `/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/`
- ✅ Examples:
  - Valid: `#A16CE5`, `#1078B2`, `#6360DE`, `#DFCC21`, `#FF69B4`, `#FF6B6B`, `#4ECDC4`, `#45B7D1`
  - Invalid: `A16CE5` (missing #), `#GGGGGG` (invalid hex), `red` (not hex format)

#### Shape
- ✅ Required field
- ✅ Must be one of: `"rectangle"`, `"circle"`, `"scalloped"`, `"square"`, `"square2"`, `"square3"`, `"square4"`
- ✅ Case-sensitive

#### Anonymous
- ✅ Optional field
- ✅ Must be boolean if provided
- ✅ Default: `false`

### Validation Error Messages

The backend should return specific, user-friendly error messages:

| Validation Error | Error Message | Code |
|-----------------|--------------|------|
| Missing prayerText | "Prayer text is required" | VALIDATION_ERROR |
| Empty prayerText | "Prayer text cannot be empty" | VALIDATION_ERROR |
| prayerText too long | "Prayer text must be less than 2000 characters" | VALIDATION_ERROR |
| Invalid color format | "Valid color is required. Must be a hex color code (e.g., #A16CE5)" | VALIDATION_ERROR |
| Missing color | "Color is required" | VALIDATION_ERROR |
| Invalid shape | "Valid shape is required. Must be one of: rectangle, circle, scalloped, square, square2, square3, square4" | VALIDATION_ERROR |
| Missing shape | "Shape is required" | VALIDATION_ERROR |
| verse.text too long | "Verse text must be less than 500 characters" | VALIDATION_ERROR |
| verse.reference too long | "Verse reference must be less than 50 characters" | VALIDATION_ERROR |
| verse object empty | "If verse is provided, at least text or reference must be included" | VALIDATION_ERROR |

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or invalid token |
| `FORBIDDEN` | 403 | User doesn't have permission (e.g., updating another user's prayer) |
| `NOT_FOUND` | 404 | Prayer not found |
| `INTERNAL_ERROR` | 500 | Server error |
| `NETWORK_ERROR` | N/A | Network/connection error (handled by frontend) |

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "fieldName",
    "message": "Specific field error"
  }
}
```

### Error Handling Best Practices

1. **Always return consistent format**: Use the standard `ApiResponse` format
2. **Include error codes**: Help frontend handle errors programmatically
3. **User-friendly messages**: Avoid technical jargon
4. **Log server errors**: Log detailed errors server-side, but don't expose them to clients
5. **Validate early**: Validate request body before database operations
6. **Handle edge cases**: Empty strings, null values, type mismatches

---

## Backend Implementation Guide

### Step 1: Set Up Routes

```javascript
// routes/prayerWall.js
const express = require('express');
const router = express.Router();
const prayerController = require('../controllers/prayerController');
const { authenticate } = require('../middleware/auth');

// Create prayer (authenticated)
router.post('/create', authenticate, prayerController.createPrayer);

// Update prayer (authenticated, must own)
router.put('/:prayerId', authenticate, prayerController.updatePrayer);

// Get single prayer (optional auth for userLiked)
router.get('/:prayerId', prayerController.getPrayer);

module.exports = router;
```

### Step 2: Create Controller

```javascript
// controllers/prayerController.js
const Prayer = require('../models/Prayer');
const { validatePrayerData } = require('../validators/prayerValidator');

exports.createPrayer = async (req, res) => {
  try {
    // 1. Extract user ID from authenticated request
    const userId = req.user._id; // Set by auth middleware

    // 2. Validate request body
    const validation = validatePrayerData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.errors[0],
        code: 'VALIDATION_ERROR',
        details: validation.details
      });
    }

    // 3. Create prayer document
    const prayerData = {
      userId,
      prayerText: req.body.prayerText.trim(),
      color: req.body.color,
      shape: req.body.shape,
      anonymous: req.body.anonymous || false,
      verse: req.body.verse ? {
        text: req.body.verse.text?.trim() || null,
        reference: req.body.verse.reference?.trim() || null
      } : null,
      likesCount: 0,
      commentsCount: 0
    };

    const prayer = new Prayer(prayerData);
    await prayer.save();

    // 4. Populate author information
    await prayer.populate('author', 'username firstName lastName avatarUrl');

    // 5. Check if current user liked (for userLiked field)
    const userLiked = false; // Implement like checking logic if needed

    // 6. Return response
    res.status(200).json({
      success: true,
      data: {
        ...prayer.toObject(),
        userLiked
      },
      message: 'Prayer created successfully'
    });

  } catch (error) {
    console.error('Error creating prayer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prayer',
      code: 'INTERNAL_ERROR'
    });
  }
};

exports.updatePrayer = async (req, res) => {
  try {
    const { prayerId } = req.params;
    const userId = req.user._id;

    // 1. Find prayer
    const prayer = await Prayer.findById(prayerId);
    if (!prayer) {
      return res.status(404).json({
        success: false,
        error: 'Prayer not found',
        code: 'NOT_FOUND'
      });
    }

    // 2. Check ownership
    if (prayer.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own prayers',
        code: 'FORBIDDEN'
      });
    }

    // 3. Validate update data
    const updateData = {};
    if (req.body.prayerText !== undefined) {
      const trimmed = req.body.prayerText.trim();
      if (trimmed.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Prayer text cannot be empty',
          code: 'VALIDATION_ERROR'
        });
      }
      if (trimmed.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Prayer text must be less than 2000 characters',
          code: 'VALIDATION_ERROR'
        });
      }
      updateData.prayerText = trimmed;
    }

    if (req.body.color !== undefined) {
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(req.body.color)) {
        return res.status(400).json({
          success: false,
          error: 'Valid color is required. Must be a hex color code',
          code: 'VALIDATION_ERROR'
        });
      }
      updateData.color = req.body.color;
    }

    if (req.body.shape !== undefined) {
      const validShapes = ['rectangle', 'circle', 'scalloped', 'square', 'square2', 'square3', 'square4'];
      if (!validShapes.includes(req.body.shape)) {
        return res.status(400).json({
          success: false,
          error: 'Valid shape is required',
          code: 'VALIDATION_ERROR'
        });
      }
      updateData.shape = req.body.shape;
    }

    if (req.body.verse !== undefined) {
      if (req.body.verse === null) {
        updateData.verse = null;
      } else {
        const verseText = req.body.verse.text?.trim() || null;
        const verseReference = req.body.verse.reference?.trim() || null;
        
        if (!verseText && !verseReference) {
          return res.status(400).json({
            success: false,
            error: 'If verse is provided, at least text or reference must be included',
            code: 'VALIDATION_ERROR'
          });
        }

        if (verseText && verseText.length > 500) {
          return res.status(400).json({
            success: false,
            error: 'Verse text must be less than 500 characters',
            code: 'VALIDATION_ERROR'
          });
        }

        if (verseReference && verseReference.length > 50) {
          return res.status(400).json({
            success: false,
            error: 'Verse reference must be less than 50 characters',
            code: 'VALIDATION_ERROR'
          });
        }

        updateData.verse = {
          text: verseText,
          reference: verseReference
        };
      }
    }

    // 4. Update prayer
    Object.assign(prayer, updateData);
    await prayer.save();

    // 5. Populate author
    await prayer.populate('author', 'username firstName lastName avatarUrl');

    // 6. Return response
    res.status(200).json({
      success: true,
      data: prayer.toObject()
    });

  } catch (error) {
    console.error('Error updating prayer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prayer',
      code: 'INTERNAL_ERROR'
    });
  }
};

exports.getPrayer = async (req, res) => {
  try {
    const { prayerId } = req.params;
    const userId = req.user?._id; // Optional auth

    const prayer = await Prayer.findById(prayerId)
      .populate('author', 'username firstName lastName avatarUrl');

    if (!prayer) {
      return res.status(404).json({
        success: false,
        error: 'Prayer not found',
        code: 'NOT_FOUND'
      });
    }

    // Check if user liked (if authenticated)
    const userLiked = userId ? await checkUserLiked(prayerId, userId) : false;

    res.status(200).json({
      success: true,
      data: {
        ...prayer.toObject(),
        userLiked
      }
    });

  } catch (error) {
    console.error('Error getting prayer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prayer',
      code: 'INTERNAL_ERROR'
    });
  }
};
```

### Step 3: Create Validator

```javascript
// validators/prayerValidator.js
exports.validatePrayerData = (data) => {
  const errors = [];
  const details = {};

  // Prayer text validation
  if (!data.prayerText) {
    errors.push('Prayer text is required');
    details.prayerText = 'This field is required';
  } else {
    const trimmed = data.prayerText.trim();
    if (trimmed.length === 0) {
      errors.push('Prayer text cannot be empty');
      details.prayerText = 'Prayer text cannot be empty';
    } else if (trimmed.length > 2000) {
      errors.push('Prayer text must be less than 2000 characters');
      details.prayerText = `Current length: ${trimmed.length}, Maximum: 2000`;
    }
  }

  // Color validation
  if (!data.color) {
    errors.push('Color is required');
    details.color = 'This field is required';
  } else if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.color)) {
    errors.push('Valid color is required. Must be a hex color code (e.g., #A16CE5)');
    details.color = 'Invalid format. Expected: #RRGGBB or #RGB';
  }

  // Shape validation
  const validShapes = ['rectangle', 'circle', 'scalloped', 'square', 'square2', 'square3', 'square4'];
  if (!data.shape) {
    errors.push('Shape is required');
    details.shape = 'This field is required';
  } else if (!validShapes.includes(data.shape)) {
    errors.push(`Valid shape is required. Must be one of: ${validShapes.join(', ')}`);
    details.shape = `Invalid value: ${data.shape}`;
  }

  // Verse validation
  if (data.verse !== undefined && data.verse !== null) {
    if (typeof data.verse !== 'object') {
      errors.push('Verse must be an object');
      details.verse = 'Invalid type';
    } else {
      const verseText = data.verse.text?.trim() || null;
      const verseReference = data.verse.reference?.trim() || null;

      if (!verseText && !verseReference) {
        errors.push('If verse is provided, at least text or reference must be included');
        details.verse = 'At least one field required';
      }

      if (verseText && verseText.length > 500) {
        errors.push('Verse text must be less than 500 characters');
        details.verseText = `Current length: ${verseText.length}, Maximum: 500`;
      }

      if (verseReference && verseReference.length > 50) {
        errors.push('Verse reference must be less than 50 characters');
        details.verseReference = `Current length: ${verseReference.length}, Maximum: 50`;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    details
  };
};
```

### Step 4: Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'UNAUTHORIZED'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'INTERNAL_ERROR'
    });
  }
};
```

---

## Frontend Integration Points

### API Base URL

The frontend uses the base URL from environment configuration:
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

### Request Headers

The frontend automatically includes:
```typescript
{
  'Authorization': `Bearer ${token}`, // From AsyncStorage
  'Content-Type': 'application/json',
  'expo-platform': Platform.OS // 'ios' or 'android'
}
```

### Expected Response Format

The frontend expects all responses in this format:
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}
```

### Error Handling

The frontend handles errors based on the `code` field:
- `VALIDATION_ERROR`: Shows error message to user
- `UNAUTHORIZED`: Redirects to login
- `FORBIDDEN`: Shows permission error
- `NOT_FOUND`: Shows "Prayer not found" message
- `INTERNAL_ERROR`: Shows generic error, logs details

### Navigation After Success

After successful prayer creation, the frontend navigates to:
```
/screens/PrayerWallScreen?refresh=true&highlightPrayerId={prayerId}
```

The Prayer Wall screen will:
1. Refresh the prayer list
2. Scroll to and highlight the newly created prayer

---

## Testing Checklist

### Unit Tests

- [ ] Validate prayer text (required, length, trim)
- [ ] Validate color format (hex codes)
- [ ] Validate shape enum values
- [ ] Validate verse object (optional, text/reference limits)
- [ ] Test authentication middleware
- [ ] Test ownership check for updates

### Integration Tests

- [ ] Create prayer with all fields
- [ ] Create prayer without verse
- [ ] Create prayer with only verse text
- [ ] Create prayer with only verse reference
- [ ] Create prayer with invalid color format
- [ ] Create prayer with invalid shape
- [ ] Create prayer without authentication
- [ ] Update own prayer
- [ ] Update another user's prayer (should fail)
- [ ] Update non-existent prayer
- [ ] Get single prayer
- [ ] Get non-existent prayer

### Edge Cases

- [ ] Empty prayer text (only whitespace)
- [ ] Prayer text exactly 2000 characters
- [ ] Prayer text 2001 characters (should fail)
- [ ] Verse text exactly 500 characters
- [ ] Verse text 501 characters (should fail)
- [ ] Verse reference exactly 50 characters
- [ ] Verse reference 51 characters (should fail)
- [ ] Color with lowercase hex
- [ ] Color with uppercase hex
- [ ] Color with mixed case hex
- [ ] Invalid ObjectId format
- [ ] Malformed JSON in request body
- [ ] Missing required fields
- [ ] Extra fields in request (should be ignored or validated)

### Performance Tests

- [ ] Response time < 500ms for create prayer
- [ ] Response time < 300ms for get prayer
- [ ] Database indexes working correctly
- [ ] Concurrent prayer creation (10+ simultaneous requests)

### Security Tests

- [ ] Unauthenticated requests rejected
- [ ] Invalid tokens rejected
- [ ] Expired tokens rejected
- [ ] Users cannot update others' prayers
- [ ] SQL injection attempts blocked (if using SQL)
- [ ] NoSQL injection attempts blocked (if using MongoDB)
- [ ] XSS attempts sanitized in stored data

---

## Additional Notes

### Default Values

When creating a prayer, the frontend may send default values:
- Default verse text: "And this is the confidence that we have toward Him, that if we ask anything according to His will, He hears us."
- Default reference: "1 John 5:14"
- Default color: "#A16CE5" (Purple)
- Default shape: "square"

The backend should accept these defaults without modification.

### Timestamps

All timestamps should be in ISO 8601 format:
```
2024-01-15T10:30:00.000Z
```

### ObjectId Format

MongoDB ObjectIds should be returned as strings in JSON responses:
```json
{
  "_id": "507f1f77bcf86cd799439011"
}
```

### Population

Always populate the `author` field when returning prayer data:
```javascript
await prayer.populate('author', 'username firstName lastName avatarUrl');
```

This ensures the frontend receives complete user information for display.

---

## Support

For questions or issues with this integration, contact:
- Frontend Team: [Contact Info]
- Backend Team: [Contact Info]

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Status:** Ready for Implementation




