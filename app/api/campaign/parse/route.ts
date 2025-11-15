import { Stagehand } from "@browserbasehq/stagehand";
import { createStagehandUserLogger } from "../../agent/logger";
import { CampaignElement } from "@/app/types/Campaign";
import { googleSheetsService } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for parsing

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

For each element you find, determine:
- Category: budget, targeting, creative, dates, placement, or other
- Label: Human-readable description of what this element is
- Expected Value: The actual value found in the sheet

Focus on extracting actionable campaign elements that would need validation in a DSP platform.
Be thorough but avoid duplicates. If you see the same information in multiple cells, only extract it once.

After extracting all elements, provide a JSON response with the following structure:
{
  "elements": [
    {
      "id": "unique-id",
      "category": "budget|targeting|creative|dates|placement|other",
      "label": "Human readable label",
      "expectedValue": "The value found",
      "selected": false
    }
  ]
}
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignUrl } = body;

    if (!campaignUrl) {
      return new Response(
        JSON.stringify({ error: "Missing campaignUrl parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[Campaign Parse] Starting parsing for URL: ${campaignUrl}`);

    // Try Google Sheets API first
    try {
      console.log(`[Campaign Parse] Attempting Google Sheets API parsing`);
      
      const sheetData = await googleSheetsService.readSheet(campaignUrl);
      const parsedData = googleSheetsService.parseMediaPlanData(sheetData);
      const elements = googleSheetsService.convertToCampaignElements(parsedData);

      console.log(`[Campaign Parse] Google Sheets API success: Found ${elements.length} elements`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          elements,
          message: `Found ${elements.length} campaign elements via Google Sheets API`,
          method: 'google-sheets-api'
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );

    } catch (apiError) {
      console.log(`[Campaign Parse] Google Sheets API failed, falling back to browser automation:`, apiError);
    }

    // Fallback to browser automation
    console.log(`[Campaign Parse] Using browser automation fallback`);

    // Create a simple logger that doesn't send SSE events
    const logger = createStagehandUserLogger(() => {}, { forwardStepEvents: false });

    const stagehand = new Stagehand({
      env: "BROWSERBASE",
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

    try {
      const init = await stagehand.init();
      console.log(`[Campaign Parse] Stagehand initialized`, init);

      const agent = stagehand.agent({
        provider: "google", 
        model: "gemini-2.5-computer-use-preview-10-2025",
        options: {
          apiKey: process.env.GOOGLE_API_KEY,
        },
        instructions: PARSING_INSTRUCTIONS,
      });

      const result = await agent.execute({
        instruction: `Navigate to ${campaignUrl} and extract all campaign elements. Return the results as JSON in the specified format.`,
        autoScreenshot: true,
        waitBetweenActions: 200,
        maxSteps: 50,
      });

      console.log(`[Campaign Parse] Agent execution completed`, {
        success: result.success,
        completed: result.completed,
      });

      // Try to parse the result as JSON
      let elements: CampaignElement[] = [];
      
      if (result.success && result.completed) {
        try {
          // Get the final reasoning message which should contain our JSON
          const finalMessage = logger.getLastReasoning();
          let textToSearch = finalMessage || '';
          
          // Look for JSON in the final message
          const jsonMatch = textToSearch.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.elements && Array.isArray(parsed.elements)) {
              elements = parsed.elements.map((el: any, index: number) => ({
                id: el.id || `element-${index}`,
                category: el.category || 'other',
                label: el.label || 'Unknown Element',
                expectedValue: el.expectedValue || '',
                selected: false,
                xpath: el.xpath
              }));
            }
          }
        } catch (parseError) {
          console.error(`[Campaign Parse] JSON parsing error:`, parseError);
          // Fallback: create a single element with the raw result
          const finalMessage = logger.getLastReasoning();
          elements = [{
            id: 'raw-result',
            category: 'other',
            label: 'Raw Extraction Result',
            expectedValue: finalMessage || 'No data extracted',
            selected: false
          }];
        }
      }

      await stagehand.close();

      return new Response(
        JSON.stringify({ 
          success: true, 
          elements,
          message: `Found ${elements.length} campaign elements`
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );

    } catch (error) {
      console.error(`[Campaign Parse] Stagehand error:`, error);
      
      try {
        await stagehand.close();
      } catch (closeError) {
        console.error(`[Campaign Parse] Error closing stagehand:`, closeError);
      }

      const message = error instanceof Error ? error.message : String(error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to parse campaign data", 
          details: message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

  } catch (error) {
    console.error(`[Campaign Parse] Request error:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Invalid request", 
        details: message 
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
