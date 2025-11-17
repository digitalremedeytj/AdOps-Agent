import Browserbase from "@browserbasehq/sdk";
import { NextResponse } from "next/server";

async function checkYahooDSPAuth(sessionId: string): Promise<{
  isAuthenticated: boolean;
  currentUrl?: string;
  error?: string;
}> {
  try {
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });

    // Get specific session to check current state
    const session = await bb.sessions.retrieve(sessionId);
    
    if (!session) {
      return {
        isAuthenticated: false,
        error: "Session not found"
      };
    }

    // Basic check - if session is active, assume we can check auth status
    // This is a placeholder - in production you'd want to check specific Yahoo DSP elements
    return {
      isAuthenticated: session.status === "RUNNING",
      currentUrl: "Unknown" // Browserbase doesn't expose current URL directly
    };

  } catch (error) {
    console.error("Error checking Yahoo DSP auth:", error);
    return {
      isAuthenticated: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Check authentication status for Yahoo DSP
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    const authStatus = await checkYahooDSPAuth(sessionId);

    return NextResponse.json({
      success: true,
      sessionId,
      ...authStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to check authentication status",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Update authentication status (for manual confirmation)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, isAuthenticated, platform = "yahoo-dsp" } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    // In a production system, you might store this in a database
    // For now, we'll just return the confirmation
    console.log(`Auth status updated for session ${sessionId}: ${isAuthenticated ? 'authenticated' : 'not authenticated'} on ${platform}`);

    return NextResponse.json({
      success: true,
      sessionId,
      isAuthenticated,
      platform,
      timestamp: new Date().toISOString(),
      message: isAuthenticated 
        ? `Successfully authenticated with ${platform}` 
        : `Authentication cleared for ${platform}`
    });

  } catch (error) {
    console.error("Error updating auth status:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to update authentication status",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
