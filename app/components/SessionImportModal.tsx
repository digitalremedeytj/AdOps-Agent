"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DownloadIcon, CopyIcon, CheckCircleIcon, AlertTriangleIcon, BookmarkIcon } from "lucide-react";
import { generateBookmarkletCode } from "@/lib/bookmarklet";

interface SessionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionImported: (sessionId: string, sessionUrl: string) => void;
}

type ImportState = 'instructions' | 'importing' | 'success' | 'error';

const SessionImportModal: React.FC<SessionImportModalProps> = ({
  isOpen,
  onClose,
  onSessionImported,
}) => {
  const [importState, setImportState] = useState<ImportState>('instructions');
  const [sessionToken, setSessionToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [bookmarkletCode] = useState(() => generateBookmarkletCode());

  const handleImportSession = async () => {
    if (!sessionToken.trim()) {
      setErrorMessage('Please paste your session token');
      return;
    }

    setIsLoading(true);
    setImportState('importing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/session/auth/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken: sessionToken.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setImportState('success');
        onSessionImported(data.sessionId, data.sessionUrl);
      } else {
        setImportState('error');
        setErrorMessage(data.error || 'Failed to import session');
      }
    } catch (error) {
      setImportState('error');
      setErrorMessage('Network error occurred while importing session');
      console.error('Error importing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletCode);
      alert('Bookmarklet copied! Now drag it to your bookmarks bar or save it as a bookmark.');
    } catch (error) {
      console.error('Failed to copy bookmarklet:', error);
      alert('Failed to copy. Please manually select and copy the bookmarklet code.');
    }
  };

  const resetModal = () => {
    setImportState('instructions');
    setSessionToken('');
    setErrorMessage('');
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
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <DownloadIcon className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Import Yahoo DSP Session
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {importState === 'instructions' && (
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Step 1: Install the Bookmarklet
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-700 mb-3">
                        Copy this bookmarklet and save it to your bookmarks bar:
                      </p>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value="Yahoo DSP Session Export"
                          readOnly
                          className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded font-medium"
                        />
                        <button
                          onClick={copyBookmarklet}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center space-x-1"
                        >
                          <CopyIcon className="w-4 h-4" />
                          <span>Copy Bookmarklet</span>
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        After copying, create a new bookmark and paste this as the URL.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Step 2: Export Your Session
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <ol className="text-sm text-green-700 space-y-2 list-decimal ml-4">
                        <li>Open a new tab and login to Yahoo DSP normally (complete your SSO/2FA)</li>
                        <li>Once logged in, click the "Yahoo DSP Session Export" bookmark</li>
                        <li>A popup will appear with your session token</li>
                        <li>Copy the session token from the popup</li>
                        <li>Return here and paste the token below</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Step 3: Import Session Token
                    </h3>
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Paste your session token here:
                      </label>
                      <textarea
                        value={sessionToken}
                        onChange={(e) => setSessionToken(e.target.value)}
                        placeholder="Paste the session token from the bookmarklet here..."
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-vertical"
                      />
                      {errorMessage && (
                        <p className="text-sm text-red-600 flex items-center space-x-1">
                          <AlertTriangleIcon className="w-4 h-4" />
                          <span>{errorMessage}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportSession}
                      disabled={!sessionToken.trim() || isLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <DownloadIcon className="w-5 h-5" />
                      <span>{isLoading ? 'Importing...' : 'Import Session'}</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {importState === 'importing' && (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Importing Session...
                      </h3>
                      <p className="text-gray-600">
                        Setting up your authenticated Yahoo DSP session for AI automation.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {importState === 'success' && (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-4">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Session Imported Successfully!
                      </h3>
                      <p className="text-gray-600">
                        Your Yahoo DSP authentication has been imported. The AI can now access Yahoo DSP on your behalf.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {importState === 'error' && (
                <motion.div
                  className="text-center space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-4">
                    <AlertTriangleIcon className="w-16 h-16 text-red-500 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-900 mb-2">
                        Import Failed
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {errorMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={resetModal}
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Close
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

export default SessionImportModal;
