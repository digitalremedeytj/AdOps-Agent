"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldIcon, ArrowRightIcon, UserCheckIcon, RefreshCwIcon } from "lucide-react";
import AuthBrowserContainer from "./AuthBrowserContainer";
import BrowserSessionContainer from "./BrowserSessionContainer";
import { forceResetYahooDSPAuth } from "../../lib/yahoo-dsp-utils";

interface YahooDSPAuthFlowProps {
  onAuthComplete?: (sessionId: string, sessionUrl: string) => void;
}

type FlowState = 'start' | 'auth' | 'handoff' | 'ai_control';

const YahooDSPAuthFlow: React.FC<YahooDSPAuthFlowProps> = ({
  onAuthComplete = () => {},
}) => {
  const [flowState, setFlowState] = useState<FlowState>('start');
  const [authSessionId, setAuthSessionId] = useState<string | null>(null);
  const [authSessionUrl, setAuthSessionUrl] = useState<string | null>(null);
  const [aiSessionUrl, setAiSessionUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startAuthFlow = async () => {
    setIsLoading(true);
    try {
      // Generate or retrieve a context ID for session persistence
      const contextId = localStorage.getItem('yahoo_dsp_context_id') || 
        `yahoo-dsp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store context ID for future use
      localStorage.setItem('yahoo_dsp_context_id', contextId);

      const response = await fetch('/api/session/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          contextId: contextId
        })
      });

      const data = await response.json();
      if (data.success) {
        setAuthSessionId(data.sessionId);
        setAuthSessionUrl(data.sessionUrl);
        setFlowState('auth');
      }
    } catch (error) {
      console.error('Error starting auth flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthConfirmed = (sessionId: string) => {
    console.log('Auth confirmed for session:', sessionId);
    setFlowState('handoff');
  };

  const handleHandoffComplete = (sessionId: string, sessionUrl: string) => {
    console.log('Handoff complete:', sessionId, sessionUrl);
    setAiSessionUrl(sessionUrl);
    setFlowState('ai_control');
    onAuthComplete(sessionId, sessionUrl);
  };

  const navigateToYahooDSP = async () => {
    if (!authSessionId) return;
    
    // In a real implementation, you might want to navigate to Yahoo DSP login page
    // For now, we'll just open the session and let the user navigate manually
    window.open('https://login.yahoo.com', '_blank');
  };

  const handleForceReauth = () => {
    // Clear all stored auth data
    forceResetYahooDSPAuth();
    
    // Reset component state
    setFlowState('start');
    setAuthSessionId(null);
    setAuthSessionUrl(null);
    setAiSessionUrl(null);
    setIsLoading(false);
    
    console.log('Yahoo DSP authentication reset - ready for fresh login');
  };

  return (
    <div className="w-full space-y-6">
      {/* Flow Progress Indicator */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
          flowState === 'start' ? 'bg-blue-100 text-blue-700' : 
          flowState === 'auth' || flowState === 'handoff' || flowState === 'ai_control' ? 'bg-green-100 text-green-700' : 
          'bg-gray-100 text-gray-500'
        }`}>
          <UserCheckIcon className="w-4 h-4" />
          <span className="text-sm font-medium">1. Start Auth</span>
        </div>
        
        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
        
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
          flowState === 'auth' ? 'bg-blue-100 text-blue-700' : 
          flowState === 'handoff' || flowState === 'ai_control' ? 'bg-green-100 text-green-700' : 
          'bg-gray-100 text-gray-500'
        }`}>
          <ShieldIcon className="w-4 h-4" />
          <span className="text-sm font-medium">2. Login</span>
        </div>
        
        <ArrowRightIcon className="w-4 h-4 text-gray-400" />
        
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
          flowState === 'ai_control' ? 'bg-blue-100 text-blue-700' : 
          'bg-gray-100 text-gray-500'
        }`}>
          <ArrowRightIcon className="w-4 h-4" />
          <span className="text-sm font-medium">3. AI Control</span>
        </div>
      </div>

      {/* Start Screen */}
      {flowState === 'start' && (
        <motion.div
          className="text-center space-y-6 py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="space-y-4">
            <ShieldIcon className="w-16 h-16 text-blue-600 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Yahoo DSP Authentication</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Start a secure browser session to complete your SSO/2FA login for Yahoo DSP. 
              Once authenticated, you can hand control over to the AI agent.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={startAuthFlow}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <ShieldIcon className="w-5 h-5" />
                <span>{isLoading ? 'Starting Session...' : 'Start Authentication'}</span>
              </button>
              
              <button
                onClick={handleForceReauth}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center space-x-2 text-sm"
              >
                <RefreshCwIcon className="w-4 h-4" />
                <span>Force Re-auth</span>
              </button>
            </div>
            
            <p className="text-sm text-gray-500">
              This will open a secure browser session where you can complete your login.
            </p>
            <p className="text-xs text-gray-400">
              Use "Force Re-auth" if you're having issues with cached authentication state.
            </p>
          </div>
        </motion.div>
      )}

      {/* Authentication Phase */}
      {(flowState === 'auth' || flowState === 'handoff') && (
        <div className="space-y-4">
          <AuthBrowserContainer
            sessionUrl={authSessionUrl}
            sessionId={authSessionId}
            isVisible={true}
            platform="Yahoo DSP"
            onAuthConfirmed={handleAuthConfirmed}
            onHandoffComplete={handleHandoffComplete}
          />
          
          {flowState === 'auth' && (
            <div className="text-center">
              <button
                onClick={navigateToYahooDSP}
                className="text-blue-600 hover:text-blue-700 text-sm underline"
              >
                Need to navigate to Yahoo DSP? Click here
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Control Phase */}
      {flowState === 'ai_control' && (
        <div className="space-y-4">
          <motion.div
            className="p-4 bg-green-50 border border-green-200 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center space-x-3">
              <UserCheckIcon className="w-5 h-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900">Authentication Complete!</h3>
                <p className="text-sm text-green-700">
                  Your Yahoo DSP session is now ready for AI automation. The agent can now perform tasks on your behalf.
                </p>
              </div>
            </div>
          </motion.div>

          <BrowserSessionContainer
            sessionUrl={aiSessionUrl}
            isVisible={true}
            isCompleted={false}
            initialMessage="Yahoo DSP session authenticated and ready for AI control"
            isFromSearchParam={false}
          />
        </div>
      )}
    </div>
  );
};

export default YahooDSPAuthFlow;
