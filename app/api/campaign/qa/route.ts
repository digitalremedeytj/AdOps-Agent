import { Stagehand } from "@browserbasehq/stagehand";
import { createStagehandUserLogger } from "../../agent/logger";
import { CampaignElement, QAResult, QASession } from "@/app/types/Campaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes for QA validation

const QA_INSTRUCTIONS = `
You are a campaign QA specialist. Your task is to validate campaign elements against a DSP platform (like Yahoo DSP).

VALIDATION PROCESS:
1. Navigate to the provided QA URL
2. For each campaign element, locate the corresponding field/value on the page
3. Compare actual vs expected values
4. Take screenshots when discrepancies are found or confidence is low
5. Document findings with confidence levels

VALIDATION RULES:
- Exact match for critical values (budgets, dates): PASS with 100% confidence
- Fuzzy match for text content (allowing for formatting differences): PASS with 85-95% confidence
- Range validation for numerical targets: PASS/WARNING based on tolerance
- Presence validation for required elements: PASS if found, FAIL if missing

CONFIDENCE SCORING:
- 100%: Exact match found
- 85-95%: Close match (minor formatting differences)
- 60-80%: Partial match or within acceptable range
- 30-60%: Questionable match, needs review
- 0-30%: No match or significant discrepancy
- 0%: Element not found on page

SCREENSHOT STRATEGY:
- Take screenshot when confidence < 80%
- Take screenshot for all FAIL results
- Take targeted screenshots of specific elements when possible
- Include full page context when element location is unclear

RESULT FORMAT:
After completing all validations, provide your results in JSON format only. Do not include any other text before or after the JSON.

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
    "totalElements": 16,
    "passed": 15,
    "failed": 0,
    "warnings": 1,
    "overallStatus": "PASS"
  }
}

IMPORTANT: 
- Only output valid JSON, no additional text
- Include all 16 elements in validationResults array
- Use exact elementId values provided (element-1, element-2, etc.)
- Status must be exactly "PASS", "FAIL", or "WARNING"
- Confidence must be integer 0-100
- Provide clean actualValue without "Expected:" text

Work systematically through each element. Be thorough but efficient.
`;

function sseEncode(event: string, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`);
}

function sseComment(comment: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`:${comment}\n\n`);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { qaUrl, selectedElements, sessionId } = body;

  if (!qaUrl || !selectedElements || !Array.isArray(selectedElements)) {
    return new Response(
      JSON.stringify({ error: "Missing required params: qaUrl and selectedElements" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let stagehandRef: Stagehand | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
      let closed = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch (err) {
          console.error(`[QA SSE] enqueue error`, err instanceof Error ? err.message : String(err));
        }
      };

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          safeEnqueue(sseEncode(event, data));
        } catch (err) {
          console.error(`[QA SSE] send error`, err instanceof Error ? err.message : String(err));
        }
      };

      const cleanup = async (stagehand?: Stagehand) => {
        if (closed) return;
        closed = true;
        if (keepAliveTimer) clearInterval(keepAliveTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        try {
          if (stagehand && !stagehand.isClosed) {
            await stagehand.close();
          }
        } catch {
          console.error(`[QA SSE] error closing stagehand`);
        }
        controller.close();
      };

      // Keep the connection alive
      keepAliveTimer = setInterval(() => {
        safeEnqueue(sseComment("keepalive"));
      }, 15000);

      // Hard timeout at 10 minutes
      timeoutTimer = setTimeout(async () => {
        console.log(`[QA SSE] Timeout reached`);
        send("error", { message: "QA validation timed out after 10 minutes" });
        await cleanup();
      }, 10 * 60 * 1000);

      console.log(`[QA SSE] Starting QA validation`, {
        qaUrl,
        elementsCount: selectedElements.length,
        sessionId,
      });

      const logger = createStagehandUserLogger(send, { forwardStepEvents: true });

      const stagehand = new Stagehand({
        env: "BROWSERBASE",
        browserbaseSessionID: sessionId,
        modelName: "openai/gpt-4o",
        modelClientOptions: {
          apiKey: process.env.OPENAI_API_KEY,
        },
        browserbaseSessionCreateParams: {
          projectId: process.env.BROWSERBASE_PROJECT_ID!,
          proxies: false,
          browserSettings: {
            viewport: {
              width: 1280,
              height: 720,
            },
          },
        },
        useAPI: false,
        verbose: 2,
        disablePino: true,
        logger: logger,
      });
      stagehandRef = stagehand;

      try {
        const init = await stagehand.init();
        console.log(`[QA SSE] Stagehand initialized`, init);

        const page = stagehand.page;
        await page.route("**/*", (route) => {
          const url = route.request().url().toLowerCase();
          if (url.includes("gemini.browserbase.com") || url.includes("arena.browserbase.com") || url.includes("google.browserbase.com") || url.includes("google-cua.browserbase.com") || url.includes("cua.browserbase.com") || url.includes("operator.browserbase.com") || url.includes("doge.ct.ws")) {
            console.log(`[QA SSE] Blocked navigation to: ${url}`);
            route.abort("blockedbyclient");
          } else {
            route.continue();
          }
        });

        send("start", {
          qaUrl,
          elementsCount: selectedElements.length,
          sessionId,
          startedAt: new Date().toISOString(),
        });

        // Create detailed QA instruction with selected elements
        const elementsText = selectedElements
          .map((el: CampaignElement, index: number) => 
            `${index + 1}. ${el.label} (Category: ${el.category})
   Expected Value: "${el.expectedValue}"
   Element ID: ${el.id}`
          )
          .join('\n\n');

        const qaInstruction = `Navigate to ${qaUrl} and validate the following ${selectedElements.length} campaign elements:

${elementsText}

For each element:
1. Locate the corresponding field/value on the page
2. Compare actual vs expected value
3. Determine status (PASS/FAIL/WARNING) and confidence (0-100)
4. Take screenshot if confidence < 80% or status is FAIL
5. Provide clear notes explaining your findings

After validating all elements, provide a summary with:
- Total elements checked
- Number passed/failed/warnings
- Overall assessment (PASS/FAIL)
- Any critical issues found

Work through each element systematically and be thorough in your validation.`;

        const agent = stagehand.agent({
          provider: "google", 
          model: "gemini-2.5-computer-use-preview-10-2025",
          options: {
            apiKey: process.env.GOOGLE_API_KEY,
          },
          instructions: QA_INSTRUCTIONS,
        });

        const result = await agent.execute({
          instruction: qaInstruction,
          autoScreenshot: true,
          waitBetweenActions: 500, // Slower for QA accuracy
          maxSteps: 150, // More steps for thorough validation
        });

        // Process the QA results
        const qaResults = await processQAResults(result, selectedElements, logger);

        try {
          console.log(`[QA SSE] metrics snapshot`, stagehand.metrics);
          send("metrics", stagehand.metrics);
        } catch {}

        const finalMessage = logger.getLastReasoning();
        console.log(`[QA SSE] QA validation completed`, {
          success: result.success,
          completed: result.completed,
          resultsCount: qaResults.length,
        });

        send("qa_results", {
          results: qaResults,
          summary: calculateSummary(qaResults),
          overallStatus: determineOverallStatus(qaResults),
          finalMessage,
        });

        send("done", { 
          ...result, 
          finalMessage,
          qaResults,
          summary: calculateSummary(qaResults),
          overallStatus: determineOverallStatus(qaResults),
        });

        await cleanup(stagehand);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[QA SSE] error`, message);
        send("error", { message });
        await cleanup(stagehand);
      }
    },
    cancel: async () => {
      try {
        if (stagehandRef && !stagehandRef.isClosed) {
          await stagehandRef.close();
        }
      } catch {
        // no-op
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function processQAResults(
  result: any, 
  selectedElements: CampaignElement[], 
  logger: any
): Promise<QAResult[]> {
  const qaResults: QAResult[] = [];
  
  try {
    // Get reasoning messages - handle different logger implementations
    let allMessages: any[] = [];
    let finalMessage = '';
    
    try {
      if (typeof logger.getAllMessages === 'function') {
        allMessages = logger.getAllMessages();
      }
      if (typeof logger.getLastReasoning === 'function') {
        finalMessage = logger.getLastReasoning();
      }
    } catch (loggerError) {
      console.log('[QA Processing] Logger method error:', loggerError);
    }
    
    // Combine all content for parsing
    const allContent = allMessages
      .map((msg: any) => msg.content || msg.message || '')
      .join('\n') + '\n' + (finalMessage || '');
    
    console.log('[QA Processing] Full content length:', allContent.length);
    console.log('[QA Processing] Content preview:', allContent.substring(0, 500));
    
    // Try to parse JSON response first
    try {
      // Look for JSON in the content
      const jsonMatch = allContent.match(/\{[\s\S]*"validationResults"[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[QA Processing] Found JSON response, attempting to parse...');
        const jsonData = JSON.parse(jsonMatch[0]);
        
        if (jsonData.validationResults && Array.isArray(jsonData.validationResults)) {
          console.log('[QA Processing] Successfully parsed JSON with', jsonData.validationResults.length, 'results');
          
          // Convert JSON results to QAResult format
          for (const jsonResult of jsonData.validationResults) {
            const element = selectedElements.find(el => el.id === jsonResult.elementId);
            if (element) {
              qaResults.push({
                element,
                actualValue: jsonResult.actualValue || "Not found",
                status: jsonResult.status || 'WARNING',
                confidence: jsonResult.confidence || 50,
                notes: jsonResult.notes || "No notes provided",
                timestamp: new Date().toISOString(),
              });
            }
          }
          
          console.log('[QA Processing] JSON parsing successful, returning', qaResults.length, 'results');
          return qaResults;
        }
      }
    } catch (jsonError) {
      console.log('[QA Processing] JSON parsing failed, falling back to text parsing:', jsonError);
    }
    
    // Fallback to text parsing if JSON parsing fails
    console.log('[QA Processing] Using fallback text parsing...');
    
    // Enhanced parsing for structured QA results
    for (const element of selectedElements) {
      let qaResult: QAResult = {
        element,
        actualValue: "Unable to determine",
        status: 'WARNING',
        confidence: 50,
        notes: "QA validation completed but specific result unclear",
        timestamp: new Date().toISOString(),
      };
      
      // Look for structured QA result blocks for this element
      const elementPatterns = [
        new RegExp(`ELEMENT:\\s*${escapeRegex(element.label)}[\\s\\S]*?(?=ELEMENT:|$)`, 'i'),
        new RegExp(`${escapeRegex(element.label)}[\\s\\S]*?(?=ELEMENT:|${escapeRegex(selectedElements[selectedElements.indexOf(element) + 1]?.label || 'END')}|$)`, 'i')
      ];
      
      let elementBlock = '';
      for (const pattern of elementPatterns) {
        const match = allContent.match(pattern);
        if (match && match[0].length > elementBlock.length) {
          elementBlock = match[0];
        }
      }
      
      if (elementBlock) {
        console.log(`[QA Processing] Found block for ${element.label}:`, elementBlock.substring(0, 200));
        
        // Extract ACTUAL value - try multiple patterns
        let actualMatch = elementBlock.match(/ACTUAL:\s*([^\n\r]+)/i);
        if (!actualMatch) {
          // Try to extract from "Actual value found:" pattern
          actualMatch = elementBlock.match(/Actual value found:\s*"([^"]+)"/i);
        }
        if (!actualMatch) {
          // Try to extract from "On page:" pattern
          actualMatch = elementBlock.match(/On page:.*?"([^"]+)"/i);
        }
        if (!actualMatch) {
          // Try to extract from status line patterns
          actualMatch = elementBlock.match(/Actual\s+"([^"]+)"/i);
        }
        if (actualMatch) {
          qaResult.actualValue = actualMatch[1].trim();
        }
        
        // Extract STATUS
        const statusMatch = elementBlock.match(/STATUS:\s*(PASS|FAIL|WARNING)/i);
        if (statusMatch) {
          qaResult.status = statusMatch[1].toUpperCase() as 'PASS' | 'FAIL' | 'WARNING';
        }
        
        // Extract CONFIDENCE
        const confidenceMatch = elementBlock.match(/CONFIDENCE:\s*(\d+)%?/i);
        if (confidenceMatch) {
          qaResult.confidence = parseInt(confidenceMatch[1]);
        }
        
        // Extract NOTES
        const notesMatch = elementBlock.match(/NOTES:\s*([^\n\r]+)/i);
        if (notesMatch) {
          qaResult.notes = notesMatch[1].trim();
        }
      } else {
        // Fallback: look for any mention of the element
        const elementMentions = allContent.toLowerCase().includes(element.label.toLowerCase()) ||
                              allContent.toLowerCase().includes(element.expectedValue.toLowerCase());
        
        if (elementMentions) {
          // Try to extract basic status information
          const contextStart = allContent.toLowerCase().indexOf(element.label.toLowerCase());
          if (contextStart !== -1) {
            const context = allContent.substring(contextStart, contextStart + 500);
            
            if (context.toLowerCase().includes('pass')) {
              qaResult.status = 'PASS';
              qaResult.confidence = 75;
              qaResult.actualValue = "Found and validated";
              qaResult.notes = "Element found and appears to match expected value";
            } else if (context.toLowerCase().includes('fail')) {
              qaResult.status = 'FAIL';
              qaResult.confidence = 25;
              qaResult.actualValue = "Found but does not match";
              qaResult.notes = "Element found but validation failed";
            }
          }
        }
      }
      
      console.log(`[QA Processing] Result for ${element.label}:`, {
        status: qaResult.status,
        confidence: qaResult.confidence,
        actualValue: qaResult.actualValue.substring(0, 50)
      });
      
      qaResults.push(qaResult);
    }
  } catch (error) {
    console.error('Error processing QA results:', error);
    
    // Fallback: create default results for all elements
    for (const element of selectedElements) {
      qaResults.push({
        element,
        actualValue: "Processing error",
        status: 'WARNING',
        confidence: 0,
        notes: "Error occurred during result processing",
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  return qaResults;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateSummary(results: QAResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  
  return {
    total,
    passed,
    failed,
    warnings,
  };
}

function determineOverallStatus(results: QAResult[]): 'PASS' | 'FAIL' {
  const failedCount = results.filter(r => r.status === 'FAIL').length;
  const criticalFailures = results.filter(r => 
    r.status === 'FAIL' && 
    (r.element.category === 'budget' || r.element.category === 'dates')
  ).length;
  
  // Fail if there are any critical failures or more than 20% failures
  if (criticalFailures > 0 || failedCount > results.length * 0.2) {
    return 'FAIL';
  }
  
  return 'PASS';
}
