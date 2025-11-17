"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon, AlertCircleIcon, ArrowRightIcon, UserIcon, ShieldCheckIcon, ExternalLinkIcon } from "lucide-react";

interface AuthBrowserContainerProps {
  sessionUrl: string | null;
  sessionId: string | null;
  isVisible: boolean;
  platform?: string;
  onAuthConfirmed?: (sessionId: string) => void;
  onHandoffComplete?: (sessionId: string, sessionUrl: string) => void;
}

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 1,
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

const AuthBrowserContainer: React.FC<AuthBrowserContainerProps> = ({
  sessionUrl,
  sessionId,
  isVisible,
  platform = "Yahoo DSP",
  onAuthConfirmed = () => {},
  onHandoffComplete = () => {},
}) => {
  const [authStatus, setAuthStatus] = useState<'pending' | 'confirmed' | 'handoff'>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [showPopupFallback, setShowPopupFallback] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Detect iframe loading issues (Microsoft SSO blocking)
  useEffect(() => {
    if (!sessionUrl) return;

    const timer = setTimeout(() => {
      // Check if iframe might be blocked by checking for common SSO redirect patterns
      const iframe = document.querySelector('iframe[title="Authentication Browser Session"]') as HTMLIFrameElement;
      if (iframe) {
        try {
          // This will throw an error if iframe is blocked by CORS/X-Frame-Options
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!iframeDoc) {
            setShowPopupFallback(true);
            setIframeError(true);
          }
        } catch (error) {
          // Iframe is likely blocked
          setShowPopupFallback(true);
          setIframeError(true);
        }
      }
    }, 3000); // Give iframe 3 seconds to load

    return () => clearTimeout(timer);
  }, [sessionUrl]);

  const openInNewWindow = () => {
    if (sessionUrl) {
      window.open(sessionUrl, '_blank', 'width=1280,height=720,scrollbars=yes,resizable=yes');
      setShowPopupFallback(true);
    }
  };

  const handleConfirmAuth = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      // Update auth status
      const response = await fetch('/api/session/auth/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          isAuthenticated: true,
          platform: platform.toLowerCase().replace(' ', '-')
        })
      });

      if (response.ok) {
        setAuthStatus('confirmed');
        onAuthConfirmed(sessionId);
      }
    } catch (error) {
      console.error('Error confirming auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHandoffToAI = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/session/auth/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          platform: platform.toLowerCase().replace(' ', '-'),
          confirmAuth: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setAuthStatus('handoff');
        onHandoffComplete(sessionId, data.sessionUrl);
      }
    } catch (error) {
      console.error('Error during handoff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="w-full max-w-[1000px] mx-auto flex flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Auth Instructions Header */}
          <motion.div
            className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center space-x-3">
              <UserIcon className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Manual Authentication Required</h3>
                <p className="text-sm text-blue-700">
                  Please complete your SSO/2FA login for {platform} in the browser below, then confirm when ready.
                </p>
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  <strong>Tip:</strong> If you see "Your device will open a security window" but no popup appears, 
                  try clicking "Back" or "Try again" to use alternative authentication methods like SMS or app notifications.
                </div>
                {(showPopupFallback || iframeError) && (
                  <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                    <strong>Microsoft SSO Detected:</strong> Authentication may be blocked in iframe. 
                    Use the "Open in New Window" button for better compatibility with Microsoft accounts and 2FA.
                  </div>
                )}
              </div>
              {sessionUrl && (showPopupFallback || authStatus === 'pending') && (
                <button
                  onClick={openInNewWindow}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm"
                >
                  <ExternalLinkIcon className="w-4 h-4" />
                  <span>Open in New Window</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Browser Frame */}
          <div
            className="w-full h-[250px] md:h-[600px] flex items-center justify-center overflow-hidden border border-[#CAC8C7] shadow-sm relative"
            style={{
              backgroundColor: "rgba(245, 240, 255, 0.75)",
              backdropFilter: "blur(8px)",
            }}
          >
            {sessionUrl ? (
              <iframe
                src={sessionUrl}
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-top-navigation allow-top-navigation-by-user-activation"
                allow="clipboard-read; clipboard-write; camera; microphone; geolocation; payment; usb; web-share"
                loading="lazy"
                referrerPolicy="no-referrer"
                title="Authentication Browser Session"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="flex flex-col items-center space-y-6 w-full animate-in fade-in slide-in-from-bottom-5 duration-500">
                  <h2 className="text-2xl font-semibold text-gray-700">
                    Starting Authentication Session
                  </h2>
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <div className="mt-4 flex justify-center">
                      <div className="bg-gray-200 h-16 w-16 animate-pulse rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auth Controls */}
          {sessionUrl && (
            <motion.div
              className="mt-4 p-4 bg-white border border-gray-200 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
                <div className="flex items-center space-x-2">
                  {authStatus === 'pending' && (
                    <>
                      <AlertCircleIcon className="w-5 h-5 text-amber-500" />
                      <span className="text-sm text-gray-600">
                        Complete your login, then click "I'm Logged In"
                      </span>
                    </>
                  )}
                  {authStatus === 'confirmed' && (
                    <>
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-600">
                        Authentication confirmed! Ready to hand off to AI.
                      </span>
                    </>
                  )}
                  {authStatus === 'handoff' && (
                    <>
                      <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-blue-600">
                        Session handed off to AI control.
                      </span>
                    </>
                  )}
                </div>

                <div className="flex space-x-3">
                  {authStatus === 'pending' && (
                    <button
                      onClick={handleConfirmAuth}
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>{isLoading ? 'Confirming...' : "I'm Logged In"}</span>
                    </button>
                  )}
                  
                  {authStatus === 'confirmed' && (
                    <button
                      onClick={handleHandoffToAI}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                      <span>{isLoading ? 'Handing off...' : 'Hand off to AI'}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthBrowserContainer;
