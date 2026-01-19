/**
 * Example: Measure Range LLM Editing Workflow
 * 
 * Demonstrates how to:
 * 1. Select a portion of a MusicXML piece
 * 2. Extract and encode only that portion
 * 3. Send to LLM for modification
 * 4. Merge the modified portion back into the original piece
 */

import {
  MusicXMLParser,
  prepareMeasureRangeForLLM,
  editMeasureRangeWithLLM,
  getTotalMeasures,
  extractMeasureRange,
  encodeToSemantic,
  decodeFromSemantic,
  replaceMeasureRange,
} from '../utils/musicxml-parser';
import type {
  MusicXMLDocument,
  SemanticMusicXML,
} from '../utils/musicxml-parser';

// ============================================================================
// Example 1: Complete Workflow (Recommended)
// ============================================================================

/**
 * Complete workflow using convenience functions
 */
async function editMeasureRangeExample(
  originalDocument: MusicXMLDocument,
  startMeasure: number,
  endMeasure: number,
  userPrompt: string
) {
  console.log(`Editing measures ${startMeasure}-${endMeasure}`);
  
  // Step 1: Extract and encode the selected range for LLM
  const rangeToEdit = prepareMeasureRangeForLLM(
    originalDocument,
    startMeasure,
    endMeasure
  );
  
  console.log('Extracted range:', JSON.stringify(rangeToEdit, null, 2));
  
  // Step 2: Send to LLM with your prompt
  const llmResponse = await sendToLLM(rangeToEdit, userPrompt);
  
  // Step 3: Merge LLM response back into original document
  const updatedDocument = editMeasureRangeWithLLM(
    originalDocument,
    startMeasure,
    endMeasure,
    llmResponse
  );
  
  console.log('Document updated successfully!');
  return updatedDocument;
}

// ============================================================================
// Example 2: Manual Step-by-Step Workflow
// ============================================================================

/**
 * Manual workflow with full control at each step
 */
async function manualEditWorkflow(
  originalDocument: MusicXMLDocument,
  startMeasure: number,
  endMeasure: number,
  userPrompt: string
) {
  // Step 1: Extract the measure range
  const extractedRange = extractMeasureRange(
    originalDocument,
    startMeasure,
    endMeasure
  );
  
  console.log(`Extracted ${getTotalMeasures(extractedRange)} measures`);
  
  // Step 2: Encode to semantic format for LLM
  const semanticRange = encodeToSemantic(extractedRange);
  
  // Step 3: Prepare LLM prompt with context
  const llmPrompt = createLLMPrompt(semanticRange, userPrompt);
  
  // Step 4: Send to LLM
  const llmResponseJSON = await callLLMAPI(llmPrompt);
  
  // Step 5: Parse LLM response
  const modifiedSemantic: SemanticMusicXML = JSON.parse(llmResponseJSON);
  
  // Step 6: Decode back to full MusicXML
  const modifiedDocument = decodeFromSemantic(modifiedSemantic);
  
  // Step 7: Replace the range in the original document
  const finalDocument = replaceMeasureRange(
    originalDocument,
    modifiedDocument,
    startMeasure,
    endMeasure
  );
  
  return finalDocument;
}

// ============================================================================
// Example 3: UI Integration with Seek Bar
// ============================================================================

/**
 * Example UI component integration
 */
class MusicXMLEditor {
  private originalDocument: MusicXMLDocument;
  private currentDocument: MusicXMLDocument;
  private selectedRange: { start: number; end: number } | null = null;
  
  constructor(document: MusicXMLDocument) {
    this.originalDocument = document;
    this.currentDocument = document;
  }
  
  /**
   * User selects a range using the seek bar
   */
  selectMeasureRange(startMeasure: number, endMeasure: number) {
    const totalMeasures = getTotalMeasures(this.currentDocument);
    
    // Validate range
    if (startMeasure < 1 || endMeasure > totalMeasures || startMeasure > endMeasure) {
      throw new Error(`Invalid range: ${startMeasure}-${endMeasure}`);
    }
    
    this.selectedRange = { start: startMeasure, end: endMeasure };
    console.log(`Selected measures ${startMeasure}-${endMeasure}`);
  }
  
  /**
   * Get the selected range in semantic format for LLM
   */
  getSelectedRangeForLLM(): SemanticMusicXML | null {
    if (!this.selectedRange) {
      return null;
    }
    
    return prepareMeasureRangeForLLM(
      this.currentDocument,
      this.selectedRange.start,
      this.selectedRange.end
    );
  }
  
  /**
   * Apply LLM modifications to the selected range
   */
  async applyLLMModifications(userPrompt: string) {
    if (!this.selectedRange) {
      throw new Error('No range selected');
    }
    
    const rangeData = this.getSelectedRangeForLLM();
    if (!rangeData) {
      throw new Error('Failed to extract range');
    }
    
    // Send to LLM
    const llmResponse = await sendToLLM(rangeData, userPrompt);
    
    // Update document
    this.currentDocument = editMeasureRangeWithLLM(
      this.currentDocument,
      this.selectedRange.start,
      this.selectedRange.end,
      llmResponse
    );
    
    return this.currentDocument;
  }
  
  /**
   * Reset to original document
   */
  reset() {
    this.currentDocument = this.originalDocument;
    this.selectedRange = null;
  }
  
  /**
   * Get current document
   */
  getCurrentDocument(): MusicXMLDocument {
    return this.currentDocument;
  }
}

// ============================================================================
// Example 4: React Component Integration (TypeScript Interface)
// ============================================================================

/**
 * Example React component showing UI integration
 * Note: For actual React implementation, create a .tsx file with this code
 */
interface MusicXMLRangeEditorProps {
  document: MusicXMLDocument;
  onDocumentChange: (doc: MusicXMLDocument) => void;
}

interface MusicXMLRangeEditorState {
  selectedStart: number;
  selectedEnd: number;
  prompt: string;
  isLoading: boolean;
}

/**
 * React component logic for measure range editing
 * To use this in a React app, copy to a .tsx file
 */
class MusicXMLRangeEditorLogic {
  private props: MusicXMLRangeEditorProps;
  private state: MusicXMLRangeEditorState;
  
  constructor(props: MusicXMLRangeEditorProps) {
    this.props = props;
    this.state = {
      selectedStart: 1,
      selectedEnd: 1,
      prompt: '',
      isLoading: false,
    };
  }
  
  async handleEdit() {
    if (!this.state.prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    
    this.state.isLoading = true;
    try {
      const updatedDoc = await editMeasureRangeExample(
        this.props.document,
        this.state.selectedStart,
        this.state.selectedEnd,
        this.state.prompt
      );
      
      this.props.onDocumentChange(updatedDoc);
      alert('Successfully updated!');
    } catch (error) {
      console.error('Failed to edit:', error);
      alert('Failed to apply changes');
    } finally {
      this.state.isLoading = false;
    }
  }
  
  getTotalMeasures(): number {
    return getTotalMeasures(this.props.document);
  }
}

// ============================================================================
// Helper Functions (Mock implementations)
// ============================================================================

/**
 * Mock LLM API call - replace with your actual implementation
 */
async function sendToLLM(
  semanticData: SemanticMusicXML,
  userPrompt: string
): Promise<SemanticMusicXML> {
  const systemPrompt = `You are a music composition assistant. You receive MusicXML data in semantic format and modify it according to user instructions. Always return valid semantic MusicXML JSON.`;
  
  const userMessage = `Here is the music to modify:\n\n${JSON.stringify(semanticData, null, 2)}\n\nUser request: ${userPrompt}\n\nPlease return the modified music in the same semantic MusicXML format.`;
  
  // Replace with your actual LLM API call
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  const llmOutput = data.choices[0].message.content;
  
  // Parse JSON from LLM response (handle markdown code blocks if needed)
  const jsonMatch = llmOutput.match(/```json\n([\s\S]*?)\n```/) || 
                    llmOutput.match(/```\n([\s\S]*?)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : llmOutput;
  
  return JSON.parse(jsonString);
}

/**
 * Mock function to create LLM prompt
 */
function createLLMPrompt(semantic: SemanticMusicXML, userPrompt: string): string {
  return `
System: You are a music composition assistant. Modify the following music according to the user's request.

Music (Semantic MusicXML format):
${JSON.stringify(semantic, null, 2)}

User Request:
${userPrompt}

Instructions:
- Return ONLY valid semantic MusicXML JSON
- Maintain the same structure (same parts, same number of measures)
- Apply the requested modifications accurately
- Do not add explanations, only return the JSON
`;
}

/**
 * Mock LLM API call
 */
async function callLLMAPI(prompt: string): Promise<string> {
  // Replace with actual API call
  console.log('Sending to LLM:', prompt);
  return '{}'; // Mock response
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Load file and edit specific measures
 */
async function exampleUsage() {
  const parser = new MusicXMLParser();
  
  // Load original document
  const xmlString = await fetch('/example_xmls/Chopin_Etude_Op.10_No.12.xml')
    .then(r => r.text());
  const originalDoc = parser.parse(xmlString);
  
  console.log(`Loaded document with ${getTotalMeasures(originalDoc)} measures`);
  
  // User selects measures 5-8 and wants to transpose them
  const updatedDoc = await editMeasureRangeExample(
    originalDoc,
    5,
    8,
    'Transpose these measures up by a perfect fifth'
  );
  
  // Convert back to XML for saving/playback
  const updatedXML = parser.toXML(updatedDoc);
  console.log('Updated XML:', updatedXML);
}

// Export for use in components
export {
  editMeasureRangeExample,
  manualEditWorkflow,
  MusicXMLEditor,
  MusicXMLRangeEditorLogic,
  exampleUsage,
};

/**
 * React Component Template (JSX/TSX)
 * 
 * Copy this to a .tsx file to use in your React app:
 * 
 * ```tsx
 * import React from 'react';
 * import { MusicXMLDocument, getTotalMeasures, editMeasureRangeExample } from '../utils/musicxml-parser';
 * 
 * interface MusicXMLRangeEditorProps {
 *   document: MusicXMLDocument;
 *   onDocumentChange: (doc: MusicXMLDocument) => void;
 * }
 * 
 * export function MusicXMLRangeEditor({ document, onDocumentChange }: MusicXMLRangeEditorProps) {
 *   const [selectedStart, setSelectedStart] = React.useState(1);
 *   const [selectedEnd, setSelectedEnd] = React.useState(1);
 *   const [prompt, setPrompt] = React.useState('');
 *   const [isLoading, setIsLoading] = React.useState(false);
 *   
 *   const totalMeasures = getTotalMeasures(document);
 *   
 *   const handleEdit = async () => {
 *     if (!prompt.trim()) {
 *       alert('Please enter a prompt');
 *       return;
 *     }
 *     
 *     setIsLoading(true);
 *     try {
 *       const updatedDoc = await editMeasureRangeExample(
 *         document,
 *         selectedStart,
 *         selectedEnd,
 *         prompt
 *       );
 *       
 *       onDocumentChange(updatedDoc);
 *       alert('Successfully updated!');
 *     } catch (error) {
 *       console.error('Failed to edit:', error);
 *       alert('Failed to apply changes');
 *     } finally {
 *       setIsLoading(false);
 *     }
 *   };
 *   
 *   return (
 *     <div className="musicxml-range-editor">
 *       <h3>Edit Measure Range</h3>
 *       
 *       <div className="range-selector">
 *         <label>
 *           Start Measure:
 *           <input
 *             type="number"
 *             min={1}
 *             max={totalMeasures}
 *             value={selectedStart}
 *             onChange={(e) => setSelectedStart(Number(e.target.value))}
 *           />
 *         </label>
 *         
 *         <label>
 *           End Measure:
 *           <input
 *             type="number"
 *             min={selectedStart}
 *             max={totalMeasures}
 *             value={selectedEnd}
 *             onChange={(e) => setSelectedEnd(Number(e.target.value))}
 *           />
 *         </label>
 *         
 *         <input
 *           type="range"
 *           min={1}
 *           max={totalMeasures}
 *           value={selectedStart}
 *           onChange={(e) => setSelectedStart(Number(e.target.value))}
 *         />
 *         <input
 *           type="range"
 *           min={selectedStart}
 *           max={totalMeasures}
 *           value={selectedEnd}
 *           onChange={(e) => setSelectedEnd(Number(e.target.value))}
 *         />
 *       </div>
 *       
 *       <div className="prompt-section">
 *         <label>
 *           What would you like to change?
 *           <textarea
 *             value={prompt}
 *             onChange={(e) => setPrompt(e.target.value)}
 *             placeholder="E.g., Transpose up by a major third..."
 *             rows={4}
 *           />
 *         </label>
 *       </div>
 *       
 *       <button onClick={handleEdit} disabled={isLoading}>
 *         {isLoading ? 'Processing...' : 'Apply Changes'}
 *       </button>
 *       
 *       <p className="info">
 *         Total measures: {totalMeasures} | Selected: {selectedEnd - selectedStart + 1} measures
 *       </p>
 *     </div>
 *   );
 * }
 * ```
 */
