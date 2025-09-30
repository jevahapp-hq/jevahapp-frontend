# Section Structure for All Content Components

## Order of Sections (Main Branch - Updated)

### For ALL Content (AllContentTikTok):
1. **Most Recent** - Single large card of the newest content
2. **Scripture Hymns** - Horizontal scroll of ebook mini cards (Psalm 136)
3. **Previously Viewed** - Horizontal scroll mini cards (2 explore cards directly under)
4. **Explore More (Section 1)** - 4-6 large cards
5. **Trending** - Horizontal scroll mini cards 
6. **Explore More (Section 2)** - 4-6 large cards
7. **Recommended for You** - Horizontal scroll mini cards
8. **Explore More (Section 3)** - Remaining content

### For MUSIC Component:
1. **Most Recent** - Single large music card
2. **Previously Viewed** - Horizontal scroll mini cards
3. **Explore More** - 4-6 large cards
4. **Trending** - Horizontal scroll mini cards
5. **Explore More** - 4-6 large cards
6. **Recommended for You** - Horizontal scroll mini cards
7. **Explore More** - Remaining content

### For VIDEO Component:
1. **Most Recent** - Single large video card
2. **Previously Viewed** - Horizontal scroll mini cards
3. **Explore More** - 4-6 large cards
4. **Trending** - Horizontal scroll mini cards
5. **Explore More** - 4-6 large cards
6. **Recommended for You** - Horizontal scroll mini cards
7. **Explore More** - Remaining content

### For SERMON Component:
1. **Most Recent** - Single large sermon card
2. **Previously Viewed** - Horizontal scroll mini cards
3. **Explore More** - 4-6 large cards
4. **Trending** - Horizontal scroll mini cards
5. **Explore More** - 4-6 large cards
6. **Recommended for You** - Horizontal scroll mini cards
7. **Explore More** - Remaining content

### For EBOOK Component:
1. **Most Recent** - Single large ebook card
2. **Scripture Hymns** - Horizontal scroll of ebook mini cards (Psalm 136)
3. **Previously Viewed** - Horizontal scroll mini cards (2 explore cards directly under)
4. **Explore More** - 4-6 large cards
5. **Trending** - Horizontal scroll mini cards
6. **Explore More** - 4-6 large cards
7. **Recommended for You** - Horizontal scroll mini cards
8. **Explore More** - Remaining content

## Key Features from viewContent Branch:

✅ **URL Manager** - Centralized URL validation and refresh
✅ **SafeImage** - Robust image loading with fallbacks
✅ **Error Boundary** - Graceful error handling
✅ **Loading States** - Visual feedback during URL validation
✅ **Fallback Mechanisms** - No blank content ever

## Implementation Notes:

- ALL and EBOOK components have Scripture Hymns section
- Scripture Hymns appears right after Most Recent
- Previously Viewed has 2 explore cards directly underneath
- Each "Explore More" section contains 4-6 items (not mini cards)
- Mini card sections: Previously Viewed, Trending, Recommended for You
- All components use URLManager for stable content delivery
