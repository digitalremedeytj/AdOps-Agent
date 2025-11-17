/**
 * Yahoo DSP Session Export Bookmarklet
 * This creates a bookmarklet that users can save to their bookmarks bar
 * to extract Yahoo DSP authentication cookies and session data
 */

export interface YahooDSPSessionData {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite?: string;
  }>;
  sessionId: string;
  timestamp: number;
  domain: string;
  userAgent: string;
}

/**
 * Generate the bookmarklet JavaScript code
 */
export function generateBookmarkletCode(): string {
  const bookmarkletFunction = `
(function() {
  // Check if we're on a Yahoo DSP domain
  const yahooDSPDomains = ['dsp.yahooinc.com', 'dsp.yahoo.com', 'advertising.yahoo.com'];
  const currentDomain = window.location.hostname.toLowerCase();
  const isYahooDSP = yahooDSPDomains.some(domain => 
    currentDomain === domain || currentDomain.endsWith('.' + domain)
  );
  
  if (!isYahooDSP) {
    alert('Please run this bookmarklet on a Yahoo DSP page after logging in.');
    return;
  }
  
  // Extract cookies
  const cookies = document.cookie.split(';').map(cookie => {
    const [name, value] = cookie.trim().split('=');
    return {
      name: name,
      value: value || '',
      domain: window.location.hostname,
      path: '/',
      secure: window.location.protocol === 'https:',
      httpOnly: false, // Can't detect httpOnly from document.cookie
      sameSite: 'Lax'
    };
  }).filter(cookie => cookie.name && cookie.value);
  
  // Create session data
  const sessionData = {
    cookies: cookies,
    sessionId: 'manual_' + Date.now(),
    timestamp: Date.now(),
    domain: window.location.hostname,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Create a modal to display the session data
  const modal = document.createElement('div');
  modal.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  \`;
  
  const content = document.createElement('div');
  content.style.cssText = \`
    background: white;
    padding: 30px;
    border-radius: 12px;
    max-width: 600px;
    width: 90%;
    max-height: 80%;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  \`;
  
  const sessionToken = btoa(JSON.stringify(sessionData));
  
  content.innerHTML = \`
    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
      🔐 Yahoo DSP Session Exported
    </h2>
    <p style="margin: 0 0 20px 0; color: #6b7280; line-height: 1.5;">
      Your Yahoo DSP authentication session has been captured. Copy the session token below and paste it into the AI tool.
    </p>
    <div style="margin: 20px 0;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
        Session Token:
      </label>
      <textarea 
        id="sessionToken" 
        readonly 
        style="width: 100%; height: 120px; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-family: monospace; font-size: 12px; resize: vertical; background: #f9fafb;"
      >\${sessionToken}</textarea>
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;">
      <button 
        onclick="navigator.clipboard.writeText(document.getElementById('sessionToken').value).then(() => alert('Session token copied to clipboard!')); document.body.removeChild(document.querySelector('[data-yahoo-dsp-modal]'));"
        style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;"
      >
        Copy Token
      </button>
      <button 
        onclick="document.body.removeChild(document.querySelector('[data-yahoo-dsp-modal]'));"
        style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;"
      >
        Close
      </button>
    </div>
    <p style="margin: 20px 0 0 0; padding: 12px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; font-size: 12px; color: #92400e;">
      <strong>Security Note:</strong> This token contains your authentication session. Only paste it into trusted applications and don't share it with others.
    </p>
  \`;
  
  modal.setAttribute('data-yahoo-dsp-modal', 'true');
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Auto-select the token text for easy copying
  setTimeout(() => {
    const textarea = document.getElementById('sessionToken');
    if (textarea) {
      textarea.select();
    }
  }, 100);
})();
  `.trim();

  return `javascript:${encodeURIComponent(bookmarkletFunction)}`;
}

/**
 * Parse session data from bookmarklet token
 */
export function parseSessionToken(token: string): YahooDSPSessionData | null {
  try {
    const decoded = atob(token);
    const sessionData = JSON.parse(decoded) as YahooDSPSessionData;
    
    // Validate the session data structure
    if (!sessionData.cookies || !Array.isArray(sessionData.cookies)) {
      throw new Error('Invalid session data: missing cookies');
    }
    
    if (!sessionData.timestamp || !sessionData.domain) {
      throw new Error('Invalid session data: missing required fields');
    }
    
    // Check if session is too old (older than 2 hours)
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    if (Date.now() - sessionData.timestamp > maxAge) {
      throw new Error('Session token has expired');
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error parsing session token:', error);
    return null;
  }
}

/**
 * Convert session data to cookie string format for Browserbase
 */
export function sessionDataToCookieString(sessionData: YahooDSPSessionData): string {
  return sessionData.cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

/**
 * Validate if session data is for Yahoo DSP
 */
export function isValidYahooDSPSession(sessionData: YahooDSPSessionData): boolean {
  const yahooDSPDomains = ['dsp.yahooinc.com', 'dsp.yahoo.com', 'advertising.yahoo.com'];
  return yahooDSPDomains.some(domain => 
    sessionData.domain === domain || sessionData.domain.endsWith('.' + domain)
  );
}
