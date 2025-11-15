export interface CampaignElement {
  id: string;
  category: 'budget' | 'targeting' | 'creative' | 'dates' | 'placement' | 'other';
  label: string;
  expectedValue: string;
  selected: boolean;
  xpath?: string; // For precise element location
}

export interface QAResult {
  element: CampaignElement;
  actualValue: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  confidence: number; // AI confidence in the result
  notes?: string;
  screenshot?: string; // Base64 or URL
  timestamp: string;
}

export interface QASession {
  id: string;
  campaignUrl: string;
  qaUrl: string;
  elements: CampaignElement[];
  results: QAResult[];
  status: 'parsing' | 'selecting' | 'executing' | 'completed' | 'failed';
  overallStatus?: 'PASS' | 'FAIL';
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface CampaignQAFormProps {
  onSubmit: (campaignUrl: string, qaUrl: string) => void;
}

export interface CampaignElementSelectorProps {
  elements: CampaignElement[];
  onSelectionChange: (elements: CampaignElement[]) => void;
  onStartQA: () => void;
}

export interface QAResultsDisplayProps {
  results: QAResult[];
  summary: QASession['summary'];
  overallStatus: 'PASS' | 'FAIL';
}
