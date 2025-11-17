/**
 * Utility functions for Yahoo DSP URL detection and authentication management
 */

export interface YahooDSPUrlInfo {
  isYahooDSP: boolean;
  originalUrl: string;
  requiresAuth: boolean;
  domain: string;
}

/**
 * Detects if a URL is a Yahoo DSP URL that requires authentication
 */
export function detectYahooDSPUrl(url: string): YahooDSPUrlInfo {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check for Yahoo DSP domains
    const yahooDSPDomains = [
      'dsp.yahooinc.com',
      'dsp.yahoo.com',
      'advertising.yahoo.com'
    ];
    
    const isYahooDSP = yahooDSPDomains.some(dspDomain => 
      domain === dspDomain || domain.endsWith(`.${dspDomain}`)
    );
    
    return {
      isYahooDSP,
      originalUrl: url,
      requiresAuth: isYahooDSP, // All Yahoo DSP URLs require auth
      domain
    };
  } catch (error) {
    // Invalid URL
    return {
      isYahooDSP: false,
      originalUrl: url,
      requiresAuth: false,
      domain: ''
    };
  }
}

/**
 * Extracts Yahoo DSP URLs from text content
 */
export function extractYahooDSPUrls(text: string): YahooDSPUrlInfo[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const urls = text.match(urlRegex) || [];
  
  return urls
    .map(url => detectYahooDSPUrl(url))
    .filter(info => info.isYahooDSP);
}

/**
 * Authentication state management
 */
export interface AuthState {
  isAuthenticated: boolean;
  sessionId: string | null;
  sessionUrl: string | null;
  expiresAt: number | null;
}

const AUTH_STORAGE_KEY = 'yahoo_dsp_auth_state';

/**
 * Get stored authentication state
 */
export function getStoredAuthState(): AuthState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    
    const authState: AuthState = JSON.parse(stored);
    
    // Check if session has expired
    if (authState.expiresAt && Date.now() > authState.expiresAt) {
      clearStoredAuthState();
      return null;
    }
    
    return authState;
  } catch (error) {
    console.error('Error reading auth state:', error);
    return null;
  }
}

/**
 * Store authentication state
 */
export function storeAuthState(authState: AuthState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    
    // Also store the context ID for session persistence
    if (authState.sessionId) {
      const contextId = localStorage.getItem('yahoo_dsp_context_id');
      if (contextId) {
        localStorage.setItem(`yahoo_dsp_context_${authState.sessionId}`, contextId);
      }
    }
  } catch (error) {
    console.error('Error storing auth state:', error);
  }
}

/**
 * Clear stored authentication state
 */
export function clearStoredAuthState(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
}

/**
 * Force clear all Yahoo DSP authentication data
 */
export function forceResetYahooDSPAuth(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear main auth state
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    // Clear context ID
    localStorage.removeItem('yahoo_dsp_context_id');
    
    // Clear URL queue
    localStorage.removeItem(URL_QUEUE_KEY);
    
    // Clear any context-session mappings
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('yahoo_dsp_context_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Yahoo DSP authentication state completely reset');
  } catch (error) {
    console.error('Error resetting Yahoo DSP auth:', error);
  }
}

/**
 * Check if any Yahoo DSP URL should trigger authentication
 */
export function shouldTriggerYahooDSPAuth(url: string): boolean {
  const urlInfo = detectYahooDSPUrl(url);
  
  // Always trigger auth for Yahoo DSP URLs, regardless of stored state
  if (urlInfo.isYahooDSP) {
    return true;
  }
  
  return false;
}

/**
 * Check if user is currently authenticated for Yahoo DSP
 */
export function isYahooDSPAuthenticated(): boolean {
  const authState = getStoredAuthState();
  return authState?.isAuthenticated === true;
}

/**
 * URL queue management for post-authentication navigation
 */
const URL_QUEUE_KEY = 'yahoo_dsp_url_queue';

export interface QueuedUrl {
  url: string;
  timestamp: number;
  context?: string;
}

/**
 * Add URL to queue for post-authentication processing
 */
export function queueUrlForAuth(url: string, context?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const queuedUrl: QueuedUrl = {
      url,
      timestamp: Date.now(),
      context
    };
    
    localStorage.setItem(URL_QUEUE_KEY, JSON.stringify(queuedUrl));
  } catch (error) {
    console.error('Error queuing URL:', error);
  }
}

/**
 * Get and clear queued URL
 */
export function getQueuedUrl(): QueuedUrl | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(URL_QUEUE_KEY);
    if (!stored) return null;
    
    const queuedUrl: QueuedUrl = JSON.parse(stored);
    
    // Clear the queue
    localStorage.removeItem(URL_QUEUE_KEY);
    
    // Check if URL is too old (older than 1 hour)
    if (Date.now() - queuedUrl.timestamp > 60 * 60 * 1000) {
      return null;
    }
    
    return queuedUrl;
  } catch (error) {
    console.error('Error getting queued URL:', error);
    return null;
  }
}
