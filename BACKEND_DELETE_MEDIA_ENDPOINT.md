# Backend Delete Media Endpoint - Implementation Guide

## Issue
The frontend is trying to delete media using `DELETE /api/media/:id` but getting network errors. The request is not reaching the backend.

## Expected Endpoint

**Method:** `DELETE`  
**Endpoint:** `/api/media/:id`  
**Authorization:** Required (Bearer token)

### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
expo-platform: ios|android|web
```

### Request Example
```http
DELETE /api/media/690cc621f629c697f52d7206
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
expo-platform: ios
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

### Error Responses

#### 401 Unauthorized (No token or invalid token)
```json
{
  "success": false,
  "message": "Unauthorized: User not authenticated"
}
```

#### 403 Forbidden (User is not the creator)
```json
{
  "success": false,
  "message": "Unauthorized to delete this media"
}
```

#### 404 Not Found (Media doesn't exist)
```json
{
  "success": false,
  "message": "Media not found"
}
```

## Backend Implementation Checklist

- [ ] **Route exists:** Ensure `DELETE /api/media/:id` route is registered
- [ ] **Authentication middleware:** Verify token and extract user ID
- [ ] **Authorization check:** Verify user is the creator of the media
- [ ] **Media deletion:** Delete media record from database
- [ ] **File deletion:** Delete files from Cloudflare R2 (if applicable)
- [ ] **CORS configuration:** Ensure DELETE method is allowed
- [ ] **Error handling:** Return appropriate status codes and messages

## Backend Route Example (Node.js/Express)

```javascript
// routes/media.routes.js
router.delete('/api/media/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From JWT token
    
    // Find media
    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found"
      });
    }
    
    // Check ownership
    if (media.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this media"
      });
    }
    
    // Delete files from storage (Cloudflare R2, S3, etc.)
    if (media.fileUrl) {
      await deleteFileFromStorage(media.fileUrl);
    }
    if (media.thumbnailUrl) {
      await deleteFileFromStorage(media.thumbnailUrl);
    }
    
    // Delete from database
    await Media.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: "Media deleted successfully"
    });
  } catch (error) {
    console.error("Delete media error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete media"
    });
  }
});
```

## Authentication Middleware Example

```javascript
// middleware/auth.js
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated"
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token"
    });
  }
};
```

## CORS Configuration

Ensure your CORS configuration allows DELETE method:

```javascript
// app.js or server.js
const cors = require('cors');

app.use(cors({
  origin: '*', // Or specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'expo-platform'],
  credentials: true
}));
```

## Testing

### Test with cURL
```bash
curl -X DELETE \
  https://your-backend-url.com/api/media/690cc621f629c697f52d7206 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -H "expo-platform: ios"
```

### Expected Response
```json
{
  "success": true,
  "message": "Media deleted successfully"
}
```

## Frontend Request Details

The frontend is making the request with:
- **Method:** DELETE
- **Endpoint:** `/api/media/{mediaId}`
- **Headers:**
  - `Authorization: Bearer {token}`
  - `Content-Type: application/json`
  - `expo-platform: {ios|android|web}`
- **Timeout:** 30 seconds

## Common Issues

1. **Network Error:** Backend server might be down or unreachable
2. **CORS Error:** DELETE method not allowed in CORS configuration
3. **404 Error:** Route not registered or wrong path
4. **401 Error:** Token validation failing
5. **403 Error:** Ownership check failing

## Next Steps

1. Verify the endpoint exists on the backend
2. Test the endpoint with a tool like Postman or cURL
3. Check backend logs for any errors
4. Verify CORS configuration allows DELETE method
5. Ensure authentication middleware is working correctly

