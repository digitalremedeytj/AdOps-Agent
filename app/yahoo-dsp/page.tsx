"use client";

import YahooDSPAuthFlow from "@/app/components/YahooDSPAuthFlow";

export default function YahooDSPPage() {
  const handleAuthComplete = (sessionId: string, sessionUrl: string) => {
    console.log('Yahoo DSP authentication complete:', { sessionId, sessionUrl });
    // Here you could redirect to a campaign management interface
    // or trigger specific Yahoo DSP automation tasks
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Yahoo DSP Integration
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Securely authenticate with Yahoo DSP using your SSO/2FA credentials, 
              then hand control to the AI agent for automated campaign management.
            </p>
          </div>

          {/* Auth Flow Component */}
          <YahooDSPAuthFlow onAuthComplete={handleAuthComplete} />

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-3">How it works</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  <span>Start a secure browser session for manual authentication</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  <span>Complete your SSO/2FA login with Yahoo DSP</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  <span>Confirm authentication and hand control to AI</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  <span>AI agent performs tasks using your authenticated session</span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold text-gray-900 mb-3">Security Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>No credential storage - you login directly</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Session isolation with secure browser environment</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Full SSO/2FA support for enterprise security</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Session expires automatically for safety</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
