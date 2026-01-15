/**
 * Complete workflow example for LLM-based MusicXML editing
 * Shows how to use the semantic format for AI music editing
 */

import {
  MusicXMLParser,
  SemanticMusicXMLParser,
  encodeToSemantic,
  decodeFromSemantic,
  processLLMOutput,
  musicXMLToString,
  type SemanticMusicXML,
} from '../utils/musicxml-parser';

// ============================================================================
// Example 1: Basic Workflow - Load, Encode, Edit, Decode
// ============================================================================

export async function basicWorkflow(musicXMLString: string): Promise<string> {
  // Step 1: Parse original MusicXML
  const parser = new MusicXMLParser();
  const fullDocument = parser.parse(musicXMLString);
  
  // Step 2: Encode to semantic format (70-90% smaller)
  const semantic = encodeToSemantic(fullDocument);
  
  console.log('Original size:', musicXMLString.length, 'bytes');
  console.log('Semantic size:', JSON.stringify(semantic).length, 'bytes');
  console.log('Reduction:', Math.round((1 - JSON.stringify(semantic).length / musicXMLString.length) * 100), '%');
  
  // Step 3: Send to LLM (simulated edit)
  const editedSemantic = simulateLLMEdit(semantic);
  
  // Step 4: Validate LLM output
  const semanticParser = new SemanticMusicXMLParser();
  const validated = semanticParser.validate(editedSemantic);
  
  // Step 5: Convert back to full MusicXML
  const editedDocument = decodeFromSemantic(validated);
  
  // Step 6: Validate full MusicXML
  const finalValidated = parser.validate(editedDocument);
  
  // Step 7: Convert to XML string for playback
  const outputXML = musicXMLToString(finalValidated);
  
  return outputXML;
}

// ============================================================================
// Example 2: Simplified Workflow with Error Handling
// ============================================================================

export async function simpleWorkflow(musicXMLString: string, llmOutputJSON: string): Promise<{
  success: boolean;
  xml?: string;
  error?: string;
}> {
  try {
    // Parse original
    const parser = new MusicXMLParser();
    parser.parse(musicXMLString);
    
    // Encode for LLM
    // const semantic = encodeToSemantic(fullDocument);
    
    // ... Send semantic to LLM, get back llmOutputJSON ...
    
    // Process LLM output (validates both semantic and final MusicXML)
    const result = processLLMOutput(llmOutputJSON);
    
    // Convert to XML
    const xml = musicXMLToString(result);
    
    return { success: true, xml };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// Example 3: Safe Workflow with Detailed Error Handling
// ============================================================================

export async function safeWorkflow(_musicXMLString: string, llmOutputJSON: string): Promise<{
  success: boolean;
  xml?: string;
  semanticError?: string;
  musicXMLError?: string;
}> {
  const semanticParser = new SemanticMusicXMLParser();
  
  // Step 1: Try to parse LLM output as semantic format
  const semanticResult = semanticParser.safeParseJSON(llmOutputJSON);
  
  if (!semanticResult.success) {
    return {
      success: false,
      semanticError: `Invalid semantic format: ${semanticResult.error}`,
    };
  }
  
  // Step 2: Try to convert to MusicXML
  const musicXMLResult = semanticParser.safeToMusicXML(semanticResult.data);
  
  if (!musicXMLResult.success) {
    return {
      success: false,
      musicXMLError: `Failed to convert to MusicXML: ${musicXMLResult.error}`,
    };
  }
  
  // Step 3: Convert to XML string
  const parser = new MusicXMLParser();
  const xml = parser.toXML(musicXMLResult.data);
  
  return { success: true, xml };
}

// ============================================================================
// Example 4: Common LLM Editing Tasks
// ============================================================================

/**
 * Example: Change key signature
 */
export function changeKey(semantic: SemanticMusicXML, newFifths: number): SemanticMusicXML {
  const edited = { ...semantic };
  
  edited.parts = edited.parts.map(part => ({
    ...part,
    measures: part.measures.map(measure => {
      if (measure.attributes?.key) {
        return {
          ...measure,
          attributes: {
            ...measure.attributes,
            key: { fifths: newFifths, mode: measure.attributes.key.mode },
          },
        };
      }
      return measure;
    }),
  }));
  
  return edited;
}

/**
 * Example: Change tempo
 */
export function changeTempo(semantic: SemanticMusicXML, newTempo: number): SemanticMusicXML {
  const edited = { ...semantic };
  
  edited.parts = edited.parts.map(part => ({
    ...part,
    measures: part.measures.map(measure => {
      if (measure.directions) {
        return {
          ...measure,
          directions: measure.directions.map(dir => 
            dir.type === 'tempo' ? { ...dir, value: newTempo } : dir
          ),
        };
      }
      return measure;
    }),
  }));
  
  return edited;
}

/**
 * Example: Add dynamics to a part
 */
export function addDynamics(
  semantic: SemanticMusicXML,
  partIndex: number,
  dynamic: string
): SemanticMusicXML {
  const edited = { ...semantic };
  
  if (edited.parts[partIndex]) {
    edited.parts[partIndex] = {
      ...edited.parts[partIndex],
      measures: edited.parts[partIndex].measures.map((measure, idx) => {
        // Add dynamic at the start of every 4th measure
        if (idx % 4 === 0) {
          return {
            ...measure,
            directions: [
              ...(measure.directions || []),
              { type: 'dynamics', value: dynamic },
            ],
          };
        }
        return measure;
      }),
    };
  }
  
  return edited;
}

/**
 * Example: Transpose notes
 */
export function transposeNotes(
  semantic: SemanticMusicXML,
  semitones: number
): SemanticMusicXML {
  const edited = { ...semantic };
  
  edited.parts = edited.parts.map(part => ({
    ...part,
    measures: part.measures.map(measure => ({
      ...measure,
      notes: measure.notes.map(note => {
        if (note.pitch) {
          // Simplified transposition (would need proper chromatic logic)
          return {
            ...note,
            pitch: {
              ...note.pitch,
              alter: (note.pitch.alter || 0) + semitones,
            },
          };
        }
        return note;
      }),
    })),
  }));
  
  return edited;
}

/**
 * Example: Add articulation to all notes
 */
export function addArticulation(
  semantic: SemanticMusicXML,
  articulation: string
): SemanticMusicXML {
  const edited = { ...semantic };
  
  edited.parts = edited.parts.map(part => ({
    ...part,
    measures: part.measures.map(measure => ({
      ...measure,
      notes: measure.notes.map(note => ({
        ...note,
        articulations: [...(note.articulations || []), articulation],
      })),
    })),
  }));
  
  return edited;
}

// ============================================================================
// Example 5: LLM Prompt Templates
// ============================================================================

/**
 * Generate prompt for LLM to edit music
 */
export function generateLLMPrompt(semantic: SemanticMusicXML, instruction: string): string {
  return `
You are a music editing AI. You will receive a musical score in a compact JSON format.
Your task is to edit the music according to the user's instructions and return the modified JSON.

IMPORTANT RULES:
1. Return ONLY valid JSON matching the exact same structure
2. Preserve all required fields (parts, measures, notes, etc.)
3. Keep the same number of parts unless instructed otherwise
4. Ensure note durations and measure timing remain valid
5. Do not add explanatory text - ONLY return the JSON

STRUCTURE GUIDE:
- pitch.step: Note letter (C, D, E, F, G, A, B)
- pitch.alter: -1 = flat, 0 = natural, 1 = sharp
- pitch.octave: Octave number (4 = middle C octave)
- duration: In divisions (e.g., 4 divisions = quarter note if divisions=4)
- type: "whole", "half", "quarter", "eighth", "16th", etc.
- dynamics: "p", "pp", "f", "ff", "mf", "mp", etc.
- articulations: ["staccato"], ["accent"], ["tenuto"], etc.

USER INSTRUCTION:
${instruction}

CURRENT MUSIC:
${JSON.stringify(semantic, null, 2)}

Return the edited music as valid JSON:
`.trim();
}

/**
 * Example LLM prompts
 */
export const examplePrompts = {
  changeKey: "Change the key signature from C major to D major (2 sharps)",
  increaseTempo: "Increase the tempo by 20 BPM",
  addDynamics: "Make the violin part louder by changing dynamics to forte (f)",
  addStaccato: "Add staccato articulation to all eighth notes",
  makeCheerful: "Make the piece sound more cheerful by adding accents and increasing tempo",
  simplifyRhythm: "Simplify complex rhythms by converting dotted notes to regular notes",
  addHarmony: "Add a harmony line a third above the melody in the second part",
};

// ============================================================================
// Simulated LLM Edit (for testing)
// ============================================================================

function simulateLLMEdit(semantic: SemanticMusicXML): SemanticMusicXML {
  // Simulate an LLM making simple edits
  // In reality, this would be a call to GPT-4, Claude, etc.
  
  // Example: Change tempo if it exists
  const edited = { ...semantic };
  
  if (edited.parts[0]?.measures[0]?.directions) {
    edited.parts[0].measures[0].directions = edited.parts[0].measures[0].directions.map(dir => 
      dir.type === 'tempo' && typeof dir.value === 'number'
        ? { ...dir, value: dir.value + 20 }
        : dir
    );
  }
  
  return edited;
}

// ============================================================================
// Complete Integration Example
// ============================================================================

/**
 * Complete example showing the full workflow with React integration
 */
export async function completeExample() {
  // 1. User uploads MusicXML file
  const musicXMLString = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <!-- ... MusicXML content ... -->
</score-partwise>`;
  
  // 2. Parse and encode
  const parser = new MusicXMLParser();
  const fullDocument = parser.parse(musicXMLString);
  const semantic = encodeToSemantic(fullDocument);
  
  // 3. User gives instruction
  // const userInstruction = "Make the violin part louder";
  
  // 4. Generate LLM prompt
  // const prompt = generateLLMPrompt(semantic, userInstruction);
  
  // 5. Send to LLM (pseudo-code)
  // const llmResponse = await callLLM(prompt);
  const llmResponse = JSON.stringify(addDynamics(semantic, 0, 'f'));
  
  // 6. Validate and convert back
  const result = await safeWorkflow(musicXMLString, llmResponse);
  
  if (result.success && result.xml) {
    console.log('✅ Successfully edited music!');
    console.log('New XML:', result.xml);
    return result.xml;
  } else {
    console.error('❌ Edit failed:', result.semanticError || result.musicXMLError);
    throw new Error('Edit failed');
  }
}
