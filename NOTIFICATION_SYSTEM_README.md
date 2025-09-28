# 🔔 Real-Time Notification System

## 🎯 **Overview**

Your notification system has been completely refactored to work with real backend APIs and real-time updates using Socket.IO. The system now supports:

- **Real-time notifications** via Socket.IO
- **Backend API integration** with your Jevah App backend
- **Modern UI** with proper grouping and pagination
- **Rich metadata** including user avatars, content thumbnails, and interaction counts
- **Smart grouping** by time periods (New, Last 7 days, Last 30 days)

## 🏗️ **Architecture**

### **New Files Created:**

1. **`app/services/NotificationAPIService.ts`** - Main API service for notifications
2. **`app/hooks/useNotifications.ts`** - React hooks for real-time notifications
3. **`app/components/NotificationBadge.tsx`** - Reusable notification badge component
4. **`app/components/NotificationTestPanel.tsx`** - Test component for debugging

### **Updated Files:**

1. **`app/noitfication/NotificationsScreen.tsx`** - Completely refactored with real-time data
2. **`app/components/Header.tsx`** - Updated to use new notification badge

## 📡 **API Endpoints Used**

The system expects these endpoints on your backend:

```typescript
// Get notifications
GET /api/notifications?page=1&limit=20&type=like&unreadOnly=true

// Mark as read
PATCH /api/notifications/:notificationId/read

// Mark all as read
PATCH /api/notifications/mark-all-read

// Get preferences
GET /api/notifications/preferences

// Update preferences
PUT /api/notifications/preferences

// Get stats
GET /api/notifications/stats
```

## 🔌 **Socket.IO Events**

### **Client → Server:**

- `mark_notification_read` - Mark a notification as read
- `mark_all_notifications_read` - Mark all notifications as read

### **Server → Client:**

- `new_notification` - New notification received
- `notification_read` - Notification marked as read
- `notification_deleted` - Notification deleted

## 🎨 **Notification Types Supported**

```typescript
type NotificationType =
  | "follow" // User followed you
  | "like" // Someone liked your content
  | "comment" // Someone commented on your content
  | "share" // Someone shared your content
  | "mention" // Someone mentioned you
  | "download" // Someone downloaded your content
  | "bookmark" // Someone saved your content
  | "milestone" // Achievement unlocked
  | "public_activity" // Public activity from followed users
  | "system" // System notifications
  | "security" // Security alerts
  | "live_stream" // Live stream notifications
  | "merch_purchase"; // Merchandise purchase
```

## 🚀 **How to Use**

### **1. Basic Usage in Components:**

```typescript
import { useNotifications } from "../hooks/useNotifications";

function MyComponent() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  return (
    <View>
      <Text>Unread: {unreadCount}</Text>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification._id}
          notification={notification}
          onPress={() => markAsRead(notification._id)}
        />
      ))}
    </View>
  );
}
```

### **2. Using Notification Badge:**

```typescript
import { NotificationBadge } from "../components/NotificationBadge";

function Header() {
  return (
    <View>
      <NotificationBadge
        size="medium"
        onPress={() => navigateToNotifications()}
      />
    </View>
  );
}
```

### **3. Testing the System:**

Add the test panel to any screen temporarily:

```typescript
import { NotificationTestPanel } from "../components/NotificationTestPanel";

function TestScreen() {
  return (
    <View>
      <NotificationTestPanel />
    </View>
  );
}
```

## 🔧 **Configuration**

### **Backend URL:**

The system uses your backend URL: `https://jevahapp-backend.onrender.com`

### **Authentication:**

Uses the token from `AsyncStorage.getItem('userToken')`

### **Socket.IO Connection:**

Automatically connects to your backend with authentication

## 📱 **Features**

### **Real-Time Updates:**

- New notifications appear instantly
- Read status updates in real-time
- Badge counts update automatically

### **Smart Grouping:**

- **New**: Last 24 hours
- **Last 7 days**: 2-7 days ago
- **Last 30 days**: 8-30 days ago

### **Rich UI:**

- User avatars and names
- Content thumbnails
- Interaction counts
- Time formatting
- Unread indicators

### **Pagination:**

- Loads 20 notifications at a time
- Infinite scroll support
- Pull-to-refresh

## 🧪 **Testing**

### **1. Install Dependencies:**

```bash
npm install socket.io-client
```

### **2. Test API Endpoints:**

Use the `NotificationTestPanel` component to test:

- Get notifications
- Get stats
- Get preferences

### **3. Test Real-Time:**

- Open the app on multiple devices
- Perform actions that trigger notifications
- Verify real-time updates

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **Socket Connection Failed:**

   - Check if backend supports Socket.IO
   - Verify authentication token
   - Check network connectivity

2. **API Errors:**

   - Verify backend endpoints exist
   - Check authentication headers
   - Review API response format

3. **No Notifications:**
   - Check if backend is creating notifications
   - Verify user authentication
   - Test with NotificationTestPanel

### **Debug Mode:**

Enable console logging by checking the browser/device console for:

- `🔌 Connected to notification socket`
- `🔔 New notification received`
- `✅ Notification marked as read`

## 🔄 **Migration from Old System**

The old notification system has been completely replaced. Key changes:

1. **Data Structure:** Changed from local storage to API-based
2. **Real-Time:** Added Socket.IO for instant updates
3. **UI:** Modern design with better grouping and pagination
4. **Badge:** New component with real-time updates

## 📊 **Performance**

- **Lazy Loading:** Notifications load as needed
- **Efficient Updates:** Only changed notifications update
- **Memory Management:** Automatic cleanup of old notifications
- **Network Optimization:** Batched API calls and efficient Socket.IO usage

## 🎯 **Next Steps**

1. **Backend Integration:** Ensure your backend implements the required endpoints
2. **Socket.IO Setup:** Configure Socket.IO on your backend
3. **Testing:** Use the test panel to verify everything works
4. **Customization:** Adjust notification types and UI as needed

Your notification system is now ready for production with real-time capabilities! 🚀

