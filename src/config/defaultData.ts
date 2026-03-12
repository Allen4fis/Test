/**
 * Centralized configuration for default application data
 * This allows server and client to share the same static data definitions
 * preventing duplication and inconsistencies across the codebase
 */

export const DEFAULT_HOUR_TYPES = [
  { id: "1", name: "Regular Hours" },
  { id: "2", name: "Overtime" },
  { id: "3", name: "Travel Hours" },
  { id: "4", name: "Standby" },
  { id: "5", name: "Training" },
  { id: "6", name: "Sick Leave" },
  { id: "7", name: "Vacation" },
  { id: "8", name: "Statutory Holiday" },
  { id: "9", name: "Bereavement Leave" },
  { id: "10", name: "Parental Leave" },
  { id: "11", name: "Administrative" },
  { id: "12", name: "Safety Meeting" },
  { id: "13", name: "Equipment Training" },
  { id: "14", name: "Other" },
] as const;

export const DEFAULT_PROVINCES = [
  { id: "ab", name: "Alberta", code: "AB", taxRate: 0.15 },
  { id: "bc", name: "British Columbia", code: "BC", taxRate: 0.12 },
  { id: "mb", name: "Manitoba", code: "MB", taxRate: 0.12 },
  { id: "nb", name: "New Brunswick", code: "NB", taxRate: 0.15 },
  { id: "nl", name: "Newfoundland & Labrador", code: "NL", taxRate: 0.15 },
  { id: "ns", name: "Nova Scotia", code: "NS", taxRate: 0.15 },
  { id: "nt", name: "Northwest Territories", code: "NT", taxRate: 0.05 },
  { id: "nu", name: "Nunavut", code: "NU", taxRate: 0.0 },
  { id: "on", name: "Ontario", code: "ON", taxRate: 0.13 },
  { id: "pe", name: "Prince Edward Island", code: "PE", taxRate: 0.15 },
  { id: "qc", name: "Quebec", code: "QC", taxRate: 0.15 },
  { id: "sk", name: "Saskatchewan", code: "SK", taxRate: 0.11 },
  { id: "yt", name: "Yukon", code: "YT", taxRate: 0.0 },
] as const;

/**
 * ID Generation utilities
 * Future-proofed for server deployment:
 * - UUIDs can be generated client-side or server-side
 * - Reduces collision risk across multiple clients
 * - Compatible with most database systems
 */
import { v4 as uuidv4 } from "uuid";

export const generateId = (): string => {
  return uuidv4();
};

/**
 * Legacy ID generation (kept for backwards compatibility with existing data)
 * Use generateId() for all new records
 */
export const generateLegacyId = (): string => {
  const now = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${now}-${randomStr}`;
};

/**
 * Storage configuration constants
 * These keys are used consistently across the application
 * For server deployment, localStorage keys would be replaced with API calls
 */
export const STORAGE_KEYS = {
  MAIN: "timeTrackingApp",
  AUTOSAVE: "timeTrackingApp-autosave",
  BACKUPS: "trackity-doo-backups",
  FALLBACK: "timeTrackingApp_fallback",
  ARCHIVE_PREFIX: "timeTrackingApp-archive-",
} as const;

/**
 * Application configuration constants
 * These values should be configurable per deployment (server env vars, etc)
 */
export const APP_CONFIG = {
  AUTOSAVE_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes
  MAX_AUTOSAVES: 3,
  STORAGE_QUOTA_BYTES: 5 * 1024 * 1024, // 5MB conservative estimate
  SLOW_OPERATION_THRESHOLD_MS: 100,
  PAGINATION_DEFAULT_ITEMS: 25,
} as const;

/**
 * Feature flags for future multi-user/server deployment
 * These allow progressive feature rollout
 */
export const FEATURE_FLAGS = {
  // When true, use localStorage. When false (server deployment), use API calls
  USE_LOCAL_STORAGE: true,
  
  // When true, enables offline support with sync queue
  ENABLE_OFFLINE_SUPPORT: true,
  
  // When true, enables real-time sync with other clients
  ENABLE_REALTIME_SYNC: false,
  
  // When true, enables automatic error reporting to server
  ENABLE_ERROR_REPORTING: false,
  
  // Server URL for future API calls (null = use localStorage only)
  SERVER_URL: null as string | null,
} as const;

export type HourType = (typeof DEFAULT_HOUR_TYPES)[number];
export type Province = (typeof DEFAULT_PROVINCES)[number];
