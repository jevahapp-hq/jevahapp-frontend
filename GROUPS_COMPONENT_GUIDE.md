# Groups Component System

This guide explains the Groups component system that was created to match the design specifications from the provided images.

## Components Overview

### 1. GroupsScreen (`/app/screens/GroupsScreen.tsx`)
- **Purpose**: Main Groups screen showing "MY GROUPS" and "EXPLORE GROUPS" tabs
- **Navigation**: Accessed from Community screen by clicking the "Groups" card
- **Features**: 
  - Tab switching between "MY GROUPS" and "EXPLORE GROUPS"
  - Empty state with illustration for users who haven't joined any groups
  - "JOIN A GROUP" call-to-action button

### 2. ExploreGroupsScreen (`/app/screens/ExploreGroupsScreen.tsx`)
- **Purpose**: Shows available groups that users can join
- **Navigation**: Accessed by clicking "EXPLORE GROUPS" tab or "JOIN A GROUP" button
- **Features**:
  - List of group cards with icons, titles, descriptions, and member counts
  - "Join" button for each group
  - Tab switching back to "MY GROUPS"

### 3. GroupChatScreen (`/app/screens/GroupChatScreen.tsx`)
- **Purpose**: Individual group discussion/chat interface
- **Navigation**: Accessed by clicking "Join" button on any group card
- **Features**:
  - Group chat interface with message bubbles
  - Message input with send functionality
  - Sample messages from Joe, Elizabeth, and Brithany
  - Join confirmation modal overlay

### 4. JoinGroupModal (`/app/components/JoinGroupModal.tsx`)
- **Purpose**: Modal popup for confirming group joining
- **Navigation**: Appears automatically when entering a group chat
- **Features**:
  - Group information display (title, description, member count)
  - "Join" button to confirm joining
  - Swipe-to-dismiss gesture support
  - Smooth animations

## Navigation Flow

```
Community Screen
    ↓ (click Groups card)
Groups Screen (MY GROUPS tab)
    ↓ (click EXPLORE GROUPS tab OR "JOIN A GROUP" button)
Explore Groups Screen
    ↓ (click "Join" button on any group)
Group Chat Screen (with Join Group Modal overlay)
    ↓ (click "Join" button in modal)
Group Chat Screen (modal dismissed, user joined)
```

## Key Features

### Design Consistency
- Uses Rubik font family throughout (as per project preference)
- Matches color scheme from the provided images
- Consistent spacing and styling with existing app components

### Navigation
- Left-to-right slide navigation using expo-router
- Back button functionality on all screens
- Tab switching between MY GROUPS and EXPLORE GROUPS

### Modal Implementation
- Uses react-native-reanimated for smooth animations
- Pan gesture handler for swipe-to-dismiss
- Follows existing modal patterns in the app

### Responsive Design
- Adapts to different screen sizes
- Proper keyboard handling for message input
- Safe area handling for different devices

## Integration Points

### Community Screen
- Updated `handleCardPress` function to navigate to Groups screen
- Groups card now properly navigates to `/screens/GroupsScreen`

### Bottom Navigation
- All screens include the bottom navigation overlay
- Proper tab state management

### Styling
- Uses existing color constants and design patterns
- Consistent with app's overall design language
- Proper shadow and elevation for cards

## Sample Data

The components include sample data for demonstration:
- 5 different groups (Gospel Music Trends, Daily Devotionals, Bible Stories Videos)
- Sample chat messages from 3 users
- Realistic member counts and descriptions

## Future Enhancements

Potential improvements that could be added:
1. Real API integration for groups and messages
2. Push notifications for new messages
3. Group creation functionality
4. User authentication and profile integration
5. Message persistence and real-time updates
6. Group moderation features
7. File and media sharing in groups

## Testing

To test the Groups component system:
1. Navigate to Community screen
2. Click on the "Groups" card
3. Try switching between "MY GROUPS" and "EXPLORE GROUPS" tabs
4. Click "JOIN A GROUP" or "EXPLORE GROUPS" to see the group list
5. Click "Join" on any group to see the chat interface
6. Test the modal by trying to join a group
7. Test navigation back through the screens

All components are fully functional and ready for integration with a backend API.
