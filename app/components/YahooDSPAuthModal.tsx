"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldIcon, AlertCircleIcon, CheckCircleIcon, ArrowRightIcon, RefreshCwIcon } from "lucide-react";
import AuthBrowserContainer from "./AuthBrowserContainer";
import { storeAuthState, queueUrlForAuth, getQueuedUrl, forceResetYahooDSPAuth } from "@/lib/yahoo-dsp-utils";

interface YahooDSPAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl?: string;
  onAuthComplete?: (sessionId: string, sessionUrl: string, targetUrl?: string) => void;
}

type ModalState = 'prompt' | 'authenticating' | 'completed';

const YahooDSPAuthModal: React.FC<YahooDSPAuthModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  onAuthComplete = () => {},
}) => {
  const [modalState, setModalState] = useState<ModalState>('prompt');
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);
  const [authSessionUrl, setAuthSessionUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForceReauth = () => {
    // Clear all stored auth data
    forceResetYahooDSPAuth();
    
    // Reset component state
    setModalState('prompt');
    setAuthSessionId(null);
    setAuthSessionUrl(null);
    setIsLoading(false);
    
    console.log('Yahoo DSP authentication reset - ready for fresh login');
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setModalState('prompt');
      setAuthSessionId(null);
      setAuthSessionUrl(null);
      setIsLoading(false);
      
      // Queue the target URL if provided
      if (targetUrl) {
        queueUrlForAuth(targetUrl, 'modal_auth');
      }
    }
  }, [isOpen, targetUrl]);

  const startAuthentication = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/session/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      const data = await response.json();
      if (data.success) {
        setAuthSessionId(data.sessionId);
        setAuthSessionUrl(data.sessionUrl);
        setModalState('authenticating');
      } else {
        console.error('Failed to create auth session:', data.error);
      }
    } catch (error) {
      console.error('Error starting authentication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthComplete = (sessionId: string, sessionUrl: string) => {
    // Store authentication state
    storeAuthState({
      isAuthenticated: true,
      sessionId,
      sessionUrl,
      expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
    });

    setModalState('completed');
    
    // Get the queued URL and pass it to the completion handler
    const queuedUrl = getQueuedUrl();
    onAuthComplete(sessionId, sessionUrl, queuedUrl?.url || targetUrl);
  };

  const handleClose = () => {
    onClose();
  };

  const handleContinue = () => {
    const queuedUrl = getQueuedUrl();
    onAuthComplete(authSessionId!, authSessionUrl!, queuedUrl?.url || targetUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <ShieldIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Yahoo DSP Authentication Required
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {modalState === 'prompt' && (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-4">
                    <AlertCircleIcon className="w-16 h-16 text-amber-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Authentication Required
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        The URL you're trying to access requires Yahoo DSP authentication. 
                        You'll need to complete your SSO/2FA login before the AI can proceed.
                      </p>
                    </div>
                    
                    {targetUrl && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 mb-2">Target URL:</p>
                        <p className="text-sm font-mono text-blue-600 break-all">
                          {targetUrl}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startAuthentication}
                      disabled={isLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <ShieldIcon className="w-5 h-5" />
                      <span>{isLoading ? 'Starting...' : 'Start Authentication'}</span>
                    </button>
                    <button
                      onClick={handleForceReauth}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center space-x-2 text-sm"
                    >
                      <RefreshCwIcon className="w-4 h-4" />
                      <span>Force Re-auth</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    Use "Force Re-auth" if you're having issues with cached authentication state.
                  </p>
                </motion.div>
              )}

      {modalState === 'authenticating' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Complete your authentication in the browser below. The system will automatically detect Microsoft SSO and 2FA requirements.
              </p>
            </div>

            <AuthBrowserContainer
              sessionUrl={authSessionUrl}
              sessionId={authSessionId}
              isVisible={true}
              platform="Yahoo DSP"
              onAuthConfirmed={() => {}}
              onHandoffComplete={handleAuthComplete}
            />
          </div>
        </motion.div>
      )}

              {modalState === 'completed' && (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-4">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Authentication Successful!
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        You're now authenticated with Yahoo DSP. The AI can proceed with your request.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleContinue}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <ArrowRightIcon className="w-5 h-5" />
                      <span>Continue to Yahoo DSP</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

    </AnimatePresence>
  );
};

export default YahooDSPAuthModal;
