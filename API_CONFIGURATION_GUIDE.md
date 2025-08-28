# API Configuration Guide

## Overview
The app now supports both development (localhost) and production (hosted) backend environments with automatic fallback.

## Configuration Options

### 1. Environment Variables (Recommended)
Create a `.env` file in the root directory:

```bash
# For development (localhost)
EXPO_PUBLIC_API_URL=http://localhost:8081/api

# For production (hosted backend)
# EXPO_PUBLIC_API_URL=https://jevahapp-backend.onrender.com/api

# Other environment variables
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key_here
```

### 2. Automatic Fallback
If no environment variable is set, the app automatically uses the production URL:
- **Production URL**: `https://jevahapp-backend.onrender.com/api/auth`

## How It Works

### Priority Order:
1. **Environment Variable** (`EXPO_PUBLIC_API_URL`) - if set
2. **Production URL** - as fallback

### Files Updated:
- `app/auth/codeVerification.tsx` - Uses `getApiBaseUrl()` function
- `app/services/authService.ts` - Uses `getApiBaseUrl()` function  
- `app/utils/api.ts` - Uses `getApiBaseUrl()` function

## Usage Examples

### Development Setup:
```bash
# .env file
EXPO_PUBLIC_API_URL=http://localhost:8081/api
```

### Production Setup:
```bash
# .env file (optional - will use fallback)
EXPO_PUBLIC_API_URL=https://jevahapp-backend.onrender.com/api
```

### No .env file:
- App automatically uses production URL

## Benefits

1. **Consistent Configuration**: All API calls use the same base URL
2. **Environment Flexibility**: Easy switching between dev/prod
3. **Automatic Fallback**: No configuration needed for production
4. **Timeout Handling**: 10-second timeouts prevent hanging requests
5. **Better Error Messages**: Specific error messages for different failure types

## Testing

To test the configuration:
1. Check console logs for "🌐 Using API URL:" messages
2. Verify network requests are going to the correct endpoint
3. Test both development and production environments
