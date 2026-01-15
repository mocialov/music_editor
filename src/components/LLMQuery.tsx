import React, { useState } from 'react';
import axios from 'axios';
import { parseSemanticJSON, type SemanticMusicXML, type MusicXMLDocument, decodeFromSemantic } from '../utils/musicxml-parser';
import { config } from '../config';

interface LLMQueryProps {
  semanticFormat: SemanticMusicXML | null;
  onParsedResult?: (document: MusicXMLDocument) => void;
}

export const LLMQuery: React.FC<LLMQueryProps> = ({ semanticFormat, onParsedResult }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState('');
  const [parsedResponse, setParsedResponse] = useState<SemanticMusicXML | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    if (!semanticFormat) {
      setError('Please load a MusicXML file first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRawResponse('');
    setParsedResponse(null);

    try {
      // Prepare the LLM prompt with user query and semantic representation
      const semanticJson = JSON.stringify(semanticFormat, null, 2);
      const llm_prompt = `${query}\n\nHere is the music in compact semantic format:\n\n${semanticJson}\n\nPlease respond with the modified music in the same compact semantic JSON format.`;

      // Get API credentials from config
      const apiKey = config.GEMINI_API_KEY;
      const modelId = config.GEMINI_MODEL_ID;

      if (!apiKey) {
        setError('API key not configured. Please set VITE_GEMINI_API_KEY in your environment variables.');
        setIsLoading(false);
        return;
      }

      // Send request to Gemini API
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: llm_prompt
                }
              ]
            }
          ],
          generationConfig: {
            thinkingConfig: {
              "thinkingBudget": 0
            }
          }
        },
        {
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      // Extract the text response
      const responseText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Display the full raw response for debugging
      const fullRawResponse = `Status: ${geminiResponse.status}\n\nFull Response:\n${JSON.stringify(geminiResponse.data, null, 2)}`;
      setRawResponse(fullRawResponse);

      // Try to parse the response as semantic JSON
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        const parsed = parseSemanticJSON(jsonText);
        setParsedResponse(parsed);

        // Convert back to full MusicXML document if callback provided
        if (onParsedResult) {
          const fullDocument = decodeFromSemantic(parsed);
          onParsedResult(fullDocument);
        }
      } catch (parseError) {
        console.error('Failed to parse LLM response:', parseError);
        setError(`Failed to parse LLM response as semantic JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } catch (err) {
      console.error('LLM query error:', err);
      
      // Display full error response for debugging
      if (axios.isAxiosError(err) && err.response) {
        const errorDetails = `Error Status: ${err.response.status}\n\nError Response:\n${JSON.stringify(err.response.data, null, 2)}`;
        setRawResponse(errorDetails);
        setError(`API Error (${err.response.status}): ${err.response.statusText || 'Unknown error'}`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send query to LLM');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  return (
    <div className="llm-query">
      <h2>🤖 AI Music Editor</h2>
      
      <div className="query-input-container">
        <textarea
          className="query-input"
          placeholder="Ask the AI to modify your music... (e.g., 'Transpose this piece up by 2 semitones' or 'Change the tempo to 120 BPM')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading || !semanticFormat}
          rows={3}
        />
        <button 
          className="query-button"
          onClick={handleSendQuery}
          disabled={isLoading || !semanticFormat}
        >
          {isLoading ? '⏳ Processing...' : '🚀 Send to AI'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {config.DEBUG_MODE && rawResponse && (
        <div className="llm-response">
          <h3>📝 Raw LLM Response</h3>
          <pre className="response-text">{rawResponse}</pre>
        </div>
      )}

      {config.DEBUG_MODE && parsedResponse && (
        <div className="parsed-response">
          <h3>✅ Parsed Semantic Music</h3>
          <div className="response-stats">
            <p>Parts: {parsedResponse.parts.length}</p>
            <p>Total Measures: {parsedResponse.parts.reduce((sum, p) => sum + p.measures.length, 0)}</p>
            {parsedResponse.title && <p>Title: {parsedResponse.title}</p>}
            {parsedResponse.composer && <p>Composer: {parsedResponse.composer}</p>}
          </div>
          <pre className="semantic-json">
            {JSON.stringify(parsedResponse, null, 2)}
          </pre>
        </div>
      )}

      {!semanticFormat && (
        <p className="hint-text">
          💡 Load a MusicXML file first to start editing with AI
        </p>
      )}
    </div>
  );
};
