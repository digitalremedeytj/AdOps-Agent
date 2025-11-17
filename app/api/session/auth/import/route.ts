import Browserbase from "@browserbasehq/sdk";
import { NextResponse } from "next/server";
import { parseSessionToken, isValidYahooDSPSession, sessionDataToCookieString, type YahooDSPSessionData } from "@/lib/bookmarklet";

async function createSessionWithCookies(sessionData: YahooDSPSessionData, timezone?: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });

  // Create a new session with the imported cookies
  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    keepAlive: true,
    browserSettings: {
      viewport: {
        width: 1280,
        height: 720,
      },
      blockAds: true,
      // Use the same user agent as the original session for consistency
      // Note: Browserbase may not support custom user agents, but we'll try
    },
    // Note: We'll need to set cookies after session creation
    // as Browserbase doesn't support pre-setting cookies in session creation
  });

  return session;
}

async function setCookiesInSession(sessionId: string, sessionData: YahooDSPSessionData) {
  // Note: This is a placeholder for setting cookies in the Browserbase session
  // In practice, we might need to use Stagehand or direct browser automation
  // to navigate to the domain and set cookies via JavaScript
  
  console.log(`Setting cookies for session ${sessionId}:`, sessionData.cookies.length, 'cookies');
  
  // For now, we'll return the session info and handle cookie setting
  // in the browser automation layer when the AI starts
  return {
    success: true,
    cookieString: sessionDataToCookieString(sessionData),
    cookieCount: sessionData.cookies.length
  };
}

// Import Yahoo DSP session from bookmarklet token
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionToken, timezone } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Session token is required" },
        { status: 400 }
      );
    }

    console.log('Importing Yahoo DSP session from token...');

    // Parse the session token
    const sessionData = parseSessionToken(sessionToken);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session token" },
        { status: 400 }
      );
    }

    // Validate it's a Yahoo DSP session
    if (!isValidYahooDSPSession(sessionData)) {
      return NextResponse.json(
        { success: false, error: "Session token is not from a Yahoo DSP domain" },
        { status: 400 }
      );
    }

    console.log(`Valid Yahoo DSP session found for domain: ${sessionData.domain}`);
    console.log(`Session contains ${sessionData.cookies.length} cookies`);

    // Create a new Browserbase session
    const session = await createSessionWithCookies(sessionData, timezone);
    
    // Set up cookies (this will be handled when the AI starts)
    const cookieResult = await setCookiesInSession(session.id, sessionData);

    // Get debug URL
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });
    const debugSession = await bb.sessions.debug(session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: debugSession.debuggerFullscreenUrl,
      mode: "imported_auth",
      sessionData: {
        domain: sessionData.domain,
        cookieCount: sessionData.cookies.length,
        timestamp: sessionData.timestamp,
        userAgent: sessionData.userAgent
      },
      cookieString: cookieResult.cookieString,
      message: `Successfully imported Yahoo DSP session with ${sessionData.cookies.length} cookies`
    });

  } catch (error) {
    console.error("Error importing session:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to import session", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
