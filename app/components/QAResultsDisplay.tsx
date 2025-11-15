"use client";

import { useState } from "react";
import { QAResult, QASession } from "../types/Campaign";
import { CheckCircle, XCircle, AlertTriangle, Eye, Download, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QAResultsDisplayProps {
  results: QAResult[];
  summary: QASession['summary'];
  overallStatus: 'PASS' | 'FAIL';
  onBack?: () => void;
}

const StatusIcon = ({ status, confidence }: { status: 'PASS' | 'FAIL' | 'WARNING', confidence: number }) => {
  if (status === 'PASS') {
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  } else if (status === 'FAIL') {
    return <XCircle className="w-5 h-5 text-red-600" />;
  } else {
    return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  }
};

const ConfidenceBar = ({ confidence }: { confidence: number }) => {
  const getColor = (conf: number) => {
    if (conf >= 80) return 'bg-green-500';
    if (conf >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${getColor(confidence)}`}
        style={{ width: `${confidence}%` }}
      />
    </div>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const getColor = (cat: string) => {
    switch (cat) {
      case 'budget': return 'bg-blue-100 text-blue-800';
      case 'targeting': return 'bg-purple-100 text-purple-800';
      case 'creative': return 'bg-green-100 text-green-800';
      case 'dates': return 'bg-orange-100 text-orange-800';
      case 'placement': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColor(category)}`}>
      {category}
    </span>
  );
};

const ScreenshotModal = ({ screenshot, onClose }: { screenshot: string, onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Screenshot</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <img 
            src={screenshot} 
            alt="QA Screenshot" 
            className="max-w-full max-h-[70vh] object-contain mx-auto"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function QAResultsDisplay({ results, summary, overallStatus, onBack }: QAResultsDisplayProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (resultId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedRows(newExpanded);
  };

  const exportResults = () => {
    const csvContent = [
      ['Element', 'Category', 'Expected Value', 'Actual Value', 'Status', 'Confidence', 'Notes'],
      ...results.map(result => [
        result.element.label,
        result.element.category,
        result.element.expectedValue,
        result.actualValue,
        result.status,
        result.confidence.toString(),
        result.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900">QA Results</h1>
        </div>
        <button
          onClick={exportResults}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--primary-accent)',
            borderRadius: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4845e4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-accent)';
          }}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-lg border-2 ${
            overallStatus === 'PASS' 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex items-center gap-3">
            {overallStatus === 'PASS' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <p className="text-sm text-gray-600">Overall Status</p>
              <p className={`text-xl font-bold ${
                overallStatus === 'PASS' ? 'text-green-700' : 'text-red-700'
              }`}>
                {overallStatus}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-lg border border-gray-200 bg-white"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-full flex items-center justify-center" style={{ width: '45px', height: '45px' }}>
              <span className="text-blue-600 font-bold" style={{ letterSpacing: '-0.05em' }}>{passRate}%</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pass Rate</p>
              <p className="text-xl font-bold text-gray-900">{summary.passed}/{summary.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-lg border border-gray-200 bg-white"
        >
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-xl font-bold text-gray-900">{summary.failed}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-lg border border-gray-200 bg-white"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Warnings</p>
              <p className="text-xl font-bold text-gray-900">{summary.warnings}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Results Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detailed Results</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Element
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => {
                const isExpanded = expandedRows.has(result.element.id);
                return (
                  <motion.tr
                    key={result.element.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{result.element.label}</span>
                          <CategoryBadge category={result.element.category} />
                        </div>
                        {isExpanded && result.notes && (
                          <p className="text-sm text-gray-600 mt-2">{result.notes}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-mono">
                        {result.element.expectedValue}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 font-mono">
                        {result.actualValue}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={result.status} confidence={result.confidence} />
                        <span className={`text-sm font-medium ${
                          result.status === 'PASS' ? 'text-green-700' :
                          result.status === 'FAIL' ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <ConfidenceBar confidence={result.confidence} />
                        </div>
                        <span className="text-sm text-gray-600">{result.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {result.screenshot && (
                          <button
                            onClick={() => setSelectedScreenshot(result.screenshot!)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Screenshot"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleRowExpansion(result.element.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {isExpanded ? 'Less' : 'More'}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Screenshot Modal */}
      <AnimatePresence>
        {selectedScreenshot && (
          <ScreenshotModal
            screenshot={selectedScreenshot}
            onClose={() => setSelectedScreenshot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
