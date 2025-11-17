import Browserbase from "@browserbasehq/sdk";
import { NextResponse } from "next/server";

async function handoffSessionToAI(sessionId: string): Promise<{
  success: boolean;
  sessionUrl?: string;
  error?: string;
}> {
  try {
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });

    // Verify session exists and is running
    const session = await bb.sessions.retrieve(sessionId);
    
    if (!session) {
      return {
        success: false,
        error: "Session not found"
      };
    }

    if (session.status !== "RUNNING") {
      return {
        success: false,
        error: `Session is not running. Current status: ${session.status}`
      };
    }

    // Get the debug URL for AI control
    const debugUrl = await bb.sessions.debug(sessionId);

    return {
      success: true,
      sessionUrl: debugUrl.debuggerFullscreenUrl
    };

  } catch (error) {
    console.error("Error during session handoff:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Handoff authenticated session from manual control to AI control
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, platform = "yahoo-dsp", confirmAuth = false } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    console.log(`Attempting to handoff session ${sessionId} from manual to AI control`);
    console.log(`Platform: ${platform}, Auth confirmed: ${confirmAuth}`);

    const handoffResult = await handoffSessionToAI(sessionId);

    if (!handoffResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to handoff session to AI control",
          details: handoffResult.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      sessionUrl: handoffResult.sessionUrl,
      mode: "ai_control",
      platform,
      timestamp: new Date().toISOString(),
      message: `Session successfully handed off to AI control for ${platform} operations`
    });

  } catch (error) {
    console.error("Error during session handoff:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to handoff session",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
