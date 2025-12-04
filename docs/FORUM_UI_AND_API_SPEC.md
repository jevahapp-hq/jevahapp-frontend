# Forum UI Design & API Integration Specification

## Overview

This document outlines the complete Forum UI design, user flow, API calls, expected responses, and identifies why certain features are not working. This is intended for the backend team to understand frontend expectations and make necessary adjustments.

**Last Updated**: 2024-12-19  
**Frontend Version**: Post-forum-refactor

---

## 🎨 UI Design & Layout

### Screen Structure

```
ForumScreen
├── Header
│   ├── Back Button (←)
│   ├── Title: "Forum"
│   └── Filter Button (⚙️)
│
├── Category Selector (Horizontal Scroll)
│   └── Category Chips (e.g., "Prayer Requests", "Bible Study")
│
├── Content Area
│   ├── Loading State (if initial load)
│   ├── Error State (if API fails)
│   ├── Empty State (if no forums/posts)
│   └── Discussion List (if forums exist)
│       └── Forum Cards
│           ├── Forum Title
│           ├── Forum Description
│           ├── Stats (postsCount, participantsCount)
│           └── Action Buttons
│
└── Create Forum Button (Floating/In Header)
```

---

## 📑 Category Tabs Implementation

### Visual Design

**Category Selector**:
- **Layout**: Horizontal scrolling FlatList
- **Position**: Below header, above content
- **Style**: Chip-based design
- **Active State**: Black background, white text
- **Inactive State**: White background, gray text, gray border
- **Spacing**: 12px margin between chips

**Category Chip Structure**:
```typescript
{
  _id: string,           // Category ID
  title: string,         // Display name (e.g., "Prayer Requests")
  description: string,   // Optional description
  isCategory: true,      // MUST be true
  categoryId: null,      // MUST be null for categories
  postsCount: number,    // Total posts in all forums under this category
  participantsCount: number // Total participants
}
```

### Category Selection Flow

1. **On Screen Load**:
   - Frontend calls: `GET /api/community/forum?view=categories&page=1&limit=100`
   - Backend returns: Array of categories
   - Frontend displays: Categories as horizontal chips
   - **Default**: First category is auto-selected

2. **User Clicks Category**:
   - Frontend updates: `selectedCategoryId` state
   - Frontend calls: `GET /api/community/forum?view=discussions&categoryId={selectedCategoryId}&page=1&limit=100`
   - Backend returns: Array of forums under that category
   - Frontend displays: Forums in the discussion list

3. **Category Tab States**:
   - **Active**: Black background (`#000000`), white text, no border
   - **Inactive**: White background, gray text (`#666666`), gray border (`#E5E7EB`)

---

## 🆕 Forum Creation Flow

### User Journey

1. **User clicks "Create Forum" button** (floating button or in empty state)
2. **Modal opens** with form:
   - Forum Title input (3-100 characters)
   - Description textarea (10-500 characters)
   - Category selector (chips showing all available categories)
   - Create/Cancel buttons

3. **User fills form**:
   - Enters title (validated: 3-100 chars)
   - Enters description (validated: 10-500 chars)
   - Selects category (required)

4. **User clicks "Create"**:
   - Frontend validates form
   - Frontend calls: `POST /api/community/forum/create`
   - Backend creates forum
   - Frontend refreshes discussions list
   - **Expected**: New forum appears in the selected category's discussion list

### Create Forum Modal UI

**Form Fields**:
```
┌─────────────────────────────────────┐
│ Create Forum                    [X] │
├─────────────────────────────────────┤
│                                     │
│ Forum Title *                       │
│ [_____________________________]    │
│ 0/100 characters                    │
│                                     │
│ Description *                       │
│ [_____________________________]    │
│ [_____________________________]    │
│ [_____________________________]    │
│ 0/500 characters                    │
│                                     │
│ Category *                          │
│ [Prayer Requests] [Bible Study]    │
│                                     │
│ [Cancel]              [Create]      │
└─────────────────────────────────────┘
```

**Validation Rules**:
- **Title**: 3-100 characters (required)
- **Description**: 10-500 characters (required)
- **Category**: Must select one (required)
- **Create button**: Disabled until all fields valid

---

## 🔌 API Calls & Expected Responses

### 1. Get Categories

**Frontend Call**:
```typescript
// app/hooks/useForums.ts - loadCategories()
GET /api/community/forum?view=categories&page=1&limit=100
Headers:
  Content-Type: application/json
  Authorization: Bearer <token> (optional for public categories)
```

**Expected Backend Response**:
```json
{
  "success": true,
  "data": {
    "forums": [
      {
        "_id": "category123",
        "title": "Prayer Requests",
        "description": "Share your prayer requests",
        "isCategory": true,
        "categoryId": null,
        "isActive": true,
        "postsCount": 0,
        "participantsCount": 0,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "createdBy": "admin123"
      },
      {
        "_id": "category456",
        "title": "Bible Study",
        "description": "Discuss Bible passages",
        "isCategory": true,
        "categoryId": null,
        "isActive": true,
        "postsCount": 5,
        "participantsCount": 12,
        "createdAt": "2024-01-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 2,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

**Critical Requirements**:
- ✅ `isCategory: true` for ALL items
- ✅ `categoryId: null` (or undefined) for ALL items
- ✅ `isActive: true` (or omit if all are active)
- ✅ Return empty array `[]` if no categories exist (don't return error)

**Frontend Behavior**:
- If `forums` array is empty → Shows "No forum categories yet" message
- If error → Shows error message
- If success → Displays categories as horizontal chips

---

### 2. Get Discussions (Forums Under Category)

**Frontend Call**:
```typescript
// app/hooks/useForums.ts - loadDiscussions(categoryId)
GET /api/community/forum?view=discussions&categoryId={categoryId}&page=1&limit=100
Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
```

**Expected Backend Response**:
```json
{
  "success": true,
  "data": {
    "forums": [
      {
        "_id": "forum789",
        "title": "Prayer for healing",
        "description": "Please pray for my friend who is sick",
        "isCategory": false,
        "categoryId": "category123",
        "isActive": true,
        "postsCount": 3,
        "participantsCount": 5,
        "createdAt": "2024-01-20T14:30:00.000Z",
        "createdBy": "user456",
        "category": {
          "_id": "category123",
          "title": "Prayer Requests"
        }
      },
      {
        "_id": "forum790",
        "title": "Thanksgiving prayer",
        "description": "Thanking God for answered prayers",
        "isCategory": false,
        "categoryId": "category123",
        "isActive": true,
        "postsCount": 1,
        "participantsCount": 2,
        "createdAt": "2024-01-21T09:15:00.000Z",
        "createdBy": "user789"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 2,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

**Critical Requirements**:
- ✅ `isCategory: false` for ALL items
- ✅ `categoryId` MUST match the query parameter exactly
- ✅ **NEWLY CREATED FORUMS MUST APPEAR HERE IMMEDIATELY**
- ✅ Return empty array `[]` if no forums exist (don't return error)
- ✅ Sort by `createdAt` descending (newest first)

**Frontend Behavior**:
- Filters out any items with `isCategory: true` (safety check)
- Displays forums as cards in discussion list
- If empty → Shows "No forums in this category" with "Create Forum" button
- If error → Shows error message

---

### 3. Create Forum

**Frontend Call**:
```typescript
// app/screens/ForumScreen.tsx - handleCreateForum()
POST /api/community/forum/create
Headers:
  Content-Type: application/json
  Authorization: Bearer <token> (REQUIRED)

Body:
{
  "categoryId": "category123",
  "title": "New Prayer Request",
  "description": "Please pray for my family during this difficult time"
}
```

**Expected Backend Response**:
```json
{
  "success": true,
  "data": {
    "_id": "forum999",
    "title": "New Prayer Request",
    "description": "Please pray for my family during this difficult time",
    "isCategory": false,
    "categoryId": "category123",
    "isActive": true,
    "postsCount": 0,
    "participantsCount": 0,
    "createdAt": "2024-01-22T10:00:00.000Z",
    "createdBy": "user123",
    "category": {
      "_id": "category123",
      "title": "Prayer Requests"
    }
  }
}
```

**Critical Requirements**:
- ✅ `isCategory: false` (MUST be false, not undefined)
- ✅ `categoryId` MUST match the `categoryId` sent in request body
- ✅ `isActive: true` (default to true)
- ✅ Return the created forum object immediately
- ✅ Forum MUST be queryable via discussions endpoint immediately after creation

**Frontend Behavior After Creation**:
1. Closes modal
2. Clears form fields
3. Sets `pendingForumId` to the created forum's `_id`
4. If created forum's `categoryId` doesn't match current `selectedCategoryId`:
   - Switches to the correct category: `selectCategory(result.categoryId)`
5. Refreshes discussions list: `loadDiscussions(categoryId)`
6. **Expected**: New forum appears in the discussion list
7. **Current Issue**: Forum doesn't appear (see "Why It's Not Working" below)

---

## 🐛 Why It's Not Working

### Problem 1: Forum Created But Doesn't Appear

**Symptom**:
- User creates forum → API returns success
- Forum doesn't appear in the category's discussion list
- User has to refresh or switch categories to see it

**Root Cause Analysis**:

#### **Issue A: Backend Not Saving `categoryId` Correctly**

**What Frontend Sends**:
```json
{
  "categoryId": "category123",
  "title": "New Forum",
  "description": "Forum description"
}
```

**What Backend Might Be Doing Wrong**:
1. ❌ Not saving `categoryId` field at all
2. ❌ Saving `categoryId` as `null` or `undefined`
3. ❌ Saving `categoryId` as wrong value (different category)
4. ❌ Saving `categoryId` as string when database expects ObjectId (or vice versa)

**Backend Fix Required**:
```javascript
// ✅ CORRECT: Explicitly save categoryId
const forum = await Forum.create({
  title: req.body.title,
  description: req.body.description,
  isCategory: false,              // ✅ MUST be false
  categoryId: req.body.categoryId, // ✅ MUST match request body
  isActive: true,                 // ✅ Default to true
  createdBy: req.user._id
});

// ❌ WRONG: Not saving categoryId
const forum = await Forum.create({
  title: req.body.title,
  description: req.body.description,
  isCategory: false
  // categoryId missing!
});

// ❌ WRONG: Saving wrong value
const forum = await Forum.create({
  title: req.body.title,
  description: req.body.description,
  isCategory: false,
  categoryId: null  // Wrong! Should be req.body.categoryId
});
```

---

#### **Issue B: Backend Not Setting `isCategory: false`**

**What Frontend Expects**:
- `isCategory: false` for forums (discussions)
- `isCategory: true` for categories

**What Backend Might Be Doing Wrong**:
1. ❌ Defaulting `isCategory` to `true` (or `undefined`)
2. ❌ Not setting `isCategory` field at all
3. ❌ Setting `isCategory` based on wrong logic

**Backend Fix Required**:
```javascript
// ✅ CORRECT: Explicitly set isCategory to false
const forum = await Forum.create({
  title: req.body.title,
  description: req.body.description,
  isCategory: false,  // ✅ MUST be false for forums
  categoryId: req.body.categoryId,
  isActive: true,
  createdBy: req.user._id
});

// ❌ WRONG: Defaulting to true
const forum = await Forum.create({
  title: req.body.title,
  description: req.body.description,
  categoryId: req.body.categoryId
  // isCategory defaults to true in schema → WRONG!
});
```

---

#### **Issue C: Query Not Filtering Correctly**

**What Frontend Calls**:
```
GET /api/community/forum?view=discussions&categoryId=category123
```

**What Backend Query Should Be**:
```javascript
Forum.find({
  isCategory: false,           // ✅ MUST be false
  categoryId: categoryId,      // ✅ MUST match exactly
  isActive: true               // Optional: only active forums
})
```

**What Backend Might Be Doing Wrong**:
1. ❌ Not filtering by `isCategory: false`
2. ❌ Not filtering by `categoryId` (or filtering incorrectly)
3. ❌ Using wrong data type (string vs ObjectId mismatch)
4. ❌ Filtering by `isActive: false` when forum is created with `isActive: true`

**Backend Fix Required**:
```javascript
// ✅ CORRECT: Filter by both isCategory and categoryId
const discussions = await Forum.find({
  isCategory: false,
  categoryId: new mongoose.Types.ObjectId(categoryId), // Convert if needed
  isActive: true
}).sort({ createdAt: -1 });

// ❌ WRONG: Missing isCategory filter
const discussions = await Forum.find({
  categoryId: categoryId  // Missing isCategory: false
});

// ❌ WRONG: Wrong data type
const discussions = await Forum.find({
  isCategory: false,
  categoryId: categoryId  // If categoryId is ObjectId in DB, this won't match string
});
```

---

### Problem 2: Categories Not Loading

**Symptom**:
- Frontend shows "No forum categories yet"
- Categories list is empty
- User cannot create forums (no categories to select)

**Root Cause**:
1. ❌ No categories exist in database
2. ❌ Backend query filters out all categories (wrong `isActive` filter)
3. ❌ Backend returns wrong structure (not `{ success: true, data: { forums: [...] } }`)

**Backend Fix Required**:
```javascript
// ✅ CORRECT: Query for categories
const categories = await Forum.find({
  isCategory: true,
  $or: [
    { categoryId: null },
    { categoryId: { $exists: false } }
  ],
  isActive: true  // Optional: only if you want active categories
}).sort({ createdAt: -1 });

// If no categories exist, seed them:
if (categories.length === 0) {
  await Forum.create([
    {
      title: "Prayer Requests",
      description: "Share your prayer requests",
      isCategory: true,
      categoryId: null,
      isActive: true,
      createdBy: adminUserId
    },
    {
      title: "Bible Study",
      description: "Discuss Bible passages",
      isCategory: true,
      categoryId: null,
      isActive: true,
      createdBy: adminUserId
    }
  ]);
}
```

---

### Problem 3: Forum Appears in Wrong Category

**Symptom**:
- User creates forum under Category A
- Forum appears under Category B (or all categories)

**Root Cause**:
- Backend not saving `categoryId` correctly
- Backend query not filtering by `categoryId` correctly

**Backend Fix**: Same as Issue A and Issue C above.

---

## 🔄 Complete Data Flow

### Flow 1: User Opens Forum Screen

```
1. User navigates to ForumScreen
   ↓
2. Frontend calls: GET /api/community/forum?view=categories
   ↓
3. Backend returns: { success: true, data: { forums: [categories...] } }
   ↓
4. Frontend displays: Category chips (horizontal scroll)
   ↓
5. Frontend auto-selects: First category (categories[0]._id)
   ↓
6. Frontend calls: GET /api/community/forum?view=discussions&categoryId={firstCategoryId}
   ↓
7. Backend returns: { success: true, data: { forums: [discussions...] } }
   ↓
8. Frontend displays: Discussion list (forum cards)
```

---

### Flow 2: User Creates Forum

```
1. User clicks "Create Forum" button
   ↓
2. Modal opens with form
   ↓
3. User fills:
   - Title: "New Prayer Request"
   - Description: "Please pray..."
   - Category: Selects "Prayer Requests" (categoryId: "category123")
   ↓
4. User clicks "Create"
   ↓
5. Frontend validates:
   - Title: 3-100 chars ✅
   - Description: 10-500 chars ✅
   - Category selected ✅
   ↓
6. Frontend calls: POST /api/community/forum/create
   Body: {
     categoryId: "category123",
     title: "New Prayer Request",
     description: "Please pray..."
   }
   ↓
7. Backend creates forum:
   - isCategory: false ✅
   - categoryId: "category123" ✅
   - isActive: true ✅
   ↓
8. Backend returns: { success: true, data: { _id: "forum999", ... } }
   ↓
9. Frontend closes modal, clears form
   ↓
10. Frontend refreshes discussions:
    GET /api/community/forum?view=discussions&categoryId=category123
    ↓
11. Backend SHOULD return: New forum + existing forums
    ↓
12. Frontend displays: All forums including new one ✅
    ↓
13. CURRENT ISSUE: Step 11 returns forums WITHOUT the new one ❌
```

---

## ✅ Backend Verification Checklist

### Database Schema Check

```javascript
// Forum Model MUST have these fields:
{
  _id: ObjectId,           // ✅ Required
  title: String,           // ✅ Required
  description: String,     // ✅ Required
  isCategory: Boolean,     // ✅ CRITICAL: true for categories, false for forums
  categoryId: ObjectId,     // ✅ CRITICAL: null for categories, ObjectId for forums
  isActive: Boolean,       // ✅ Should default to true
  createdBy: ObjectId,     // ✅ Required
  createdAt: Date,         // ✅ Required
  postsCount: Number,      // ✅ Default to 0
  participantsCount: Number // ✅ Default to 0
}
```

---

### API Endpoint Verification

#### **GET /api/community/forum (Categories)**

**Test**:
```bash
curl -X GET "http://localhost:3000/api/community/forum?view=categories&page=1&limit=100"
```

**Verify**:
- [ ] Returns `{ success: true, data: { forums: [...] } }`
- [ ] All items have `isCategory: true`
- [ ] All items have `categoryId: null` (or undefined)
- [ ] Returns at least one category (or empty array if none exist)

---

#### **GET /api/community/forum (Discussions)**

**Test**:
```bash
curl -X GET "http://localhost:3000/api/community/forum?view=discussions&categoryId=CATEGORY_ID&page=1&limit=100" \
  -H "Authorization: Bearer TOKEN"
```

**Verify**:
- [ ] Returns `{ success: true, data: { forums: [...] } }`
- [ ] All items have `isCategory: false`
- [ ] All items have `categoryId` matching the query parameter
- [ ] Returns forums sorted by `createdAt` descending (newest first)

---

#### **POST /api/community/forum/create**

**Test**:
```bash
curl -X POST "http://localhost:3000/api/community/forum/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "categoryId": "CATEGORY_ID",
    "title": "Test Forum",
    "description": "This is a test forum description"
  }'
```

**Verify Response**:
- [ ] Returns `{ success: true, data: { ...forum } }`
- [ ] `isCategory: false` ✅
- [ ] `categoryId` matches the `categoryId` sent in request ✅
- [ ] `isActive: true` ✅

**Verify Database**:
```javascript
// Immediately after creation, check database:
const createdForum = await Forum.findById("forum999");
console.log(createdForum.isCategory);  // Should be false
console.log(createdForum.categoryId);  // Should match categoryId from request
console.log(createdForum.isActive);    // Should be true
```

**Verify Query**:
```bash
# Immediately after creation, query discussions:
curl -X GET "http://localhost:3000/api/community/forum?view=discussions&categoryId=CATEGORY_ID" \
  -H "Authorization: Bearer TOKEN"

# Should include the newly created forum
```

---

## 🔧 Backend Implementation Guide

### Correct Implementation Pattern

```javascript
// GET /api/community/forum - Get categories or discussions
router.get('/forum', async (req, res) => {
  try {
    const { view, categoryId, page = 1, limit = 100 } = req.query;

    let query = {};

    if (view === 'categories') {
      // Get categories only
      query = {
        isCategory: true,
        $or: [
          { categoryId: null },
          { categoryId: { $exists: false } }
        ],
        isActive: true
      };
    } else if (view === 'discussions') {
      // Get discussions under a category
      if (!categoryId) {
        return res.status(400).json({
          success: false,
          error: 'categoryId is required for discussions view'
        });
      }

      query = {
        isCategory: false,  // ✅ MUST be false
        categoryId: new mongoose.Types.ObjectId(categoryId), // ✅ Convert to ObjectId
        isActive: true
      };
    }

    const forums = await Forum.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName username')
      .lean();

    const total = await Forum.countDocuments(query);

    res.json({
      success: true,
      data: {
        forums,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      }
    });
  } catch (error) {
    console.error('Error getting forums:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/community/forum/create - Create a forum
router.post('/forum/create', authenticate, async (req, res) => {
  try {
    const { categoryId, title, description } = req.body;

    // Validate inputs
    if (!categoryId || !title || !description) {
      return res.status(400).json({
        success: false,
        error: 'categoryId, title, and description are required'
      });
    }

    // Validate category exists
    const category = await Forum.findOne({
      _id: categoryId,
      isCategory: true,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or inactive'
      });
    }

    // Create forum with EXPLICIT fields
    const forum = await Forum.create({
      title: title.trim(),
      description: description.trim(),
      isCategory: false,           // ✅ EXPLICITLY set to false
      categoryId: category._id,     // ✅ Use verified category._id (as ObjectId)
      isActive: true,              // ✅ EXPLICITLY set to true
      createdBy: req.user._id,
      postsCount: 0,
      participantsCount: 0
    });

    // Populate createdBy
    await forum.populate('createdBy', 'firstName lastName username');

    res.json({
      success: true,
      data: forum
    });
  } catch (error) {
    console.error('Error creating forum:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 📊 Summary

### What Frontend Expects

1. ✅ **Categories**: `isCategory: true`, `categoryId: null`
2. ✅ **Forums**: `isCategory: false`, `categoryId: <categoryId>`
3. ✅ **Create Forum**: Saves with correct `categoryId` and `isCategory: false`
4. ✅ **Query Discussions**: Returns forums filtered by `categoryId` and `isCategory: false`
5. ✅ **New Forum Appears**: Immediately queryable after creation

### What Backend Must Fix

1. ✅ **Save `categoryId` correctly** when creating forum
2. ✅ **Set `isCategory: false`** explicitly when creating forum
3. ✅ **Filter queries correctly** by `isCategory` and `categoryId`
4. ✅ **Handle ObjectId conversion** (string vs ObjectId mismatch)
5. ✅ **Return correct response structure** (`{ success: true, data: { forums: [...] } }`)

### Testing Steps

1. Create a forum → Check database → Verify `categoryId` and `isCategory` are correct
2. Query discussions → Verify forum appears in correct category
3. Create forum in Category A → Verify it doesn't appear in Category B
4. Check response structure → Verify it matches frontend expectations

---

**Document Version**: 1.0  
**Maintained By**: Frontend Team  
**Last Review**: 2024-12-19

