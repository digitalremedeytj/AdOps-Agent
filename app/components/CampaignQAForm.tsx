"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import AnimatedButton from "./ui/AnimatedButton";
import { CampaignQAFormProps } from "@/app/types/Campaign";

export default function CampaignQAForm({ onSubmit }: CampaignQAFormProps) {
  const [campaignUrl, setCampaignUrl] = useState("");
  const [qaUrl, setQaUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignUrl.trim() || !qaUrl.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(campaignUrl.trim(), qaUrl.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const campaignUrlValid = !campaignUrl || isValidUrl(campaignUrl);
  const qaUrlValid = !qaUrl || isValidUrl(qaUrl);
  const canSubmit = campaignUrl.trim() && qaUrl.trim() && campaignUrlValid && qaUrlValid && !isLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[720px] md:max-w-[880px] lg:max-w-[1040px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label 
              htmlFor="campaignUrl" 
              className="text-sm font-medium text-gray-700 font-ppsupply"
            >
              Campaign Info URL (Google Sheets)
            </label>
            <input
              id="campaignUrl"
              type="url"
              value={campaignUrl}
              onChange={(e) => setCampaignUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className={`w-full px-4 py-3 border ${
                campaignUrlValid ? 'border-[#CAC8C7]' : 'border-red-400'
              } text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 font-ppsupply text-sm md:text-base transition-all duration-300 focus:backdrop-blur-sm focus:bg-opacity-95 focus:bg-white`}
              style={{
                '--tw-ring-color': 'var(--primary-accent)',
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-accent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = campaignUrlValid ? '#CAC8C7' : '#f87171';
              }}
              disabled={isLoading}
            />
            {!campaignUrlValid && (
              <p className="text-sm text-red-500 font-ppsupply">
                Please enter a valid URL
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label 
              htmlFor="qaUrl" 
              className="text-sm font-medium text-gray-700 font-ppsupply"
            >
              Campaign/Line Item QA URL (Yahoo DSP)
            </label>
            <input
              id="qaUrl"
              type="url"
              value={qaUrl}
              onChange={(e) => setQaUrl(e.target.value)}
              placeholder="https://dsp.yahoo.com/..."
              className={`w-full px-4 py-3 border ${
                qaUrlValid ? 'border-[#CAC8C7]' : 'border-red-400'
              } text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 font-ppsupply text-sm md:text-base transition-all duration-300 focus:backdrop-blur-sm focus:bg-opacity-95 focus:bg-white`}
              style={{
                '--tw-ring-color': 'var(--primary-accent)',
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-accent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = qaUrlValid ? '#CAC8C7' : '#f87171';
              }}
              disabled={isLoading}
            />
            {!qaUrlValid && (
              <p className="text-sm text-red-500 font-ppsupply">
                Please enter a valid URL
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="submit" 
            disabled={!canSubmit}
            className={`px-6 py-3 text-white font-medium transition-colors font-ppsupply ${
              !canSubmit ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{
              backgroundColor: canSubmit ? 'var(--primary-accent)' : 'var(--primary-accent)',
              borderRadius: '8px',
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                e.currentTarget.style.backgroundColor = '#4845e4';
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit) {
                e.currentTarget.style.backgroundColor = 'var(--primary-accent)';
              }
            }}
          >
            {isLoading ? "Parsing Campaign..." : "Parse Campaign Data"}
          </button>
        </div>
      </form>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-center text-xs text-gray-500 mt-4"
      >
        <p>The AI will extract campaign information</p>
      </motion.div>
    </motion.div>
  );
}
