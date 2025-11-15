"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import AnimatedButton from "./ui/AnimatedButton";
import { CampaignElementSelectorProps, CampaignElement } from "@/app/types/Campaign";

export default function CampaignElementSelector({ 
  elements, 
  onSelectionChange, 
  onStartQA 
}: CampaignElementSelectorProps) {
  const [localElements, setLocalElements] = useState<CampaignElement[]>(elements);

  const handleToggle = (id: string) => {
    const updated = localElements.map(element => 
      element.id === id ? { ...element, selected: !element.selected } : element
    );
    setLocalElements(updated);
    onSelectionChange(updated);
  };

  const handleSelectAll = () => {
    const updated = localElements.map(element => ({ ...element, selected: true }));
    setLocalElements(updated);
    onSelectionChange(updated);
  };

  const handleSelectNone = () => {
    const updated = localElements.map(element => ({ ...element, selected: false }));
    setLocalElements(updated);
    onSelectionChange(updated);
  };

  const selectedCount = localElements.filter(el => el.selected).length;
  const canStartQA = selectedCount > 0;

  // Group elements by category
  const groupedElements = localElements.reduce((acc, element) => {
    if (!acc[element.category]) {
      acc[element.category] = [];
    }
    acc[element.category].push(element);
    return acc;
  }, {} as Record<string, CampaignElement[]>);

  const categoryOrder = ['budget', 'targeting', 'creative', 'dates', 'placement', 'other'];
  const categoryLabels = {
    budget: 'Budget & Bidding',
    targeting: 'Targeting',
    creative: 'Creative',
    dates: 'Dates & Scheduling',
    placement: 'Placement',
    other: 'Other'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-[800px] bg-white border border-[#CAC8C7] shadow-sm"
      style={{ borderRadius: '8px' }}
    >
      {/* Header */}
      <div className="border-b border-[#CAC8C7] p-6">
        <h2 className="text-xl font-ppneue text-gray-900 mb-2">
          Campaign Elements Found
        </h2>
        <p className="text-sm text-gray-600 font-ppsupply mb-4">
          Select the elements you want to validate during QA
        </p>
        
        {/* Selection Controls */}
        <div className="flex gap-3">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-sm border border-[#CAC8C7] transition-colors font-ppsupply"
            style={{
              '--hover-color': 'var(--primary-accent)',
              borderRadius: '8px',
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-accent)';
              e.currentTarget.style.color = 'var(--primary-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CAC8C7';
              e.currentTarget.style.color = 'inherit';
            }}
          >
            Select All
          </button>
          <button
            onClick={handleSelectNone}
            className="px-3 py-1.5 text-sm border border-[#CAC8C7] transition-colors font-ppsupply"
            style={{
              '--hover-color': 'var(--primary-accent)',
              borderRadius: '8px',
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-accent)';
              e.currentTarget.style.color = 'var(--primary-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CAC8C7';
              e.currentTarget.style.color = 'inherit';
            }}
          >
            Select None
          </button>
          <div className="ml-auto text-sm text-gray-500 font-ppsupply flex items-center">
            {selectedCount} of {localElements.length} selected
          </div>
        </div>
      </div>

      {/* Elements List */}
      <div className="p-6 max-h-96 overflow-y-auto">
        {categoryOrder.map(category => {
          const categoryElements = groupedElements[category];
          if (!categoryElements || categoryElements.length === 0) return null;

          return (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-gray-700 font-ppsupply mb-3 uppercase tracking-wide">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h3>
              <div className="space-y-3">
                {categoryElements.map((element) => (
                  <motion.div
                    key={element.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleToggle(element.id)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={element.selected}
                      onChange={() => handleToggle(element.id)}
                      className="mt-0.5 h-4 w-4 border-gray-300 rounded"
                      style={{
                        accentColor: 'var(--primary-accent)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 font-ppsupply">
                            {element.label}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-ppsupply break-all">
                            {element.expectedValue}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#CAC8C7] p-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 font-ppsupply">
            {selectedCount === 0 
              ? "Select at least one element to start QA"
              : `Ready to validate ${selectedCount} element${selectedCount === 1 ? '' : 's'}`
            }
          </p>
          <div className="relative">
            <AnimatedButton
              type="button"
              onClick={onStartQA}
              disabled={!canStartQA}
              className={`relative !static ${!canStartQA ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              Start QA Validation
            </AnimatedButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
