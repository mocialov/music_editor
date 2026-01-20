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
  const [error, setError] = useState<string | null>(null);
  const [selectedStartMeasure, setSelectedStartMeasure] = useState(1);
  const [selectedEndMeasure, setSelectedEndMeasure] = useState(1);
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>(undefined);
  
  React.useEffect(() => {
    if (totalMeasureCount > 0 && selectedEndMeasure === 1) {
      setSelectedEndMeasure(totalMeasureCount);
    }
  }, [totalMeasureCount]);
  
  const hasRangeSelection = selectedRange && selectedRange.start > 0 && selectedRange.end > 0;

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

    try {
      let dataToSend: SemanticMusicXML;
      let isRangeEdit = false;
      
      if (hasRangeSelection && fullDocument && selectedRange) {
        dataToSend = prepareMeasureRangeForLLM(
          fullDocument, 
          selectedRange.start, 
          selectedRange.end,
          selectedRange.partId
        );
        isRangeEdit = true;
      } else {
        dataToSend = semanticFormat;
      }
      
      const semanticJson = JSON.stringify(dataToSend, null, 2);
      const partInfo = isRangeEdit && selectedRange?.partId ? ` in part ${selectedRange.partId}` : '';
      const rangeInfo = isRangeEdit && selectedRange
        ? `\n\nNote: You are editing measures ${selectedRange.start}-${selectedRange.end}${partInfo} only. Return only these measures in the same format.`
        : '';
      const llm_prompt = `${query}${rangeInfo}\n\nHere is the music in compact semantic format:\n\n${semanticJson}\n\nPlease respond with the modified music in the same compact semantic JSON format.`;

      const apiKey = config.GEMINI_API_KEY;
      const modelId = config.GEMINI_MODEL_ID;

      if (!apiKey) {
        setError('API key not configured. Please set it in Settings.');
        setIsLoading(false);
        return;
      }

      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          contents: [{ role: "user", parts: [{ text: llm_prompt }] }],
          generationConfig: { thinkingConfig: { "thinkingBudget": 0 } }
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const responseText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      try {
        let jsonText = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }

        const parsed = parseSemanticJSON(jsonText);

        if (onParsedResult && fullDocument) {
          let finalDocument: MusicXMLDocument;
          
          if (isRangeEdit && selectedRange) {
            finalDocument = editMeasureRangeWithLLM(
              fullDocument, 
              selectedRange.start, 
              selectedRange.end, 
              parsed,
              selectedRange.partId
            );
          } else {
            finalDocument = decodeFromSemantic(parsed);
          }
          
          onParsedResult(finalDocument);
          setQuery('');
        }
      } catch (parseError) {
        setError(`Failed to parse AI response. Please try again.`);
      }
    } catch (err) {
      setError(`AI Error: ${err instanceof Error ? err.message : 'Failed to connect'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="llm-query">
      <h2>✨ AI Music Assistant</h2>
      
      <div className="range-selection-compact">
        <div className="range-row">
          <div className="range-field">
            <label>Measures</label>
            <div className="range-inputs">
              <input
                type="number"
                min={1}
                max={totalMeasureCount}
                value={selectedStartMeasure}
                onChange={(e) => setSelectedStartMeasure(Number(e.target.value))}
              />
              <span>to</span>
              <input
                type="number"
                min={selectedStartMeasure}
                max={totalMeasureCount}
                value={selectedEndMeasure}
                onChange={(e) => setSelectedEndMeasure(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {availableParts && availableParts.length > 1 && (
          <div className="range-row">
            <div className="range-field">
              <label>Instrument</label>
              <select
                value={selectedPartId || 'all'}
                onChange={(e) => setSelectedPartId(e.target.value === 'all' ? undefined : e.target.value)}
              >
                <option value="all">All Instruments</option>
                {availableParts.map(part => (
                  <option key={part.id} value={part.id}>{part.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="query-input-container">
        <textarea
          className="query-textarea"
          placeholder="e.g., 'Make this section more dramatic', 'Change to minor key', 'Add a flute counter-melody'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
        />
        <button 
          className="send-button"
          onClick={handleSendQuery}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? '✨ Processing...' : 'Apply AI Magic'}
        </button>
        {error && <div className="error-text">{error}</div>}
      </div>

      <style>{`
        .range-selection-compact {
          background: var(--bg-input);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .range-row {
          display: flex;
          gap: 1rem;
        }
        .range-field {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .range-field label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .range-inputs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .range-inputs input, .range-field select {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          padding: 0.4rem;
          border-radius: 4px;
          width: 100%;
        }
        .range-inputs input {
          width: 60px;
        }
        .error-text {
          color: var(--error-color);
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
};
