# Real-Time Upload Progress - Backend Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Why Real-Time Progress?](#why-real-time-progress)
3. [Implementation Options](#implementation-options)
4. [WebSocket Implementation](#websocket-implementation)
5. [Server-Sent Events (SSE) Implementation](#server-sent-events-sse-implementation)
6. [Hybrid Approach (Recommended)](#hybrid-approach-recommended)
7. [Backend API Changes](#backend-api-changes)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)
10. [Security Considerations](#security-considerations)

---

## Overview

Currently, the frontend uses a simulated progress indicator during content verification. To provide accurate, real-time progress updates, the backend needs to send progress events during the upload and verification process.

This document outlines how to implement real-time progress updates using WebSocket or Server-Sent Events (SSE).

---

## Why Real-Time Progress?

### Current Limitations
- Frontend simulates progress (10% → 85% over time)
- No actual feedback from backend verification process
- Users don't know if verification is stuck or progressing
- Poor user experience during long verification times

### Benefits of Real-Time Progress
- ✅ Accurate progress based on actual backend processing
- ✅ Better user experience with real feedback
- ✅ Ability to show specific verification stages
- ✅ Early error detection and reporting
- ✅ Reduced user anxiety during long operations

---

## Implementation Options

### Option 1: WebSocket (Bidirectional)
- **Pros**: Full bidirectional communication, can handle multiple operations
- **Cons**: More complex, requires connection management, higher resource usage
- **Best for**: Multiple concurrent uploads, complex state management

### Option 2: Server-Sent Events (SSE) (Unidirectional)
- **Pros**: Simpler implementation, HTTP-based, automatic reconnection
- **Cons**: One-way communication only, less flexible
- **Best for**: Simple progress updates, single upload at a time

### Option 3: Hybrid Approach (Recommended)
- **Pros**: Best of both worlds, flexible, scalable
- **Cons**: More initial setup
- **Best for**: Production applications with multiple features

---

## WebSocket Implementation

### Backend Setup (Node.js/Express Example)

#### 1. Install Dependencies

```bash
npm install ws socket.io
# or
npm install ws
```

#### 2. WebSocket Server Setup

```javascript
// server.js or app.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Store active upload sessions
const uploadSessions = new Map();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  // Extract token from query or headers
  const token = req.url.split('token=')[1]?.split('&')[0];
  
  // Authenticate connection
  if (!token) {
    ws.close(1008, 'Authentication required');
    return;
  }

  // Verify token and get user ID
  const userId = verifyToken(token);
  if (!userId) {
    ws.close(1008, 'Invalid token');
    return;
  }

  ws.userId = userId;
  ws.isAlive = true;

  // Heartbeat to keep connection alive
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe') {
        // Client subscribes to upload progress
        ws.uploadId = data.uploadId;
        console.log(`Client subscribed to upload: ${data.uploadId}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Heartbeat interval (every 30 seconds)
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Helper function to send progress to specific client
function sendProgress(uploadId, progress, stage, message) {
  wss.clients.forEach((ws) => {
    if (ws.uploadId === uploadId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'progress',
        uploadId,
        progress,
        stage,
        message,
        timestamp: new Date().toISOString()
      }));
    }
  });
}

module.exports = { server, sendProgress, uploadSessions };
```

#### 3. Upload Endpoint with Progress

```javascript
// routes/upload.js
const express = require('express');
const multer = require('multer');
const { sendProgress } = require('../server');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

router.post('/api/media/upload', verifyToken, upload.single('file'), async (req, res) => {
  const uploadId = req.headers['x-upload-id'] || generateUploadId();
  const file = req.file;
  
  try {
    // Stage 1: File received (10%)
    sendProgress(uploadId, 10, 'file_received', 'File received, starting verification...');

    // Stage 2: File validation (20%)
    await new Promise(resolve => setTimeout(resolve, 500));
    sendProgress(uploadId, 20, 'validating', 'Validating file format...');

    // Stage 3: AI Content Analysis (30-70%)
    sendProgress(uploadId, 30, 'analyzing', 'Analyzing content with AI...');
    
    // Simulate AI analysis progress
    for (let progress = 35; progress <= 70; progress += 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      sendProgress(
        uploadId, 
        progress, 
        'analyzing', 
        `AI verification in progress... ${progress}%`
      );
    }

    // Stage 4: Content moderation (70-85%)
    sendProgress(uploadId, 75, 'moderating', 'Checking content guidelines...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    sendProgress(uploadId, 85, 'moderating', 'Content guidelines check complete');

    // Stage 5: Processing and saving (85-95%)
    sendProgress(uploadId, 90, 'processing', 'Processing and saving content...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stage 6: Finalizing (95-100%)
    sendProgress(uploadId, 95, 'finalizing', 'Finalizing upload...');
    await new Promise(resolve => setTimeout(resolve, 500));
    sendProgress(uploadId, 100, 'complete', 'Upload complete!');

    // Return success response
    res.status(200).json({
      success: true,
      data: {
        media: {
          _id: generateMediaId(),
          title: req.body.title,
          fileUrl: file.path,
          // ... other fields
        }
      },
      uploadId
    });

  } catch (error) {
    sendProgress(uploadId, 0, 'error', `Upload failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function generateUploadId() {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;
```

#### 4. Progress Stages

```javascript
// constants/progressStages.js
const PROGRESS_STAGES = {
  FILE_RECEIVED: {
    progress: 10,
    message: 'File received, starting verification...'
  },
  VALIDATING: {
    progress: 20,
    message: 'Validating file format...'
  },
  ANALYZING: {
    progress: 30,
    message: 'Analyzing content with AI...'
  },
  MODERATING: {
    progress: 70,
    message: 'Checking content guidelines...'
  },
  PROCESSING: {
    progress: 85,
    message: 'Processing and saving content...'
  },
  FINALIZING: {
    progress: 95,
    message: 'Finalizing upload...'
  },
  COMPLETE: {
    progress: 100,
    message: 'Upload complete!'
  }
};

module.exports = PROGRESS_STAGES;
```

---

## Server-Sent Events (SSE) Implementation

### Backend Setup

#### 1. SSE Endpoint

```javascript
// routes/upload.js
router.get('/api/media/upload/:uploadId/progress', verifyToken, (req, res) => {
  const { uploadId } = req.params;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Store the response for this upload
  uploadSessions.set(uploadId, res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    uploadId,
    message: 'Connected to progress stream'
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    uploadSessions.delete(uploadId);
    console.log(`SSE connection closed for upload: ${uploadId}`);
  });
});

// Helper function to send SSE progress
function sendSSEProgress(uploadId, progress, stage, message) {
  const res = uploadSessions.get(uploadId);
  if (res && !res.destroyed) {
    res.write(`data: ${JSON.stringify({
      type: 'progress',
      uploadId,
      progress,
      stage,
      message,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }
}
```

#### 2. Upload Endpoint with SSE

```javascript
router.post('/api/media/upload', verifyToken, upload.single('file'), async (req, res) => {
  const uploadId = req.headers['x-upload-id'] || generateUploadId();
  const file = req.file;
  
  try {
    // Send progress via SSE
    sendSSEProgress(uploadId, 10, 'file_received', 'File received...');
    
    // ... rest of upload logic with progress updates
    
    res.status(200).json({
      success: true,
      data: { media: { /* ... */ } },
      uploadId
    });

  } catch (error) {
    sendSSEProgress(uploadId, 0, 'error', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## Hybrid Approach (Recommended)

### Architecture

```
Client                    Backend
  |                          |
  |-- POST /upload --------->|
  |<-- uploadId ------------|
  |                          |
  |-- WS/SSE Connect ------->|
  |   (with uploadId)        |
  |                          |
  |<-- Progress Updates -----|
  |   (10%, 20%, ...)        |
  |                          |
  |<-- Complete (100%) -----|
```

### Implementation

```javascript
// Hybrid: Use SSE for progress, WebSocket for other features
const express = require('express');
const { EventEmitter } = require('events');

class UploadProgressEmitter extends EventEmitter {}
const progressEmitter = new UploadProgressEmitter();

// SSE endpoint for progress
router.get('/api/media/upload/:uploadId/progress', (req, res) => {
  const { uploadId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const progressHandler = (data) => {
    if (data.uploadId === uploadId) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  progressEmitter.on('progress', progressHandler);

  req.on('close', () => {
    progressEmitter.off('progress', progressHandler);
  });
});

// Upload endpoint
router.post('/api/media/upload', async (req, res) => {
  const uploadId = generateUploadId();
  
  // Emit progress events
  progressEmitter.emit('progress', {
    uploadId,
    progress: 10,
    stage: 'file_received',
    message: 'File received...'
  });

  // ... continue with upload logic
});
```

---

## Backend API Changes

### New Endpoints

#### 1. Progress Stream Endpoint

**SSE Endpoint:**
```
GET /api/media/upload/:uploadId/progress
Headers:
  Authorization: Bearer <token>
```

**WebSocket Endpoint:**
```
WS /ws?token=<token>
Message Format:
  {
    "type": "subscribe",
    "uploadId": "upload_123456"
  }
```

### Response Format

```json
{
  "type": "progress",
  "uploadId": "upload_1234567890",
  "progress": 45,
  "stage": "analyzing",
  "message": "AI verification in progress... 45%",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Progress Stages

| Stage | Progress | Description |
|-------|----------|-------------|
| `file_received` | 10% | File uploaded to server |
| `validating` | 20% | Validating file format and size |
| `analyzing` | 30-70% | AI content analysis |
| `moderating` | 70-85% | Content moderation check |
| `processing` | 85-95% | Processing and saving |
| `finalizing` | 95-99% | Finalizing upload |
| `complete` | 100% | Upload complete |
| `error` | 0% | Error occurred |

---

## Frontend Integration

### WebSocket Client (React Native)

```typescript
// utils/uploadWebSocket.ts
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;

export async function connectUploadProgress(uploadId: string) {
  const token = await AsyncStorage.getItem('token');
  
  socket = io('wss://your-backend.com', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
    socket?.emit('subscribe', { uploadId });
  });

  socket.on('progress', (data: {
    uploadId: string;
    progress: number;
    stage: string;
    message: string;
  }) => {
    // Update progress state
    onProgressUpdate?.(data);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return socket;
}

export function disconnectUploadProgress() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

### SSE Client (React Native)

```typescript
// utils/uploadSSE.ts
export function connectUploadProgressSSE(
  uploadId: string,
  onProgress: (data: ProgressData) => void
) {
  const token = AsyncStorage.getItem('token');
  
  const eventSource = new EventSource(
    `https://your-backend.com/api/media/upload/${uploadId}/progress?token=${token}`
  );

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onProgress(data);
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };

  return eventSource;
}
```

### Usage in Upload Component

```typescript
// app/categories/upload.tsx
import { connectUploadProgressSSE } from '../../utils/uploadSSE';

const handleUpload = async () => {
  // Start upload
  const formData = new FormData();
  // ... prepare form data

  // Get upload ID from response headers or generate one
  const uploadId = `upload_${Date.now()}`;
  
  // Connect to progress stream
  const eventSource = connectUploadProgressSSE(uploadId, (data) => {
    setUploadState({
      status: data.stage === 'complete' ? 'success' : 'verifying',
      progress: data.progress,
      message: data.message,
    });
  });

  try {
    const response = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Upload-ID': uploadId, // Send upload ID in header
      },
      body: formData,
    });

    // ... handle response
  } finally {
    eventSource.close();
  }
};
```

---

## Testing

### Test Cases

1. **Basic Progress Flow**
   - Upload file
   - Verify progress updates from 10% → 100%
   - Check all stages are received

2. **Connection Handling**
   - Test reconnection on disconnect
   - Test multiple concurrent uploads
   - Test connection timeout

3. **Error Handling**
   - Test progress on upload failure
   - Test connection errors
   - Test invalid upload ID

4. **Performance**
   - Test with large files (500MB+)
   - Test with slow network
   - Test with multiple users

### Example Test Script

```javascript
// tests/uploadProgress.test.js
describe('Upload Progress', () => {
  it('should receive progress updates', async () => {
    const uploadId = 'test_upload_123';
    
    // Connect to progress stream
    const eventSource = new EventSource(
      `/api/media/upload/${uploadId}/progress`
    );

    const progressUpdates = [];
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      progressUpdates.push(data.progress);
    };

    // Start upload
    await uploadFile(uploadId);

    // Wait for completion
    await waitFor(() => {
      expect(progressUpdates).toContain(100);
    }, 30000);

    eventSource.close();
  });
});
```

---

## Security Considerations

### 1. Authentication
- ✅ Verify token on WebSocket/SSE connection
- ✅ Validate user owns the upload session
- ✅ Rate limit connections per user

### 2. Authorization
- ✅ Check user can access upload progress
- ✅ Prevent access to other users' uploads
- ✅ Validate upload ID format

### 3. Data Validation
- ✅ Sanitize progress messages
- ✅ Validate progress values (0-100)
- ✅ Prevent injection attacks

### 4. Resource Management
- ✅ Clean up connections on disconnect
- ✅ Set connection timeouts
- ✅ Limit concurrent connections per user

### Example Security Middleware

```javascript
// middleware/uploadAuth.js
function verifyUploadAccess(req, res, next) {
  const { uploadId } = req.params;
  const userId = req.user._id;

  // Check if user owns this upload
  const upload = uploadSessions.get(uploadId);
  if (!upload || upload.userId !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  next();
}
```

---

## Implementation Checklist

### Backend
- [ ] Install WebSocket/SSE library
- [ ] Set up WebSocket server or SSE endpoint
- [ ] Add progress tracking to upload endpoint
- [ ] Implement progress emission at each stage
- [ ] Add authentication middleware
- [ ] Add error handling
- [ ] Add connection cleanup
- [ ] Test with multiple concurrent uploads

### Frontend
- [ ] Install WebSocket/SSE client library
- [ ] Create progress connection utility
- [ ] Update upload component to use real progress
- [ ] Handle connection errors
- [ ] Handle reconnection
- [ ] Update UI to show stage messages
- [ ] Test on slow networks
- [ ] Test error scenarios

### Testing
- [ ] Unit tests for progress stages
- [ ] Integration tests for WebSocket/SSE
- [ ] Load testing with multiple users
- [ ] Network failure scenarios
- [ ] Error handling tests

---

## Migration Guide

### Phase 1: Backend Implementation
1. Add WebSocket/SSE server
2. Update upload endpoint to emit progress
3. Test backend independently

### Phase 2: Frontend Integration
1. Add WebSocket/SSE client
2. Update upload component
3. Keep fallback to simulated progress

### Phase 3: Rollout
1. Enable for beta users
2. Monitor performance
3. Gradual rollout to all users

---

## Performance Considerations

### WebSocket
- **Connection Pool**: Limit concurrent connections
- **Message Size**: Keep progress messages small (< 1KB)
- **Heartbeat**: Use ping/pong to detect dead connections
- **Reconnection**: Implement exponential backoff

### SSE
- **Connection Limits**: Nginx default is 100 per IP
- **Buffering**: Disable buffering for real-time updates
- **Keep-Alive**: Set appropriate timeout values
- **CORS**: Configure CORS headers properly

---

## Monitoring

### Metrics to Track
- Connection count
- Message throughput
- Connection duration
- Error rates
- Reconnection frequency

### Example Monitoring

```javascript
// monitoring.js
const metrics = {
  connections: 0,
  messagesSent: 0,
  errors: 0
};

wss.on('connection', () => {
  metrics.connections++;
});

function sendProgress(uploadId, progress, stage, message) {
  // ... send progress
  metrics.messagesSent++;
}
```

---

## Support

For questions or issues:
- Backend Team: [Contact Info]
- Frontend Team: [Contact Info]

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Status:** Ready for Implementation




