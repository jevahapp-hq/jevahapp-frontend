// API Types and Interfaces
export interface CacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  cache?: boolean;
  cacheDuration?: number;
  retryCount?: number;
  timeout?: number;
}

export interface UserData {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  avatarUpload?: string;
  email?: string;
  section?: string;
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// API Configuration
export const API_BASE_URL = "https://jevahapp-backend.onrender.com/api";

// Cache configuration
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const AVATAR_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

