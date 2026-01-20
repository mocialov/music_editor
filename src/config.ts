/**
 * Application Configuration
 * 
 * Set DEBUG_MODE to true to see:
 * - LLM-Friendly Format section
 * - Compact semantic representation
 * - Raw LLM Response
 * - Parsed Semantic Music
 * 
 * Set to false for production mode (cleaner UI)
 */

// Runtime configuration that can be updated
let runtimeApiKey: string | null = null;

export const config = {
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
  get GEMINI_API_KEY(): string {
    // Priority: 1. Runtime override, 2. localStorage, 3. Environment variable
    if (runtimeApiKey) return runtimeApiKey;
    const storedKey = localStorage.getItem('user_gemini_api_key');
    if (storedKey) return storedKey;
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  },
  GEMINI_MODEL_ID: import.meta.env.VITE_GEMINI_MODEL_ID || 'gemini-2.5-flash-lite',
  // Method to set runtime API key
  setApiKey(key: string) {
    runtimeApiKey = key || null;
  }
};
