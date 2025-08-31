#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up localhost configuration for Jevah App...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file already exists');
} else {
  console.log('📝 Creating .env file for localhost configuration...');
  
  const envContent = `# API Configuration for Development
EXPO_PUBLIC_API_URL=http://localhost:8081/api

# Clerk Configuration
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZWxlZ2FudC10aWdlci0zNi5jbGVyay5hY2NvdW50cy5kZXYk

# Development Settings
EXPO_PUBLIC_IS_DEV=true
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully');
}

console.log('\n📋 Configuration Summary:');
console.log('   • API URL: http://localhost:8081/api');
console.log('   • Environment: Development');
console.log('   • Clerk: Configured for development');

console.log('\n🔧 Next Steps:');
console.log('   1. Make sure your backend server is running on localhost:8081');
console.log('   2. Restart your Expo development server');
console.log('   3. Test the login functionality');

console.log('\n💡 If you need to use a different port, update the .env file:');
console.log('   EXPO_PUBLIC_API_URL=http://localhost:YOUR_PORT/api');

console.log('\n✅ Localhost setup complete!');
