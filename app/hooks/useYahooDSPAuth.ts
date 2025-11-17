"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  detectYahooDSPUrl, 
  extractYahooDSPUrls, 
  isYahooDSPAuthenticated,
  getStoredAuthState,
  clearStoredAuthState,
  queueUrlForAuth,
  type YahooDSPUrlInfo,
  type AuthState
} from "@/lib/yahoo-dsp-utils";

export interface UseYahooDSPAuthReturn {
  // Authentication state
  isAuthenticated: boolean;
  authState: AuthState | null;
  
  // URL detection
  detectUrl: (url: string) => YahooDSPUrlInfo;
  extractUrls: (text: string) => YahooDSPUrlInfo[];
  
  // Authentication flow
  requiresAuth: (url: string) => boolean;
  triggerAuth: (url: string, context?: string) => void;
  clearAuth: () => void;
  
  // Modal state
  showAuthModal: boolean;
  authModalUrl: string | null;
  openAuthModal: (url?: string) => void;
  closeAuthModal: () => void;
  
  // Event handlers
  onAuthComplete: (sessionId: string, sessionUrl: string, targetUrl?: string) => void;
}

export function useYahooDSPAuth(): UseYahooDSPAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalUrl, setAuthModalUrl] = useState<string | null>(null);

  // Check authentication state on mount and periodically
  useEffect(() => {
    const checkAuthState = () => {
      const currentAuthState = getStoredAuthState();
      setAuthState(currentAuthState);
      setIsAuthenticated(currentAuthState?.isAuthenticated === true);
    };

    // Check immediately
    checkAuthState();

    // Check every 30 seconds to handle expiration
    const interval = setInterval(checkAuthState, 30000);

    return () => clearInterval(interval);
  }, []);

  // URL detection functions
  const detectUrl = useCallback((url: string): YahooDSPUrlInfo => {
    return detectYahooDSPUrl(url);
  }, []);

  const extractUrls = useCallback((text: string): YahooDSPUrlInfo[] => {
    return extractYahooDSPUrls(text);
  }, []);

  // Authentication requirement check
  const requiresAuth = useCallback((url: string): boolean => {
    const urlInfo = detectYahooDSPUrl(url);
    return urlInfo.isYahooDSP && urlInfo.requiresAuth && !isAuthenticated;
  }, [isAuthenticated]);

  // Trigger authentication flow
  const triggerAuth = useCallback((url: string, context?: string) => {
    queueUrlForAuth(url, context);
    setAuthModalUrl(url);
    setShowAuthModal(true);
  }, []);

  // Clear authentication
  const clearAuth = useCallback(() => {
    clearStoredAuthState();
    setAuthState(null);
    setIsAuthenticated(false);
  }, []);

  // Modal controls
  const openAuthModal = useCallback((url?: string) => {
    setAuthModalUrl(url || null);
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setAuthModalUrl(null);
  }, []);

  // Handle authentication completion
  const onAuthComplete = useCallback((sessionId: string, sessionUrl: string, targetUrl?: string) => {
    // Update local state
    const newAuthState: AuthState = {
      isAuthenticated: true,
      sessionId,
      sessionUrl,
      expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
    };
    
    setAuthState(newAuthState);
    setIsAuthenticated(true);
    
    // Close modal
    closeAuthModal();
    
    // You can add additional logic here, such as:
    // - Triggering a navigation to the target URL
    // - Notifying other components
    // - Starting an AI agent task
    
    console.log('Yahoo DSP authentication completed:', {
      sessionId,
      sessionUrl,
      targetUrl
    });
  }, [closeAuthModal]);

  return {
    // Authentication state
    isAuthenticated,
    authState,
    
    // URL detection
    detectUrl,
    extractUrls,
    
    // Authentication flow
    requiresAuth,
    triggerAuth,
    clearAuth,
    
    // Modal state
    showAuthModal,
    authModalUrl,
    openAuthModal,
    closeAuthModal,
    
    // Event handlers
    onAuthComplete,
  };
}
