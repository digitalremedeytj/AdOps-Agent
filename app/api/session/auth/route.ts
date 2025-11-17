import Browserbase from "@browserbasehq/sdk";
import { getAll } from "@vercel/edge-config";
import { NextResponse } from "next/server";

type BrowserbaseRegion =
  | "us-west-2"
  | "us-east-1"
  | "eu-central-1"
  | "ap-southeast-1";

// Timezone abbreviation to region mapping (same as main session route)
const timezoneAbbreviationMap: Record<string, BrowserbaseRegion> = {
  EST: "us-east-1",
  EDT: "us-east-1",
  PST: "us-west-2",
  PDT: "us-west-2",
  MST: "us-west-2",
  MDT: "us-west-2",
  CST: "us-east-1",
  CDT: "us-east-1",
  GMT: "eu-central-1",
  BST: "eu-central-1",
  CET: "eu-central-1",
  CEST: "eu-central-1",
  EET: "eu-central-1",
  EEST: "eu-central-1",
  WET: "eu-central-1",
  WEST: "eu-central-1",
  JST: "ap-southeast-1",
  KST: "ap-southeast-1",
  IST: "ap-southeast-1",
  AEST: "ap-southeast-1",
  AEDT: "ap-southeast-1",
  AWST: "ap-southeast-1",
  NZST: "ap-southeast-1",
  NZDT: "ap-southeast-1",
};

const defaultDistributions: Record<
  BrowserbaseRegion,
  Record<BrowserbaseRegion, number>
> = {
  "us-west-2": {
    "us-west-2": 100,
    "us-east-1": 0,
    "eu-central-1": 0,
    "ap-southeast-1": 0,
  },
  "us-east-1": {
    "us-east-1": 100,
    "us-west-2": 0,
    "eu-central-1": 0,
    "ap-southeast-1": 0,
  },
  "eu-central-1": {
    "eu-central-1": 100,
    "us-west-2": 0,
    "us-east-1": 0,
    "ap-southeast-1": 0,
  },
  "ap-southeast-1": {
    "ap-southeast-1": 100,
    "us-west-2": 0,
    "us-east-1": 0,
    "eu-central-1": 0,
  },
};

function selectRegionWithProbability(
  baseRegion: BrowserbaseRegion,
  distributions: Record<BrowserbaseRegion, Record<BrowserbaseRegion, number>>
): BrowserbaseRegion {
  const distribution = distributions[baseRegion];
  if (!distribution) {
    return baseRegion;
  }

  const random = Math.random() * 100;
  let cumulativeProbability = 0;
  for (const [region, probability] of Object.entries(distribution)) {
    cumulativeProbability += probability;
    if (random < cumulativeProbability) {
      return region as BrowserbaseRegion;
    }
  }

  return baseRegion;
}

function getRegionFromTimezoneAbbr(timezoneAbbr?: string): BrowserbaseRegion {
  try {
    if (!timezoneAbbr) {
      return "us-west-2";
    }

    const region = timezoneAbbreviationMap[timezoneAbbr.toUpperCase()];
    if (region) {
      return region;
    }

    return "us-west-2";
  } catch {
    return "us-west-2";
  }
}

interface EdgeConfig {
  advancedStealth: boolean | undefined;
  proxies: boolean | undefined;
  regionDistribution:
    | Record<BrowserbaseRegion, Record<BrowserbaseRegion, number>>
    | undefined;
}

async function createAuthSession(timezone?: string, contextId?: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });

  let config: EdgeConfig = {
    advancedStealth: undefined,
    proxies: undefined,
    regionDistribution: undefined,
  };

  // Only try to get edge config if EDGE_CONFIG is properly set
  if (process.env.EDGE_CONFIG && process.env.EDGE_CONFIG !== 'your_edge_config_url') {
    try {
      config = await getAll<EdgeConfig>();
    } catch (error) {
      console.log("Edge config not available, using defaults:", error);
    }
  }

  const {
    advancedStealth: advancedStealthConfig,
    proxies: proxiesConfig,
    regionDistribution: distributionsConfig,
  } = config;

  const advancedStealth: boolean = advancedStealthConfig ?? false;
  const proxies: boolean = proxiesConfig ?? false;

  // Browser settings optimized for manual authentication
  const browserSettings: Browserbase.Sessions.SessionCreateParams.BrowserSettings =
    {
      viewport: {
        width: 1280,
        height: 720,
      },
      blockAds: true,
      advancedStealth,
      // Only set os if advancedStealth is true (matching main session route)
      ...(advancedStealth
        ? {
            os: "windows",
          }
        : {
            os: "linux",
          }),
      // Add context for session persistence
      ...(contextId && {
        context: {
          id: contextId,
          persist: true
        }
      })
    };

  const closestRegion = getRegionFromTimezoneAbbr(timezone);
  const distributions = distributionsConfig ?? defaultDistributions;
  const finalRegion = selectRegionWithProbability(closestRegion, distributions);

  console.log("Creating auth session - timezone:", timezone);
  console.log("mapped to region:", closestRegion);
  console.log("final region after probability routing:", finalRegion);
  console.log("using context:", contextId);

  const session = await bb.sessions.create({
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    proxies,
    browserSettings,
    keepAlive: true, // Keep session alive for extended auth flows
    region: finalRegion,
  });

  return { session };
}

async function getDebugUrl(sessionId: string) {
  const bb = new Browserbase({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });
  const session = await bb.sessions.debug(sessionId);
  return session.debuggerFullscreenUrl;
}

// Create a new authentication session
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const timezone = body.timezone as string;
    const contextId = body.contextId as string | undefined;
    
    console.log("Creating auth session with timezone:", timezone);
    console.log("Using context ID:", contextId);
    
    const { session } = await createAuthSession(timezone, contextId);
    const liveUrl = await getDebugUrl(session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      sessionUrl: liveUrl,
      contextId: contextId,
      mode: "manual_auth",
      message: "Session created for manual authentication. Please complete your SSO/2FA login."
    });
  } catch (error) {
    console.error("Error creating auth session:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to create auth session", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
