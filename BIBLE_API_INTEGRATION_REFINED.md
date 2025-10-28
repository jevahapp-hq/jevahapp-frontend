# 📖 Bible API Integration - Refined Frontend Implementation

## ✅ Complete and Production-Ready

This document provides the **refined and tested** Bible API integration for the Jevah App frontend.

---

## 🚀 Quick Start

### **1. Service is Ready**

The Bible API service (`app/services/bibleApiService.ts`) is fully configured and ready to use:

```typescript
import { bibleApiService } from "./services/bibleApiService";

// Get all books
const books = await bibleApiService.getAllBooks();

// Get verse range
const rangeResponse = await bibleApiService.getVerseRange("Romans 8:28-31");
const verses = rangeResponse.data; // Array of verses
console.log(`Found ${rangeResponse.count} verses`);
```

---

## 📋 API Endpoints Summary

### **✅ All Endpoints Verified**

| Endpoint                                                                 | Method | Auth Required | Description                            |
| ------------------------------------------------------------------------ | ------ | ------------- | -------------------------------------- |
| `/api/bible/books`                                                       | GET    | ❌            | All 66 books                           |
| `/api/bible/books/testament/:testament`                                  | GET    | ❌            | Books by testament                     |
| `/api/bible/books/:bookName`                                             | GET    | ❌            | Specific book                          |
| `/api/bible/books/:bookName/chapters`                                    | GET    | ❌            | Chapters for book                      |
| `/api/bible/books/:bookName/chapters/:chapterNumber`                     | GET    | ❌            | Specific chapter                       |
| `/api/bible/books/:bookName/chapters/:chapterNumber/verses`              | GET    | ❌            | All verses in chapter                  |
| `/api/bible/books/:bookName/chapters/:chapterNumber/verses/:verseNumber` | GET    | ❌            | Specific verse                         |
| `/api/bible/verses/range/:reference`                                     | GET    | ❌            | **Verse range** (e.g., "John 3:16-18") |
| `/api/bible/search?q=query`                                              | GET    | ❌            | Search Bible text                      |
| `/api/bible/verses/random`                                               | GET    | ❌            | Random verse                           |
| `/api/bible/verses/daily`                                                | GET    | ❌            | Verse of the day                       |
| `/api/bible/verses/popular?limit=10`                                     | GET    | ❌            | Popular verses                         |
| `/api/bible/stats`                                                       | GET    | ❌            | Bible statistics                       |

**Base URL**: `https://jevahapp-backend.onrender.com` (production) or `http://localhost:4000` (local)

---

## 📝 TypeScript Interfaces

### **Core Types**

```typescript
// Bible Book
interface BibleBook {
  _id: string;
  name: string;
  testament: "old" | "new";
  chapterCount: number;
  verseCount: number;
  order?: number;
  isActive?: boolean;
}

// Bible Chapter
interface BibleChapter {
  _id: string;
  bookName: string;
  chapterNumber: number;
  verseCount: number;
}

// Bible Verse
interface BibleVerse {
  _id: string;
  bookId?: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
  translation?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Verse Range Response (NEW)
interface VerseRangeResponse {
  success: boolean;
  data: BibleVerse[];
  count?: number;
  reference?: {
    bookName: string;
    startChapter: number;
    startVerse: number;
    endVerse: number;
  };
}

// Search Result
interface SearchResult {
  verses: BibleVerse[];
  total: number;
  hasMore: boolean;
  query?: string;
  limit?: number;
  offset?: number;
}
```

---

## 🎯 Usage Examples

### **1. Get All Books**

```typescript
import { bibleApiService } from "./services/bibleApiService";

const books = await bibleApiService.getAllBooks();
console.log(`Loaded ${books.length} books`); // 66 books
```

### **2. Get Verse Range (NEW - Recommended)**

```typescript
// Get verse range with full metadata
const response = await bibleApiService.getVerseRange("Romans 8:28-31");

console.log(`Found ${response.count} verses`);
console.log(response.reference); // Reference info
response.data.forEach((verse) => {
  console.log(`${verse.bookName} ${verse.chapterNumber}:${verse.verseNumber}`);
  console.log(verse.text);
});

// Or get just the array
const verses = response.data;
```

### **3. Get Verse Range Array (Backward Compatible)**

```typescript
// If you only need the verses array
const verses = await bibleApiService.getVerseRangeArray("John 3:16-18");
verses.forEach((verse) => {
  console.log(`${verse.verseNumber}: ${verse.text}`);
});
```

### **4. Search Bible**

```typescript
const results = await bibleApiService.searchBible("love", {
  limit: 10,
  offset: 0,
  testament: "new",
});

console.log(`Found ${results.total} verses`);
results.verses.forEach((verse) => {
  console.log(`${verse.bookName} ${verse.chapterNumber}:${verse.verseNumber}`);
});
```

### **5. Get Daily Verse**

```typescript
const verse = await bibleApiService.getDailyVerse();
console.log(
  `Today's verse: ${verse.bookName} ${verse.chapterNumber}:${verse.verseNumber}`
);
console.log(verse.text);
```

### **6. Get Random Verse**

```typescript
const verse = await bibleApiService.getRandomVerse();
console.log(`Random verse: ${verse.text}`);
```

---

## 🔧 React Component Example

### **Verse Range Component**

```typescript
// components/VerseRangeDisplay.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  bibleApiService,
  VerseRangeResponse,
} from "../services/bibleApiService";

interface VerseRangeDisplayProps {
  reference: string; // e.g., "Romans 8:28-31"
}

export const VerseRangeDisplay: React.FC<VerseRangeDisplayProps> = ({
  reference,
}) => {
  const [data, setData] = useState<VerseRangeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVerses();
  }, [reference]);

  const loadVerses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bibleApiService.getVerseRange(reference);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load verses");
      console.error("Error loading verses:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading verses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>❌ Error: {error}</Text>
      </View>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No verses found for {reference}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.reference}>{reference}</Text>
        <Text style={styles.count}>
          {data.count || data.data.length} verse
          {(data.count || data.data.length) !== 1 ? "s" : ""}
        </Text>
      </View>

      {data.data.map((verse, index) => (
        <View key={verse._id} style={styles.verseContainer}>
          <View style={styles.verseHeader}>
            <Text style={styles.verseNumber}>
              {verse.bookName} {verse.chapterNumber}:{verse.verseNumber}
            </Text>
          </View>
          <Text style={styles.verseText}>{verse.text}</Text>
          {index < data.data.length - 1 && <View style={styles.separator} />}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FCFCFD",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#256E63",
  },
  reference: {
    fontSize: 24,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    marginBottom: 5,
  },
  count: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  verseContainer: {
    marginBottom: 20,
  },
  verseHeader: {
    marginBottom: 8,
  },
  verseNumber: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: "#256E63",
  },
  verseText: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    lineHeight: 24,
    color: "#1F2937",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#EF4444",
    textAlign: "center",
  },
});
```

---

## 🪝 Custom Hook Example

```typescript
// hooks/useVerseRange.ts
import { useState, useEffect } from "react";
import {
  bibleApiService,
  VerseRangeResponse,
} from "../services/bibleApiService";

export const useVerseRange = (reference: string) => {
  const [data, setData] = useState<VerseRangeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVerses = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await bibleApiService.getVerseRange(reference);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        console.error("Error loading verse range:", err);
      } finally {
        setLoading(false);
      }
    };

    if (reference) {
      loadVerses();
    }
  }, [reference]);

  return { data, verses: data?.data || [], loading, error };
};

// Usage:
const { verses, loading, error, data } = useVerseRange("Romans 8:28-31");
```

---

## 📊 Response Format

### **Verse Range Response**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68fc836c990b19e69c902161",
      "bookId": "68fc67ec990b19e69c8f4649",
      "bookName": "Romans",
      "chapterNumber": 8,
      "verseNumber": 28,
      "text": "We know that all things work together for good for those who love God, to those who are called according to his purpose.",
      "translation": "WEB",
      "isActive": true,
      "createdAt": "2025-10-25T07:59:40.285Z",
      "updatedAt": "2025-10-25T07:59:40.285Z"
    },
    {
      "_id": "68fc836c990b19e69c902162",
      "bookName": "Romans",
      "chapterNumber": 8,
      "verseNumber": 29,
      "text": "For whom he foreknew, he also predestined...",
      "translation": "WEB"
    }
    // ... more verses
  ],
  "count": 4,
  "reference": {
    "bookName": "Romans",
    "startChapter": 8,
    "startVerse": 28,
    "endVerse": 31
  }
}
```

---

## 🎯 Supported Reference Formats

The verse range endpoint accepts:

- ✅ `"John 3:16-18"` - Single chapter, verse range
- ✅ `"Romans 8:28-31"` - Single chapter, verse range
- ✅ `"Psalm 23:1-6"` - Single chapter, verse range
- ✅ `"1 Corinthians 13:4-7"` - Multi-word book name
- ✅ `"Genesis 1:1-5"` - Single chapter, verse range

**Note**: Currently supports ranges within the same chapter only.

---

## ⚠️ Error Handling

```typescript
try {
  const response = await bibleApiService.getVerseRange("Romans 8:28-31");
  // Use response.data
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("Invalid Bible reference")) {
      // Handle invalid format
      console.error("Invalid reference format");
    } else if (error.message.includes("404")) {
      // Handle not found
      console.error("Verses not found");
    } else {
      // Handle other errors
      console.error("API error:", error.message);
    }
  }
}
```

---

## 🌐 API Base URL Configuration

The service automatically uses the correct API base URL:

```typescript
// app/utils/api.ts
export function getApiBaseUrl(): string {
  // Priority: EXPO_PUBLIC_API_URL > Environment Manager
  return process.env.EXPO_PUBLIC_API_URL || environmentManager.getCurrentUrl();
}
```

**Default URLs**:

- **Local**: `http://10.156.136.168:4000`
- **Production**: `https://jevahapp-backend.onrender.com`

**Override with environment variable**:

```bash
# .env.local
EXPO_PUBLIC_API_URL=http://localhost:4000
```

---

## 🔍 Debugging

The service logs all requests:

```
📖 Bible API Request: https://jevahapp-backend.onrender.com/api/bible/verses/range/Romans%208%3A28-31
✅ Bible API Success: https://jevahapp-backend.onrender.com/api/bible/verses/range/Romans%208%3A28-31
```

Errors are logged with details:

```
❌ Bible API Error [404]: { message: "Route not found" }
❌ Error fetching verse range "Invalid Reference": Error message here
```

---

## ✅ Testing Checklist

- [x] ✅ Get all books
- [x] ✅ Get verse range (`getVerseRange`)
- [x] ✅ Get verse range array (`getVerseRangeArray`)
- [x] ✅ Search Bible
- [x] ✅ Get daily verse
- [x] ✅ Get random verse
- [x] ✅ Error handling
- [x] ✅ TypeScript types
- [x] ✅ Console logging

---

## 🚀 Production Ready

The Bible API service is **production-ready** with:

- ✅ Complete TypeScript types
- ✅ Comprehensive error handling
- ✅ Console logging for debugging
- ✅ Backward compatibility
- ✅ Full metadata support
- ✅ Tested with production backend

**Start using it now!** 🎉

```typescript
import { bibleApiService } from "./services/bibleApiService";
const response = await bibleApiService.getVerseRange("Romans 8:28-31");
```

---

**Last Updated**: 2024
**Status**: ✅ Production Ready
**Service Location**: `app/services/bibleApiService.ts`
