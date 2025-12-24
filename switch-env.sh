#!/bin/bash

# Script to switch between localhost and production environments

echo "🌐 Environment Switcher"
echo "======================"
echo "1. Local Development (localhost:4000)"
echo "2. Production (jevahapp-backend.onrender.com)"
echo "3. Check current environment"
echo ""

read -p "Choose an option (1-3): " choice

case $choice in
    1)
        echo "🔄 Switching to LOCAL DEVELOPMENT..."
        echo "EXPO_PUBLIC_API_URL=http://10.156.136.168:4000" > .env.local
        echo "✅ Set to localhost: http://10.156.136.168:4000"
        echo "📝 Make sure your backend server is running on port 4000"
        ;;
    2)
        echo "🔄 Switching to PRODUCTION..."
        echo "EXPO_PUBLIC_API_URL=https://jevahapp-backend.onrender.com" > .env.local
        echo "✅ Set to production: https://jevahapp-backend.onrender.com"
        ;;
    3)
        echo "📋 Current environment:"
        if [ -f .env.local ]; then
            cat .env.local
        else
            echo "No .env.local file found"
        fi
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "🔄 Restart your Expo server with: npx expo start --clear"
