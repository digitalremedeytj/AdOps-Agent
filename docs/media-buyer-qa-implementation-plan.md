# Agentic AI Media Buyer QA Tool - Implementation Plan

## Overview
Transform the existing Gemini Browser application into an Agentic AI Media Buyer QA tool. Phase 1 focuses on campaign quality assurance, with future phases expanding to full media buying capabilities.

## Phase 1: Campaign QA Tool

### User Flow
1. **Input Phase**: User provides two URLs
   - Campaign Info URL (Google Sheets)
   - Campaign/Line Item QA URL (Yahoo DSP page)

2. **Parsing Phase**: AI agent extracts campaign data from Google Sheets
   - Navigate to campaign info URL
   - Parse and extract all identifiable campaign elements
   - Return structured data for user selection

3. **Selection Phase**: User chooses which elements to validate
   - Display parsed elements with checkboxes
   - Categories: Budget, Targeting, Creative, Dates, etc.
   - User selects items for QA validation

4. **QA Execution Phase**: AI agent validates selected elements
   - Navigate to Yahoo DSP QA URL
   - Compare actual values against expected values
   - Take screenshots of relevant sections
   - Document discrepancies

5. **Results Phase**: Display comprehensive QA results
   - Overall status (PASS/FAIL)
   - Summary statistics (X passed, Y failed out of Z checks)
   - Detailed results table with screenshots

## Technical Architecture

### Frontend Components

#### New Components to Create
1. **`CampaignQAForm.tsx`** - Dual URL input form
   ```typescript
   interface CampaignQAFormProps {
     onSubmit: (campaignUrl: string, qaUrl: string) => void;
   }
   ```

2. **`CampaignElementSelector.tsx`** - Checkbox selection interface
   ```typescript
   interface CampaignElement {
     id: string;
     category: 'budget' | 'targeting' | 'creative' | 'dates' | 'other';
     label: string;
     expectedValue: string;
     selected: boolean;
   }
   ```

3. **`QAResultsDisplay.tsx`** - Results table and summary
   ```typescript
   interface QAResult {
     element: CampaignElement;
     actualValue: string;
     status: 'PASS' | 'FAIL';
     notes?: string;
     screenshot?: string;
   }
   ```

4. **`QAProgressTracker.tsx`** - Multi-phase progress indicator
   - Parsing → Selection → Execution → Results

#### Modified Components
1. **`page.tsx`** - Replace chat interface with QA workflow
2. **`ChatFeed.tsx`** - Adapt for QA-specific streaming
3. **`BrowserSessionContainer.tsx`** - Enhanced for QA screenshots

### Backend API Endpoints

#### New Endpoints
1. **`/api/campaign/parse`** - Campaign data extraction
   ```typescript
   POST /api/campaign/parse
   Body: { campaignUrl: string }
   Response: { elements: CampaignElement[] }
   ```

2. **`/api/campaign/qa`** - QA execution
   ```typescript
   POST /api/campaign/qa
   Body: { 
     qaUrl: string, 
     selectedElements: CampaignElement[] 
   }
   Response: SSE stream of QA progress
   ```

#### Modified Endpoints
1. **`/api/agent/stream/route.ts`** - Enhanced for two-phase operations
   - Support parsing mode vs QA mode
   - Handle structured data extraction
   - Manage screenshot capture timing

### Data Models

#### Core Types
```typescript
// Campaign element structure
interface CampaignElement {
  id: string;
  category: 'budget' | 'targeting' | 'creative' | 'dates' | 'placement' | 'other';
  label: string;
  expectedValue: string;
  selected: boolean;
  xpath?: string; // For precise element location
}

// QA validation result
interface QAResult {
  element: CampaignElement;
  actualValue: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  confidence: number; // AI confidence in the result
  notes?: string;
  screenshot?: string; // Base64 or URL
  timestamp: string;
}

// QA session state
interface QASession {
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
```

### Agent Instructions

#### Parsing Mode Instructions
```typescript
const PARSING_INSTRUCTIONS = `
You are a campaign data extraction specialist. Your task is to:

1. Navigate to the provided Google Sheets URL
2. Identify and extract ALL campaign-related information
3. Categorize each element (budget, targeting, creative, dates, etc.)
4. Return structured data for user selection

Extraction Rules:
- Look for numerical values (budgets, bids, quantities)
- Identify date ranges and schedules
- Extract targeting criteria (demographics, geo, interests)
- Find creative specifications and requirements
- Note any special instructions or constraints

Format each finding as:
- Category: The type of campaign element
- Label: Human-readable description
- Expected Value: The actual value found
- XPath: Element location for future reference (if applicable)
`;
```

#### QA Mode Instructions
```typescript
const QA_INSTRUCTIONS = `
You are a campaign QA specialist. Your task is to:

1. Navigate to the provided campaign/line item URL
2. Validate each selected element against expected values
3. Take screenshots when discrepancies are found
4. Document findings with confidence levels

Validation Rules:
- Exact match for critical values (budgets, dates)
- Fuzzy match for text content (allowing for formatting differences)
- Range validation for numerical targets
- Presence validation for required elements

For each validation:
- Compare actual vs expected values
- Assign PASS/FAIL/WARNING status
- Provide confidence score (0-100)
- Take screenshot if FAIL or low confidence
- Add explanatory notes for discrepancies
`;
```

## Implementation Phases

### Phase 1A: Core Infrastructure (Week 1)
**Goal**: Basic dual-URL input and parsing capability

**Tasks**:
1. Create `CampaignQAForm.tsx` component
2. Modify `page.tsx` to use new form instead of chat input
3. Create `/api/campaign/parse` endpoint
4. Update agent instructions for parsing mode
5. Create basic `CampaignElementSelector.tsx`
6. Test with Google Sheets parsing

**Deliverables**:
- Working URL input form
- Campaign data extraction from Google Sheets
- Checkbox selection interface
- Basic error handling

### Phase 1B: QA Engine (Week 2)
**Goal**: Core QA validation functionality

**Tasks**:
1. Create `/api/campaign/qa` endpoint
2. Implement QA validation logic in agent
3. Build `QAResultsDisplay.tsx` component
4. Add screenshot capture functionality
5. Create results table with Expected/Actual/Status/Notes
6. Implement overall PASS/FAIL determination

**Deliverables**:
- Working QA validation against Yahoo DSP
- Results table with screenshots
- Summary statistics display
- Progress tracking during QA execution

### Phase 1C: Polish & Optimization (Week 3)
**Goal**: Production-ready QA tool

**Tasks**:
1. Enhance error handling and edge cases
2. Optimize screenshot timing and quality
3. Improve element detection accuracy
4. Add validation confidence scoring
5. Polish UI/UX for better user experience
6. Add export capabilities for results

**Deliverables**:
- Robust error handling
- High-quality screenshots
- Accurate element detection
- Professional results presentation
- Export functionality

## Future Phases (Post-QA)

### Phase 2: Multi-Platform Support
- Add support for additional DSPs (Google Ads, Facebook, etc.)
- Platform-specific validation rules
- Universal campaign element mapping

### Phase 3: Campaign Creation
- Template-based campaign setup
- Automated line item creation
- Cross-platform campaign deployment

### Phase 4: Optimization Engine
- Performance monitoring
- Automated bid adjustments
- A/B testing management

### Phase 5: Full Media Buyer
- Budget allocation optimization
- Creative performance analysis
- Automated reporting and insights

## Technical Considerations

### Performance
- Implement caching for parsed campaign data
- Optimize screenshot capture and storage
- Use efficient DOM querying for element detection

### Scalability
- Design for multiple concurrent QA sessions
- Plan for high-volume campaign processing
- Consider database storage for campaign templates

### Security
- Validate all URLs before processing
- Implement rate limiting on API endpoints
- Secure handling of campaign data

### Monitoring
- Add logging for QA accuracy tracking
- Monitor agent performance and success rates
- Track user satisfaction with QA results

## Success Metrics

### Phase 1 Success Criteria
- Successfully parse 95%+ of Google Sheets campaign data
- Achieve 90%+ accuracy in QA validations
- Complete QA process in under 5 minutes per campaign
- Generate actionable results with clear pass/fail status

### User Experience Goals
- Intuitive workflow requiring minimal training
- Clear progress indication throughout process
- Comprehensive results with actionable insights
- Reliable performance across different campaign types

## Risk Mitigation

### Technical Risks
- **Google Sheets Access**: Handle various sharing permissions and formats
- **Yahoo DSP Changes**: Build resilient element detection
- **Screenshot Quality**: Ensure readable and relevant captures
- **Agent Reliability**: Implement fallback strategies for failed operations

### Business Risks
- **Accuracy Requirements**: Implement confidence scoring and manual review options
- **Scale Limitations**: Design for gradual capacity increases
- **Platform Dependencies**: Plan for API changes and access restrictions

## Conclusion

This implementation plan provides a structured approach to transforming the Gemini Browser into a powerful Campaign QA tool. The phased approach allows for iterative development and testing, while the technical architecture ensures scalability for future media buyer capabilities.

The focus on Yahoo DSP for Phase 1 provides a concrete target for validation, while the modular design enables easy expansion to additional platforms and capabilities in future phases.
