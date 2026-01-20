import React, { useState } from 'react';
import axios from 'axios';
import { 
  parseSemanticJSON, 
  type SemanticMusicXML, 
  type MusicXMLDocument, 
  decodeFromSemantic,
  prepareMeasureRangeForLLM,
  editMeasureRangeWithLLM,
} from '../utils/musicxml-parser';
import { config } from '../config';

interface LLMQueryProps {
  semanticFormat: SemanticMusicXML | null;
  onParsedResult?: (document: MusicXMLDocument) => void;
  fullDocument?: MusicXMLDocument | null;
  selectedRange?: { start: number; end: number; partId?: string } | null;
  totalMeasureCount?: number;
  availableParts?: Array<{ id: string; name: string }>;
  onRangeSelect?: (start: number, end: number, partId?: string) => void;
}

export const LLMQuery: React.FC<LLMQueryProps> = ({ semanticFormat, onParsedResult, fullDocument, selectedRange, totalMeasureCount = 0, availableParts, onRangeSelect }) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState('');
  const [parsedResponse, setParsedResponse] = useState<SemanticMusicXML | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStartMeasure, setSelectedStartMeasure] = useState(1);
  const [selectedEndMeasure, setSelectedEndMeasure] = useState(1);
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>(undefined);
  
  // Initialize selected end measure to totalMeasureCount when it becomes available
  React.useEffect(() => {
    if (totalMeasureCount > 0 && selectedEndMeasure === 1) {
      setSelectedEndMeasure(totalMeasureCount);
    }
  }, [totalMeasureCount]);
  
  // Check if range selection is active
  const hasRangeSelection = selectedRange && selectedRange.start > 0 && selectedRange.end > 0;

  // Notify parent when range selection changes
  React.useEffect(() => {
    if (onRangeSelect && totalMeasureCount > 0) {
      onRangeSelect(selectedStartMeasure, selectedEndMeasure, selectedPartId);
    }
  }, [selectedStartMeasure, selectedEndMeasure, selectedPartId, onRangeSelect, totalMeasureCount]);

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
      // Determine what to send to LLM (full piece or selected range)
      let dataToSend: SemanticMusicXML;
      let isRangeEdit = false;
      
      if (hasRangeSelection && fullDocument && selectedRange) {
        // Extract only the selected range (and specific part if selected)
        dataToSend = prepareMeasureRangeForLLM(
          fullDocument, 
          selectedRange.start, 
          selectedRange.end,
          selectedRange.partId
        );
        isRangeEdit = true;
        const partInfo = selectedRange.partId ? ` (${selectedRange.partId} only)` : '';
        console.log(`Sending measures ${selectedRange.start}-${selectedRange.end}${partInfo} to LLM`);
      } else {
        // Send the full piece
        dataToSend = semanticFormat;
      }
      
      // Prepare the LLM prompt with user query and semantic representation
      const semanticJson = JSON.stringify(dataToSend, null, 2);
      const partInfo = isRangeEdit && selectedRange?.partId ? ` in part ${selectedRange.partId}` : '';
      const rangeInfo = isRangeEdit && selectedRange
        ? `\n\nNote: You are editing measures ${selectedRange.start}-${selectedRange.end}${partInfo} only. Return only these measures in the same format.`
        : '';
      const llm_prompt = `${query}${rangeInfo}\n\nHere is the music in compact semantic format:\n\n${semanticJson}\n\nPlease respond with the modified music in the same compact semantic JSON format.`;

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
        if (onParsedResult && fullDocument) {
          let finalDocument: MusicXMLDocument;
          
          if (isRangeEdit && selectedRange) {
            // Merge the edited range back into the original document
            finalDocument = editMeasureRangeWithLLM(
              fullDocument, 
              selectedRange.start, 
              selectedRange.end, 
              parsed,
              selectedRange.partId
            );
            const partInfo = selectedRange.partId ? ` (${selectedRange.partId} only)` : '';
            console.log(`Merged edited measures ${selectedRange.start}-${selectedRange.end}${partInfo} back into original`);
          } else {
            // Use the full modified document
            finalDocument = decodeFromSemantic(parsed);
          }
          
          onParsedResult(finalDocument);
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
      
      {/* Range Selection for AI Editing */}
      {totalMeasureCount > 0 && (
        <div className="player-range-selection">
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: '500' }}>🎯 Select measures for AI editing</h3>
          <div className="range-selection-controls">
              <div className="range-inputs-compact">
                <div className="range-input-inline">
                  <label>From:</label>
                  <input
                    type="number"
                    min={1}
                    max={totalMeasureCount}
                    value={selectedStartMeasure}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1 && val <= totalMeasureCount) {
                        setSelectedStartMeasure(val);
                        if (val > selectedEndMeasure) {
                          setSelectedEndMeasure(val);
                        }
                      }
                    }}
                  />
                </div>
                <span className="range-separator">—</span>
                <div className="range-input-inline">
                  <label>To:</label>
                  <input
                    type="number"
                    min={selectedStartMeasure}
                    max={totalMeasureCount}
                    value={selectedEndMeasure}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= selectedStartMeasure && val <= totalMeasureCount) {
                        setSelectedEndMeasure(val);
                      }
                    }}
                  />
                </div>
                <span className="selection-summary">
                  ({selectedEndMeasure - selectedStartMeasure + 1} of {totalMeasureCount} measures)
                </span>
                
                {availableParts && availableParts.length > 1 && (
                  <div className="range-input-inline part-selector">
                    <label>Part:</label>
                    <select
                      value={selectedPartId || 'all'}
                      onChange={(e) => setSelectedPartId(e.target.value === 'all' ? undefined : e.target.value)}
                    >
                      <option value="all">All Parts</option>
                      {availableParts.map(part => (
                        <option key={part.id} value={part.id}>
                          {part.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="range-visual-selector">
                <input
                  type="range"
                  min={1}
                  max={totalMeasureCount}
                  value={selectedStartMeasure}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedStartMeasure(val);
                    if (val > selectedEndMeasure) {
                      setSelectedEndMeasure(val);
                    }
                  }}
                  className="range-slider-start"
                />
                <input
                  type="range"
                  min={selectedStartMeasure}
                  max={totalMeasureCount}
                  value={selectedEndMeasure}
                  onChange={(e) => setSelectedEndMeasure(Number(e.target.value))}
                  className="range-slider-end"
                />
              </div>
            </div>
        </div>
      )}
      
      {hasRangeSelection && selectedRange && (
        <div className="range-indicator">
          <span className="range-badge">
            🎯 Editing measures {selectedRange.start}-{selectedRange.end}
            {selectedRange.partId && <> in <strong>{selectedRange.partId}</strong></>}
            {' '}({selectedRange.end - selectedRange.start + 1} measures selected in player below)
          </span>
        </div>
      )}
      
      <div className="query-input-container">
        <textarea
          className="query-input"
          placeholder={hasRangeSelection && selectedRange
            ? `Ask the AI to modify measures ${selectedRange.start}-${selectedRange.end}... (e.g., 'Transpose up by 2 semitones' or 'Add staccato to all notes')`
            : "Ask the AI to modify your music... (e.g., 'Transpose this piece up by 2 semitones' or 'Change the tempo to 120 BPM')"
          }
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
          {isLoading ? '⏳ Processing...' : hasRangeSelection ? '🎯 Edit Selected Range' : '🚀 Send to AI'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {config.DEBUG_MODE && rawResponse && (
        <div className="llm-response">
          <details>
            <summary><h3>📝 Raw LLM Response</h3></summary>
            <pre className="response-text">{rawResponse}</pre>
          </details>
        </div>
      )}

      {config.DEBUG_MODE && parsedResponse && (
        <div className="parsed-response">
          <details>
            <summary><h3>✅ Parsed Semantic Music</h3></summary>
            <div className="response-stats">
              <p>Parts: {parsedResponse.parts.length}</p>
              <p>Total Measures: {parsedResponse.parts.reduce((sum, p) => sum + p.measures.length, 0)}</p>
              {parsedResponse.title && <p>Title: {parsedResponse.title}</p>}
              {parsedResponse.composer && <p>Composer: {parsedResponse.composer}</p>}
            </div>
            <pre className="semantic-json">
              {JSON.stringify(parsedResponse, null, 2)}
            </pre>
          </details>
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
