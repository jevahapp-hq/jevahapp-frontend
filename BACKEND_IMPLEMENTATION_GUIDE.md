# Backend Implementation Guide for Forgot Password Flow

## Required Endpoints

Based on your current backend code, you have the `/reset-password` endpoint. You need to implement two additional endpoints to complete the forgot password flow:

### 1. Forgot Password Endpoint
```javascript
router.post(
  "/forgot-password",
  sensitiveEndpointRateLimiter,
  asyncHandler(authController.forgotPassword)
);
```

**Controller Implementation:**
```javascript
async forgotPassword(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { email } = request.body;

    if (!email) {
      return response.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return response.status(200).json({
        success: true,
        message: "If the email exists, a reset code has been sent",
      });
    }

    // Generate 6-character alphanumeric code
    const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Store reset code and expiration (10 minutes)
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send email with reset code
    // Implement your email sending logic here
    await sendResetEmail(email, resetCode);

    return response.status(200).json({
      success: true,
      message: "Reset code sent to email",
    });
  } catch (error) {
    return next(error);
  }
}
```

### 2. Verify Reset Code Endpoint
```javascript
router.post(
  "/verify-reset-code",
  sensitiveEndpointRateLimiter,
  asyncHandler(authController.verifyResetCode)
);
```

**Controller Implementation:**
```javascript
async verifyResetCode(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { email, code } = request.body;

    if (!email || !code) {
      return response.status(400).json({
        success: false,
        message: "Email and code are required",
      });
    }

    const user = await User.findOne({
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return response.status(400).json({
        success: false,
        message: "Invalid or expired reset code",
      });
    }

    return response.status(200).json({
      success: true,
      message: "Code verified successfully",
    });
  } catch (error) {
    return next(error);
  }
}
```

### 3. Update Your Existing Reset Password Endpoint
Your existing `/reset-password` endpoint looks good, but make sure it matches this structure:

```javascript
async resetPassword(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { email, token, newPassword } = request.body;

    if (!email || !token || !newPassword) {
      return response.status(400).json({
        success: false,
        message: "Email, token, and new password are required",
      });
    }

    await authService.resetPassword(email, token, newPassword);

    return response.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid or expired reset token"
    ) {
      return response.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
}
```

## User Model Schema Requirements

Make sure your User model includes these fields:

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  // ... other fields
});
```

## Email Service Implementation

You'll need to implement an email service to send the reset codes. Here's a basic example using nodemailer:

```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  // Configure your email service
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendResetEmail(email, code) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Code',
    html: `
      <h2>Password Reset Request</h2>
      <p>Your password reset code is: <strong>${code}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
```

## Environment Variables

Add these to your `.env` file:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Rate Limiting

Make sure your `sensitiveEndpointRateLimiter` is configured to prevent abuse:

```javascript
import rateLimit from 'express-rate-limit';

const sensitiveEndpointRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
```

## Testing the Flow

1. **Test Forgot Password**: Send POST to `/forgot-password` with email
2. **Test Verify Code**: Send POST to `/verify-reset-code` with email and code
3. **Test Reset Password**: Send POST to `/reset-password` with email, token, and newPassword

## Security Considerations

1. **Don't reveal if email exists** in forgot password endpoint
2. **Use secure random codes** (alphanumeric, 6 characters)
3. **Set expiration times** (10 minutes recommended)
4. **Rate limit sensitive endpoints**
5. **Hash passwords** before storing
6. **Use HTTPS** in production
7. **Validate email format** on both frontend and backend
