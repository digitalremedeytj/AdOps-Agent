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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newElement, setNewElement] = useState({
    label: '',
    expectedValue: ''
  });

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

  const handleAddElement = () => {
    if (!newElement.label.trim() || !newElement.expectedValue.trim()) return;

    const elementToAdd: CampaignElement = {
      id: `custom-element-${Date.now()}`,
      label: newElement.label.trim(),
      expectedValue: newElement.expectedValue.trim(),
      selected: true
    };

    const updated = [...localElements, elementToAdd];
    setLocalElements(updated);
    onSelectionChange(updated);

    // Reset form
    setNewElement({
      label: '',
      expectedValue: ''
    });
    setShowAddForm(false);
  };

  const handleCancelAdd = () => {
    setNewElement({
      label: '',
      expectedValue: ''
    });
    setShowAddForm(false);
  };

  const selectedCount = localElements.filter(el => el.selected).length;
  const canStartQA = selectedCount > 0;

  // No grouping - display elements in order detected

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
          <button
            onClick={() => setShowAddForm(true)}
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
            + Add Element
          </button>
          <div className="ml-auto text-sm text-gray-500 font-ppsupply flex items-center">
            {selectedCount} of {localElements.length} selected
          </div>
        </div>
      </div>

      {/* Add Element Form */}
      {showAddForm && (
        <div className="border-b border-[#CAC8C7] p-6 bg-gray-50">
          <h3 className="text-lg font-ppneue text-gray-900 mb-4">Add Custom Element</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-ppsupply mb-2">
                  Element Label
                </label>
                <input
                  type="text"
                  value={newElement.label}
                  onChange={(e) => setNewElement({ ...newElement, label: e.target.value })}
                  placeholder="e.g., Additional Cost Type"
                  className="w-full px-3 py-2 border border-[#CAC8C7] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 font-ppsupply text-sm"
                  style={{
                    '--tw-ring-color': 'var(--primary-accent)',
                    borderRadius: '8px',
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-accent)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CAC8C7';
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-ppsupply mb-2">
                  Expected Value
                </label>
                <input
                  type="text"
                  value={newElement.expectedValue}
                  onChange={(e) => setNewElement({ ...newElement, expectedValue: e.target.value })}
                  placeholder="e.g., Brand Safety"
                  className="w-full px-3 py-2 border border-[#CAC8C7] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 font-ppsupply text-sm"
                  style={{
                    '--tw-ring-color': 'var(--primary-accent)',
                    borderRadius: '8px',
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-accent)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CAC8C7';
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddElement}
                disabled={!newElement.label.trim() || !newElement.expectedValue.trim()}
                className="px-4 py-2 text-white font-medium transition-colors font-ppsupply disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--primary-accent)',
                  borderRadius: '8px',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#4845e4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--primary-accent)';
                  }
                }}
              >
                Add Element
              </button>
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 text-gray-700 border border-[#CAC8C7] font-medium transition-colors font-ppsupply"
                style={{
                  borderRadius: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-accent)';
                  e.currentTarget.style.color = 'var(--primary-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CAC8C7';
                  e.currentTarget.style.color = '#374151';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elements List */}
      <div className="p-6 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {localElements.map((element) => (
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
