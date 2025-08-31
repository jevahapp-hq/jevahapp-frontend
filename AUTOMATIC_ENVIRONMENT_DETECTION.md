# Automatic Environment Detection

## 🎯 How It Works

The app now **automatically detects** which environment to use based on the build type:

- **Development Mode** (`__DEV__ = true`) → Uses **Local Development** (`http://10.156.136.168:4000`)
- **Production Build** (`__DEV__ = false`) → Uses **Production** (`https://jevahapp-backend.onrender.com`)

## 🚀 Build Types

### Development (Expo Go, Development Server)
- ✅ Uses localhost automatically
- ✅ No configuration needed
- ✅ Perfect for testing with your local backend

### Production (APK, Hosted Builds)
- ✅ Uses production server automatically
- ✅ No configuration needed
- ✅ Works everywhere without local backend

## 🔧 Configuration

### Update Local IP Address

If your IP address changes, update it in `app/utils/environmentManager.ts`:

```tsx
const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  local: {
    url: 'http://YOUR_NEW_IP:4000', // Change this
    name: 'Local Development'
  },
  production: {
    url: 'https://jevahapp-backend.onrender.com',
    name: 'Production'
  }
};
```

### Check Your Current IP

Run this command to get your current IP:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## 📱 Usage

### For Development:
1. **Start your backend server** on port 4000
2. **Run the app in development mode** (`npx expo start`)
3. **App automatically uses localhost** - no configuration needed

### For Production:
1. **Build APK or deploy** (`eas build` or `expo build`)
2. **App automatically uses production** - no configuration needed

## 🔍 Debugging

Check the console logs to see which environment is being used:

```
🌐 Auto-detected environment: local
🌐 Auto-detected API Base URL: http://10.156.136.168:4000
```

## ✅ Benefits

- **Zero Configuration**: Works out of the box
- **Automatic Switching**: No manual intervention needed
- **Perfect for Expo Go**: Automatically uses localhost in development
- **Perfect for Production**: Automatically uses hosted server in builds
- **No Debug UI**: Clean interface without environment switchers

## 🎯 Perfect for Your Workflow

- **Development**: Use Expo Go → automatically connects to localhost
- **Testing**: Build APK → automatically connects to production
- **Deployment**: Deploy to hosting → automatically connects to production

No more manual switching or configuration needed!
