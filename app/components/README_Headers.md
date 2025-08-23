# Mobile Header System

This document describes the new mobile header system that follows modern mobile application standards for both iOS and Android.

## Overview

The new header system consists of three main components:

1. **MobileHeader** - A comprehensive, flexible header component
2. **Header** - Main app header (updated to use MobileHeader)
3. **AuthHeader** - Authentication header (updated to use MobileHeader)

## Features

### ✅ Modern Mobile Standards
- **Safe Area Support**: Proper handling of device safe areas (notch, status bar, etc.)
- **Status Bar Management**: Automatic status bar configuration
- **Cross-Platform**: Optimized for both iOS and Android
- **Responsive Design**: Adapts to different screen sizes

### ✅ Professional Design
- **Consistent Spacing**: Standardized padding and margins
- **Modern Typography**: Proper font weights and sizes
- **Visual Hierarchy**: Clear information hierarchy
- **Interactive Elements**: Proper touch targets and feedback

### ✅ Flexible Configuration
- **Multiple Types**: Main, auth, search, profile, custom
- **Customizable Actions**: Configurable left/right action buttons
- **Badge Support**: Notification badges and counts
- **Theme Support**: Light/dark theme options

## Components

### 1. MobileHeader

The main header component that handles all header types.

```tsx
import MobileHeader from '../components/MobileHeader';

// Basic usage
<MobileHeader
  type="main"
  title="Screen Title"
  user={userData}
  rightActions={[
    { icon: "search-outline", onPress: () => router.push("/search") },
    { icon: "notifications-outline", onPress: () => router.push("/notifications"), badge: true },
  ]}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'main' \| 'auth' \| 'search' \| 'profile'` | `'main'` | Header type |
| `title` | `string` | - | Header title |
| `subtitle` | `string` | - | Header subtitle |
| `user` | `User` | - | User data for main header |
| `showBack` | `boolean` | `true` | Show back button |
| `showCancel` | `boolean` | `true` | Show cancel button |
| `leftAction` | `Action` | - | Left action button |
| `rightActions` | `Action[]` | `[]` | Right action buttons |
| `backgroundColor` | `string` | `'white'` | Background color |
| `textColor` | `string` | `'#374151'` | Text color |
| `statusBarStyle` | `'light-content' \| 'dark-content'` | `'dark-content'` | Status bar style |

### 2. Header (Main App Header)

Updated to use MobileHeader internally.

```tsx
import Header from '../components/Header';

// Usage in main app screens
<Header />
```

### 3. AuthHeader

Updated to use MobileHeader internally.

```tsx
import AuthHeader from '../components/AuthHeader';

// Usage in auth screens
<AuthHeader title="Sign In" subtitle="Welcome back" />
```

## Usage Examples

### 1. Main App Header

```tsx
<MobileHeader
  type="main"
  user={{
    firstName: "John",
    lastName: "Doe",
    avatar: "https://example.com/avatar.jpg",
    section: "USER",
    isOnline: true,
  }}
  rightActions={[
    { icon: "search-outline", onPress: () => router.push("/search") },
    { icon: "notifications-outline", onPress: () => router.push("/notifications"), badge: true, badgeCount: 3 },
    { icon: "download-outline", onPress: () => router.push("/downloads") },
  ]}
/>
```

### 2. Authentication Header

```tsx
<MobileHeader
  type="auth"
  title="Sign In"
  subtitle="Welcome back to Jevah"
  showBack={true}
  showCancel={true}
/>
```

### 3. Search/Explore Header

```tsx
<MobileHeader
  title="Explore"
  leftAction={{
    icon: "arrow-back",
    onPress: () => router.back(),
  }}
  rightActions={[
    {
      icon: "options-outline",
      onPress: () => router.push("/filters"),
    },
  ]}
/>
```

### 4. Profile Header

```tsx
<MobileHeader
  title="Profile"
  subtitle="John Doe"
  leftAction={{
    icon: "arrow-back",
    onPress: () => router.back(),
  }}
  rightActions={[
    { icon: "settings-outline", onPress: () => router.push("/settings") },
    { icon: "share-outline", onPress: () => console.log("Share") },
  ]}
/>
```

### 5. Custom Header

```tsx
<MobileHeader
  title="Edit Post"
  leftAction={{
    icon: "close",
    onPress: () => router.back(),
  }}
  rightComponent={<Text className="text-blue-500 font-semibold">Post</Text>}
/>
```

### 6. Dark Theme Header

```tsx
<MobileHeader
  title="Live Stream"
  backgroundColor="#0f172a"
  textColor="white"
  statusBarStyle="light-content"
  leftAction={{
    icon: "close",
    onPress: () => router.back(),
  }}
  rightActions={[
    { icon: "share-outline", onPress: () => console.log("Share") },
  ]}
/>
```

## Migration Guide

### From Old Header to New Header

**Before:**
```tsx
<AuthHeader title="Screen Title" />
```

**After:**
```tsx
<MobileHeader
  type="auth"
  title="Screen Title"
  leftAction={{
    icon: "arrow-back",
    onPress: () => router.back(),
  }}
/>
```

### From Old Header to Main Header

**Before:**
```tsx
<Header />
```

**After:**
```tsx
<MobileHeader
  type="main"
  user={userData}
  rightActions={[
    { icon: "search-outline", onPress: () => router.push("/search") },
    { icon: "notifications-outline", onPress: () => router.push("/notifications"), badge: true },
    { icon: "download-outline", onPress: () => router.push("/downloads") },
  ]}
/>
```

## Best Practices

### 1. Consistent Usage
- Use the same header type for similar screens
- Maintain consistent action button placement
- Use appropriate icons for actions

### 2. Accessibility
- Provide meaningful titles and subtitles
- Use proper touch target sizes (44x44 points minimum)
- Include proper accessibility labels

### 3. Performance
- Avoid unnecessary re-renders
- Use proper key props for lists
- Optimize image loading for avatars

### 4. Design Consistency
- Follow the established color scheme
- Use consistent spacing and typography
- Maintain visual hierarchy

## Troubleshooting

### Common Issues

1. **Status Bar Not Visible**
   - Ensure `statusBarStyle` is set correctly
   - Check if `translucent={true}` is needed

2. **Safe Area Issues**
   - Verify `SafeAreaView` is properly configured
   - Check `edges` prop for correct safe area handling

3. **Action Buttons Not Working**
   - Ensure `onPress` handlers are properly defined
   - Check if icons are valid Ionicons names

4. **Styling Issues**
   - Verify Tailwind classes are correct
   - Check if custom styles override default styles

## Future Enhancements

- [ ] Add animation support for header transitions
- [ ] Implement header collapse/expand functionality
- [ ] Add more header types (tabbed, segmented, etc.)
- [ ] Support for custom header backgrounds (gradients, images)
- [ ] Add header search integration
- [ ] Implement header gesture support

## Support

For questions or issues with the header system, please refer to:
- Component documentation in `HeaderExamples.tsx`
- Usage examples in existing screens
- This README file
