#!/usr/bin/env node

/**
 * TikTok-Style UI Integration Test Script
 * 
 * This script tests the integration between your frontend and the new TikTok-style backend endpoints.
 * Run this script to verify that all endpoints are working correctly.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.jevahapp.com";

// Test endpoints
const ENDPOINTS = [
  {
    name: "Public All Content",
    url: "/api/media/public/all-content",
    method: "GET",
    auth: false,
    description: "Returns all media content without authentication"
  },
  {
    name: "Authenticated All Content", 
    url: "/api/media/all-content",
    method: "GET",
    auth: true,
    description: "Returns all media content with user-specific data"
  },
  {
    name: "Default Content",
    url: "/api/media/default",
    method: "GET", 
    auth: false,
    description: "Returns default/onboarding content"
  },
  {
    name: "Regular Media",
    url: "/api/media",
    method: "GET",
    auth: false,
    description: "Returns regular media with pagination"
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️ ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}`);
}

// Test a single endpoint
async function testEndpoint(endpoint) {
  logHeader(`Testing ${endpoint.name}`);
  logInfo(`URL: ${API_BASE_URL}${endpoint.url}`);
  logInfo(`Method: ${endpoint.method}`);
  logInfo(`Auth Required: ${endpoint.auth ? 'Yes' : 'No'}`);
  logInfo(`Description: ${endpoint.description}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth header if required (you'll need to provide a valid token)
    if (endpoint.auth) {
      const token = process.env.TEST_TOKEN || 'your-test-token-here';
      headers['Authorization'] = `Bearer ${token}`;
      logWarning('Using test token - replace with real token for authenticated endpoints');
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint.url}`, {
      method: endpoint.method,
      headers
    });
    
    logInfo(`Response Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Analyze response structure
      logSuccess(`Endpoint is working!`);
      logInfo(`Response Structure:`);
      
      if (data.success !== undefined) {
        log(`  - success: ${data.success}`, 'green');
      }
      
      if (data.media) {
        log(`  - media: Array with ${data.media.length} items`, 'green');
        
        // Analyze first media item
        if (data.media.length > 0) {
          const firstItem = data.media[0];
          logInfo(`  - First item structure:`);
          log(`    - _id: ${firstItem._id || 'N/A'}`, 'cyan');
          log(`    - title: ${firstItem.title || 'N/A'}`, 'cyan');
          log(`    - contentType: ${firstItem.contentType || 'N/A'}`, 'cyan');
          log(`    - fileUrl: ${firstItem.fileUrl ? 'Present' : 'Missing'}`, 'cyan');
          log(`    - thumbnailUrl: ${firstItem.thumbnailUrl ? 'Present' : 'Missing'}`, 'cyan');
          log(`    - authorInfo: ${firstItem.authorInfo ? 'Present' : 'Missing'}`, 'cyan');
        }
      } else if (data.data?.content) {
        log(`  - data.content: Array with ${data.data.content.length} items`, 'green');
        
        // Analyze first content item
        if (data.data.content.length > 0) {
          const firstItem = data.data.content[0];
          logInfo(`  - First item structure:`);
          log(`    - _id: ${firstItem._id || 'N/A'}`, 'cyan');
          log(`    - title: ${firstItem.title || 'N/A'}`, 'cyan');
          log(`    - contentType: ${firstItem.contentType || 'N/A'}`, 'cyan');
          log(`    - mediaUrl: ${firstItem.mediaUrl ? 'Present' : 'Missing'}`, 'cyan');
          log(`    - thumbnailUrl: ${firstItem.thumbnailUrl ? 'Present' : 'Missing'}`, 'cyan');
          log(`    - author: ${firstItem.author ? 'Present' : 'Missing'}`, 'cyan');
        }
      }
      
      if (data.total !== undefined) {
        log(`  - total: ${data.total}`, 'green');
      }
      
      if (data.pagination) {
        log(`  - pagination: Present`, 'green');
      }
      
      if (data.data?.pagination) {
        log(`  - data.pagination: Present`, 'green');
      }
      
    } else {
      const errorText = await response.text();
      logError(`Endpoint failed: ${response.status} ${response.statusText}`);
      logError(`Error: ${errorText}`);
      
      if (response.status === 401) {
        logWarning('Authentication required - provide a valid token');
      } else if (response.status === 404) {
        logWarning('Endpoint not found - check if backend is deployed');
      } else if (response.status >= 500) {
        logWarning('Server error - check backend logs');
      }
    }
    
  } catch (error) {
    logError(`Network error: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      logWarning('DNS resolution failed - check API URL');
    } else if (error.code === 'ECONNREFUSED') {
      logWarning('Connection refused - check if backend is running');
    } else if (error.code === 'ETIMEDOUT') {
      logWarning('Request timeout - check network connectivity');
    }
  }
  
  log('─'.repeat(60));
}

// Test content type filtering
async function testContentTypeFiltering() {
  logHeader('Testing Content Type Filtering');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/media/public/all-content`);
    
    if (response.ok) {
      const data = await response.json();
      const media = data.media || data.data?.media || [];
      
      if (media.length > 0) {
        logInfo(`Found ${media.length} total items`);
        
        // Count by content type
        const typeCounts = {};
        media.forEach(item => {
          const type = item.contentType || 'unknown';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        logInfo('Content type distribution:');
        Object.entries(typeCounts).forEach(([type, count]) => {
          log(`  - ${type}: ${count} items`, 'cyan');
        });
        
        // Test filtering logic
        const videos = media.filter(item => item.contentType === 'videos' || item.contentType === 'video');
        const music = media.filter(item => item.contentType === 'music' || item.contentType === 'audio');
        const ebooks = media.filter(item => 
          item.contentType === 'ebook' || 
          item.contentType === 'books' || 
          item.contentType === 'image'
        );
        
        logSuccess(`Filtering results:`);
        log(`  - Videos: ${videos.length}`, 'green');
        log(`  - Music: ${music.length}`, 'green');
        log(`  - Ebooks: ${ebooks.length}`, 'green');
        
      } else {
        logWarning('No media items found');
      }
    } else {
      logError(`Failed to fetch content: ${response.status}`);
    }
  } catch (error) {
    logError(`Error testing content filtering: ${error.message}`);
  }
}

// Test URL validation
async function testUrlValidation() {
  logHeader('Testing URL Validation');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/media/public/all-content`);
    
    if (response.ok) {
      const data = await response.json();
      const media = data.media || data.data?.media || [];
      
      if (media.length > 0) {
        logInfo(`Testing URLs for ${media.length} items`);
        
        let validUrls = 0;
        let invalidUrls = 0;
        let missingUrls = 0;
        
        media.forEach((item, index) => {
          const url = item.fileUrl || item.mediaUrl;
          
          if (!url) {
            missingUrls++;
            log(`  ${index + 1}. Missing URL: ${item.title || 'Untitled'}`, 'red');
          } else if (url.startsWith('http://') || url.startsWith('https://')) {
            validUrls++;
            log(`  ${index + 1}. Valid URL: ${item.title || 'Untitled'}`, 'green');
          } else {
            invalidUrls++;
            log(`  ${index + 1}. Invalid URL: ${item.title || 'Untitled'} - ${url}`, 'red');
          }
        });
        
        logSuccess(`URL Validation Results:`);
        log(`  - Valid URLs: ${validUrls}`, 'green');
        log(`  - Invalid URLs: ${invalidUrls}`, 'red');
        log(`  - Missing URLs: ${missingUrls}`, 'red');
        
      } else {
        logWarning('No media items to test');
      }
    } else {
      logError(`Failed to fetch content: ${response.status}`);
    }
  } catch (error) {
    logError(`Error testing URLs: ${error.message}`);
  }
}

// Main test function
async function runTests() {
  logHeader('🎯 TikTok-Style UI Integration Tests');
  logInfo(`Testing against: ${API_BASE_URL}`);
  logInfo(`Timestamp: ${new Date().toISOString()}`);
  
  // Test all endpoints
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint);
  }
  
  // Test content filtering
  await testContentTypeFiltering();
  
  // Test URL validation
  await testUrlValidation();
  
  logHeader('🎉 Test Summary');
  logSuccess('Integration tests completed!');
  logInfo('Review the results above to identify any issues.');
  logInfo('Check the TikTok Integration Guide for troubleshooting tips.');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testEndpoint,
  testContentTypeFiltering,
  testUrlValidation,
  runTests
};

