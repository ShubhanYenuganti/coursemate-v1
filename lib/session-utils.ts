/**
 * Session utilities for tracking user sessions across page reloads
 */

const SESSION_STORAGE_KEY = 'coursemate_session_id';

/**
 * Get or create a session ID that persists across page reloads
 * but resets when the browser is closed (using sessionStorage)
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side rendering fallback
    return '';
  }

  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!sessionId) {
    // Generate a new session ID
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Generate a new unique ID for each page visit (for view tracking)
 */
export function getPageVisitId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  // Always generate a new ID for each page visit
  return 'visit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Clear the current session ID (useful for testing or manual session reset)
 */
export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
