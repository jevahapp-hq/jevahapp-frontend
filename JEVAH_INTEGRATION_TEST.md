# Jevah Backend Integration Test Guide

## 🧪 Testing the Complete Authentication Flow

This guide helps you test the integration with the Jevah backend API.

## 📋 Prerequisites

1. **Backend Status**: Ensure the Jevah backend is running at `https://jevahapp-backend.onrender.com`
2. **Network**: Stable internet connection
3. **Test Email**: Use a real email address you can access

## 🔄 Test Scenarios

### 1. **Login Flow Test**

**Steps:**
1. Navigate to `/auth/login`
2. Enter a valid email and password
3. Click "Sign In"

**Expected Results:**
- ✅ Should authenticate successfully
- ✅ Should navigate to `/categories/HomeScreen`
- ✅ Should store token in AsyncStorage
- ✅ Console should show login success logs

**Error Cases:**
- ❌ Invalid credentials should show error message
- ❌ Network errors should be handled gracefully

### 2. **Signup Flow Test**

**Steps:**
1. Navigate to `/auth/signup`
2. Fill in all required fields:
   - First Name
   - Last Name
   - Email (use a new email)
   - Password (minimum 6 characters)
3. Click "Sign Up"

**Expected Results:**
- ✅ Should register successfully
- ✅ Should show verification modal
- ✅ Should store token in AsyncStorage
- ✅ Console should show registration success logs

**Error Cases:**
- ❌ Invalid email format should show validation error
- ❌ Weak password should show validation error
- ❌ Duplicate email should show appropriate error

### 3. **Password Reset Flow Test**

#### Step 1: Request Reset Code
1. Navigate to `/auth/forgetPassword`
2. Enter a valid email address
3. Click "Submit"

**Expected Results:**
- ✅ Should show email confirmation modal
- ✅ Console should show forgot password request logs
- ✅ Should receive email with 6-digit code

#### Step 2: Verify Reset Code
1. Click "Okay, Got It" on the modal
2. Navigate to verify-reset screen
3. Enter the 6-digit code from email
4. Click "Verify"

**Expected Results:**
- ✅ Should verify code successfully
- ✅ Should navigate to reset password screen
- ✅ Console should show verification success logs

#### Step 3: Reset Password
1. Enter new password (minimum 6 characters)
2. Confirm new password
3. Click "Submit"

**Expected Results:**
- ✅ Should reset password successfully
- ✅ Should navigate to login screen
- ✅ Console should show reset success logs

**Error Cases:**
- ❌ Invalid code should show error
- ❌ Expired code should show error
- ❌ Weak password should show validation error
- ❌ Mismatched passwords should show error

### 4. **Resend Code Test**

**Steps:**
1. On verify-reset screen, click "Resend Code"
2. Wait for new email
3. Use the new code to verify

**Expected Results:**
- ✅ Should send new code successfully
- ✅ Should show success message
- ✅ New code should work for verification

## 🔍 Console Logging Verification

### Expected Log Patterns:

```javascript
// Login
🔍 Logging in user: user@example.com
✅ Login response: { success: true, token: "...", user: {...} }

// Registration
🔍 Registering user: newuser@example.com
✅ Register response: { success: true, token: "...", user: {...} }

// Forgot Password
🔍 Sending forgot password request for: user@example.com
📧 Forgot password response: { success: true, message: "..." }

// Verify Code
🔍 Verifying reset code for: user@example.com code: 123456
✅ Verify reset code response: { success: true, message: "..." }

// Reset Password
🔍 Resetting password for: user@example.com
✅ Reset password response: { success: true, message: "..." }
```

## 🚨 Common Issues & Solutions

### 1. **Network Errors**
- **Symptom**: "Network error occurred" messages
- **Solution**: Check internet connection and backend status

### 2. **Invalid Email Format**
- **Symptom**: Email validation errors
- **Solution**: Ensure email follows standard format (user@domain.com)

### 3. **Weak Password**
- **Symptom**: Password validation errors
- **Solution**: Use password with at least 6 characters

### 4. **Expired Codes**
- **Symptom**: "Invalid or expired reset code" errors
- **Solution**: Codes expire after 10 minutes, request new one

### 5. **Rate Limiting**
- **Symptom**: "Too many requests" errors
- **Solution**: Wait 15 minutes before retrying

## 📱 Device Testing

### Test on Multiple Devices:
- ✅ iOS Simulator
- ✅ Android Emulator
- ✅ Physical iOS device
- ✅ Physical Android device

### Test Different Screen Sizes:
- ✅ iPhone SE (small)
- ✅ iPhone 14 (medium)
- ✅ iPhone 14 Pro Max (large)
- ✅ iPad (tablet)

## 🔧 Debug Mode

### Enable Debug Logging:
All API calls include detailed console logging with emojis for easy identification:

```javascript
// Look for these patterns in console:
🔍 - API request starting
✅ - API response success
❌ - API error occurred
📧 - Email-related operations
```

### Network Tab:
Check browser/device network tab for:
- Request URLs (should be `https://jevahapp-backend.onrender.com/api/auth/...`)
- Request methods (POST)
- Request headers (Content-Type: application/json)
- Response status codes (200, 400, 404, 429)
- Response bodies (JSON format)

## ✅ Success Criteria

The integration is successful when:

1. **All flows work end-to-end** without errors
2. **Console logging shows** proper API communication
3. **Error handling works** for all edge cases
4. **UI responds appropriately** to all scenarios
5. **Token management works** correctly
6. **Navigation flows** as expected
7. **Data persistence** works in AsyncStorage

## 📞 Support

If you encounter issues:

1. **Check console logs** for detailed error information
2. **Verify backend status** at the API endpoint
3. **Test with Postman** to isolate frontend/backend issues
4. **Check network connectivity** and firewall settings
5. **Review error messages** for specific guidance

---

**Note**: This integration uses the production Jevah backend. For development testing, consider using test accounts or staging environments.


