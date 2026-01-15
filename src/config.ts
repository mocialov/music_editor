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

export const config = {
  DEBUG_MODE: false, // Change to false for production
  
  // LLM Configuration
  // In production, these will be read from environment variables
  // In development, you can set them in .env file
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  GEMINI_MODEL_ID: import.meta.env.VITE_GEMINI_MODEL_ID || 'gemini-2.5-flash-lite',
} as const;
