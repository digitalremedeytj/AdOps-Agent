# Campaign QA Tool - Main Application Documentation

## Overview

The Campaign QA Tool is an AI-powered application that automates the quality assurance process for digital advertising campaigns. It validates campaign elements by comparing data from Google Sheets against actual values in DSP (Demand-Side Platform) interfaces like Yahoo DSP.

## Application Architecture

### Core Workflow

The application follows a structured 5-phase workflow:

1. **Input Phase** - User provides campaign and QA URLs
2. **Parsing Phase** - AI extracts campaign elements from Google Sheets
3. **Selection Phase** - User selects elements to validate
4. **Live QA Phase** - AI performs validation with visual browser automation
5. **Results Phase** - Structured QA results with actionable insights

### Technical Stack

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **AI Agent**: Gemini Computer Use (`gemini-2.5-computer-use-preview-10-2025`)
- **Browser Automation**: Browserbase + Stagehand
- **Data Processing**: Google Sheets API with browser fallback
- **Real-time Communication**: Server-Sent Events (SSE)

## User Interface Components

### 1. Campaign QA Form (`CampaignQAForm.tsx`)
- **Purpose**: Dual URL input interface
- **Inputs**: 
  - Campaign Info URL (Google Sheets)
  - Campaign/Line Item QA URL (DSP platform)
- **Validation**: URL format validation and accessibility checks

### 2. Campaign Element Selector (`CampaignElementSelector.tsx`)
- **Purpose**: Interactive element selection interface
- **Features**:
  - Categorized element display (Budget, Targeting, Creative, Dates, Placement)
  - Bulk selection controls (Select All/None)
  - Element count tracking
  - Category-based organization

### 3. QA Chat Feed (`QAChatFeed.tsx`)
- **Purpose**: Live browser automation visualization
- **Features**:
  - Real-time browser screenshots
  - Step-by-step agent reasoning
  - Progress tracking
  - JSON result parsing from final agent response

### 4. QA Results Display (`QAResultsDisplay.tsx`)
- **Purpose**: Professional QA results presentation
- **Features**:
  - Summary cards (Overall Status, Pass Rate, Failed, Warnings)
  - Detailed results table with Expected/Actual/Status/Confidence columns
  - Category badges and confidence bars
  - Screenshot viewing modal
  - CSV export functionality

## API Endpoints

### 1. Campaign Parsing (`/api/campaign/parse`)
- **Method**: POST
- **Purpose**: Extract campaign elements from Google Sheets
- **Process**:
  1. Attempts Google Sheets API parsing first
  2. Falls back to browser automation if API fails
  3. Returns structured campaign elements
- **Response**: Array of `CampaignElement` objects

### 2. QA Validation (`/api/campaign/qa`)
- **Method**: POST
- **Purpose**: Dedicated QA validation with structured results
- **Process**:
  1. Initializes Stagehand browser session
  2. Navigates to QA URL
  3. Validates selected elements systematically
  4. Streams progress via SSE
  5. Returns JSON-formatted results
- **Response**: SSE stream with QA progress and final results

### 3. Agent Stream (`/api/agent/stream`)
- **Method**: GET (SSE)
- **Purpose**: General browser automation with visual feedback
- **Process**:
  1. Creates browser session
  2. Executes agent instructions
  3. Streams real-time progress
  4. Provides visual browser automation
- **Response**: SSE stream with browser steps and screenshots

## Data Models

### Campaign Element
```typescript
interface CampaignElement {
  id: string;
  category: 'budget' | 'targeting' | 'creative' | 'dates' | 'placement' | 'other';
  label: string;
  expectedValue: string;
  selected: boolean;
  xpath?: string;
}
```

### QA Result
```typescript
interface QAResult {
  element: CampaignElement;
  actualValue: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  confidence: number; // 0-100
  notes?: string;
  screenshot?: string;
  timestamp: string;
}
```

### QA Session
```typescript
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

## AI Agent Instructions

### QA Validation Process

The AI agent follows a systematic validation process:

1. **Navigation**: Navigate to the provided QA URL
2. **Element Location**: Locate each campaign element on the page
3. **Value Comparison**: Compare actual vs expected values
4. **Status Determination**: Assign PASS/FAIL/WARNING status
5. **Confidence Scoring**: Rate validation confidence (0-100)
6. **Screenshot Capture**: Take screenshots for discrepancies
7. **JSON Output**: Provide structured results in JSON format

### Validation Rules

- **Exact Match**: Critical values (budgets, dates) require 100% match
- **Fuzzy Match**: Text content allows formatting differences (85-95% confidence)
- **Range Validation**: Numerical targets use tolerance-based validation
- **Presence Validation**: Required elements must be found on page

### Confidence Scoring

- **100%**: Exact match found
- **85-95%**: Close match (minor formatting differences)
- **60-80%**: Partial match or within acceptable range
- **30-60%**: Questionable match, needs review
- **0-30%**: No match or significant discrepancy
- **0%**: Element not found on page

## JSON Output Format

The agent provides results in a structured JSON format:

```json
{
  "validationResults": [
    {
      "elementId": "element-1",
      "elementLabel": "Line Name",
      "expectedValue": "Yahoo! - Magnite - LG Sports - NCA Test 2",
      "actualValue": "Yahoo! - Magnite - LG Sports - NCA Test 2",
      "status": "PASS",
      "confidence": 100,
      "notes": "Exact match found"
    }
  ],
  "summary": {
    "totalElements": 16,
    "passed": 15,
    "failed": 0,
    "warnings": 1,
    "overallStatus": "PASS"
  }
}
```

## Google Sheets Integration

### Supported Formats

1. **Key-Value Format**: Two-column layout with "Key" and "Value" headers
2. **Structured Format**: Multi-column layout with campaign data
3. **Mixed Format**: Combination of structured and key-value data

### Data Extraction

The system extracts various campaign elements:
- **Budget Information**: CPM prices, bid amounts, total budgets
- **Targeting Data**: Demographics, geography, interests
- **Creative Specs**: Ad formats, sizes, requirements
- **Scheduling**: Start/end dates, flight schedules
- **Placement Details**: Inventory sources, deal IDs

## Error Handling

### Parsing Errors
- Google Sheets API failures fall back to browser automation
- Invalid URLs are validated before processing
- Missing data is handled gracefully with warnings

### Validation Errors
- Page load failures are retried automatically
- Element not found scenarios are marked as FAIL
- Browser session errors trigger cleanup and reporting

### Result Processing Errors
- JSON parsing failures fall back to text parsing
- Missing confidence scores default to appropriate values
- Malformed responses generate warning status

## Performance Considerations

### Optimization Strategies
- **Caching**: Parsed campaign data is cached during session
- **Efficient Scrolling**: Smart page navigation to find elements
- **Screenshot Management**: Targeted captures for discrepancies only
- **Session Reuse**: Browser sessions are reused when possible

### Timeouts and Limits
- **Parsing Timeout**: 5 minutes for Google Sheets extraction
- **QA Timeout**: 10 minutes for complete validation
- **Step Limits**: Maximum 150 steps per validation session
- **Element Limits**: No hard limit, but optimized for 10-50 elements

## Security and Privacy

### Data Handling
- Campaign data is processed in memory only
- No persistent storage of sensitive information
- Browser sessions are automatically cleaned up
- API keys are securely managed via environment variables

### Access Control
- Google Sheets must be publicly accessible or properly shared
- DSP platforms require appropriate user permissions
- No authentication bypass or credential storage

## Monitoring and Analytics

### Performance Metrics
- Parsing success rates and timing
- Validation accuracy and confidence scores
- User interaction patterns
- Error rates and failure modes

### Quality Assurance
- Agent performance tracking
- Result accuracy validation
- User satisfaction monitoring
- Continuous improvement feedback loops

## Troubleshooting

### Common Issues

1. **Google Sheets Access Denied**
   - Ensure sheet is publicly accessible or properly shared
   - Check URL format and permissions

2. **DSP Page Load Failures**
   - Verify URL accessibility
   - Check for authentication requirements
   - Ensure page structure hasn't changed

3. **Element Not Found**
   - Page structure may have changed
   - Element selectors may need updating
   - Consider using alternative identification methods

4. **Low Confidence Scores**
   - Review element labeling accuracy
   - Check for formatting differences
   - Validate expected values against actual page content

### Debug Information

The application provides extensive logging:
- Browser automation steps
- Element detection attempts
- Confidence score calculations
- JSON parsing results
- Error stack traces

## Future Enhancements

### Planned Features
- Multi-platform DSP support (Google Ads, Facebook, etc.)
- Campaign template management
- Automated reporting and scheduling
- Performance optimization recommendations
- Advanced screenshot analysis

### Scalability Improvements
- Database storage for campaign templates
- Batch processing capabilities
- API rate limiting and queuing
- Distributed validation processing

## Support and Maintenance

### Regular Updates
- DSP platform compatibility checks
- Google Sheets API version updates
- AI model performance optimization
- User interface improvements

### Monitoring
- System health checks
- Performance metric tracking
- Error rate monitoring
- User feedback collection

---

*This documentation reflects the current state of the Campaign QA Tool as of Phase 1B implementation. For technical implementation details, see the source code and inline comments.*
