"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AnimatedButton from "./components/ui/AnimatedButton";
import posthog from "posthog-js";
import ChatFeed from "./components/ChatFeed";
import QAChatFeed from "./components/QAChatFeed";
import NavBar from "./components/NavBar";
import CampaignQAForm from "./components/CampaignQAForm";
import CampaignElementSelector from "./components/CampaignElementSelector";
import QAResultsDisplay from "./components/QAResultsDisplay";
import YahooDSPAuthModal from "./components/YahooDSPAuthModal";
import { useYahooDSPAuth } from "./hooks/useYahooDSPAuth";
import { CampaignElement, QAResult } from "./types/Campaign";
import { Code, MessageCircle, Search, Grid3x3 } from "lucide-react";

const Tooltip = ({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.span
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 3, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{
              duration: 0.2,
              type: "spring",
              stiffness: 400,
              damping: 17,
            }}
            className="absolute w-auto px-3 py-2 min-w-max left-1/2 -translate-x-1/2 bg-[#2E191E] text-white text-xs font-ppsupply z-50 backdrop-blur-sm"
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Home() {
  const [currentView, setCurrentView] = useState<'form' | 'selector' | 'chat' | 'results'>('form');
  const [campaignElements, setCampaignElements] = useState<CampaignElement[]>([]);
  const [selectedElements, setSelectedElements] = useState<CampaignElement[]>([]);
  const [qaUrls, setQaUrls] = useState<{ campaignUrl: string; qaUrl: string } | null>(null);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qaResults, setQaResults] = useState<QAResult[]>([]);
  const [qaSummary, setQaSummary] = useState<any>(null);
  const [qaOverallStatus, setQaOverallStatus] = useState<'PASS' | 'FAIL'>('PASS');

  // Yahoo DSP authentication
  const { 
    showAuthModal, 
    authModalUrl, 
    closeAuthModal, 
    onAuthComplete,
    requiresAuth,
    extractUrls
  } = useYahooDSPAuth();

  const [customInstructions, setCustomInstructions] = useState<string | undefined>(undefined);

  const handleCampaignSubmit = useCallback(async (campaignUrl: string, qaUrl: string, customInstructions?: string) => {
    setIsLoading(true);
    setQaUrls({ campaignUrl, qaUrl });
    setCustomInstructions(customInstructions);
    
    try {
      const response = await fetch('/api/campaign/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignUrl }),
      });

      const data = await response.json();
      
      if (data.success && data.elements) {
        setCampaignElements(data.elements);
        setCurrentView('selector');
      } else {
        console.error('Failed to parse campaign:', data.error);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error('Error parsing campaign:', error);
      // TODO: Show error message to user
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleElementSelectionChange = useCallback((elements: CampaignElement[]) => {
    const selected = elements.filter(el => el.selected);
    setSelectedElements(selected);
    console.log('[Element Selection] Selected elements:', selected.length);
  }, []);

  const handleStartQA = useCallback(async () => {
    console.log('[Start QA] Called with:', { qaUrls, selectedElementsCount: selectedElements.length });
    
    if (!qaUrls || selectedElements.length === 0) {
      console.log('[Start QA] Missing requirements - qaUrls:', !!qaUrls, 'selectedElements:', selectedElements.length);
      return;
    }
    
    setIsLoading(true);
    console.log('[Start QA] Starting QA validation...');
    
    // Switch to chat view to show the browser automation in progress
    const selectedElementsText = selectedElements
      .map((el, index) => `${index + 1}. ${el.label} (ID: ${el.id})
   Expected Value: "${el.expectedValue}"`)
      .join('\n\n');
    
    let qaMessage = `Navigate to ${qaUrls.qaUrl} and validate the following ${selectedElements.length} campaign elements:

${selectedElementsText}

For each element:
1. Locate the corresponding field/value on the page
2. Compare actual vs expected value
3. Determine status (PASS/FAIL/WARNING) and confidence (0-100)
4. Take screenshot if confidence < 80% or status is FAIL
5. Provide clear notes explaining your findings

After validating all elements, provide your results in JSON format only. Do not include any other text before or after the JSON.

Use this exact JSON structure:

{
  "validationResults": [
    {
      "elementId": "element-1",
      "elementLabel": "Line Name",
      "expectedValue": "Yahoo! - Magnite - LG Sports...",
      "actualValue": "Yahoo! - Magnite - LG Sports...",
      "status": "PASS",
      "confidence": 100,
      "notes": "Exact match found"
    }
  ],
  "summary": {
    "totalElements": ${selectedElements.length},
    "passed": 15,
    "failed": 0,
    "warnings": 1,
    "overallStatus": "PASS"
  }
}

IMPORTANT: 
- Only output valid JSON at the end, no additional text
- Include all ${selectedElements.length} elements in validationResults array
- Use exact elementId values provided (${selectedElements.map(el => el.id).join(', ')})
- Status must be exactly "PASS", "FAIL", or "WARNING"
- Confidence must be integer 0-100
- Provide clean actualValue without "Expected:" text

Work systematically through each element. Be thorough but efficient.`;

    // Append custom instructions if provided
    if (customInstructions) {
      qaMessage += `\n\nAdditional Instructions: ${customInstructions}`;
    }

    setInitialMessage(qaMessage);
    setCurrentView('chat');
    
    try {
      posthog.capture("campaign_qa_started", {
        elementsCount: selectedElements.length,
        qaUrl: qaUrls.qaUrl,
      });
    } catch (e) {
      console.error(e);
    }
    
    setIsLoading(false);
  }, [selectedElements, qaUrls]);

  const handleQAComplete = useCallback((results: QAResult[], summary: any, overallStatus: 'PASS' | 'FAIL') => {
    console.log('[QA Complete] Received results:', results.length, 'items');
    setQaResults(results);
    setQaSummary(summary);
    setQaOverallStatus(overallStatus);
    setCurrentView('results');
    
    try {
      posthog.capture("campaign_qa_completed", {
        elementsCount: selectedElements.length,
        qaUrl: qaUrls?.qaUrl,
        overallStatus,
        passedCount: summary.passed,
        failedCount: summary.failed,
        warningsCount: summary.warnings,
      });
    } catch (e) {
      console.error(e);
    }
  }, [selectedElements.length, qaUrls?.qaUrl]);

  const handleBackToForm = useCallback(() => {
    setCurrentView('form');
    setCampaignElements([]);
    setSelectedElements([]);
    setQaUrls(null);
    setInitialMessage(null);
  }, []);

  return (
    <>
      <AnimatePresence>
        {currentView === 'chat' ? (
          <QAChatFeed
            key={`qa-chat-feed-${initialMessage}`}
            initialMessage={initialMessage}
            selectedElements={selectedElements}
            onClose={handleBackToForm}
            onQAComplete={handleQAComplete}
          />
        ) : currentView === 'results' ? (
          <div className="min-h-screen bg-gray-50">
            <NavBar />
            <QAResultsDisplay
              results={qaResults}
              summary={qaSummary}
              overallStatus={qaOverallStatus}
              onBack={handleBackToForm}
            />
          </div>
        ) : (
          <div className="min-h-screen bg-gray-100 flex flex-col relative">
            {/* Top Navigation */}
            <NavBar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center pt-12 md:pt-16 lg:pt-20 pb-16 md:pb-24 lg:pb-32 px-6 z-10">
              <div className="w-full max-w-[640px] md:max-w-[800px] lg:max-w-[960px] bg-white border border-[#CAC8C7] shadow-sm z-10" style={{ borderRadius: '12px' }}>
                <div className="p-8 md:p-10 lg:p-12 flex flex-col items-center gap-8 md:gap-10">
                  <div className="flex flex-col items-center gap-3 md:gap-5">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-ppneue text-gray-900 text-center">
                      Campaign QA Tool
                    </h1>
                    <p className="text-base md:text-lg font-ppsupply text-gray-500 text-center">
                      AI-powered campaign quality assurance
                    </p>
                  </div>

                  {currentView === 'form' && (
                    <CampaignQAForm onSubmit={handleCampaignSubmit} />
                  )}

                  {currentView === 'selector' && (
                    <CampaignElementSelector
                      elements={campaignElements}
                      onSelectionChange={handleElementSelectionChange}
                      onStartQA={handleStartQA}
                    />
                  )}
                </div>
              </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      {/* Yahoo DSP Authentication Modal */}
      <YahooDSPAuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        targetUrl={authModalUrl || undefined}
        onAuthComplete={(sessionId, sessionUrl, targetUrl) => {
          onAuthComplete(sessionId, sessionUrl, targetUrl);
          
          // If we have a target URL, we could trigger navigation or other actions here
          if (targetUrl) {
            console.log('Authentication completed for target URL:', targetUrl);
            // You could trigger the QA process here if the target URL was from a QA form
          }
        }}
      />
    </>
  );
}
