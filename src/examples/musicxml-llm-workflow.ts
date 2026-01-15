/**
 * Example: MusicXML + LLM Workflow
 * 
 * This demonstrates how to:
 * 1. Parse a MusicXML file
 * 2. Send it to an LLM for modifications
 * 3. Validate the LLM's response
 * 4. Convert back to MusicXML
 */

import {
  MusicXMLParser,
  type MusicXMLDocument,
  type Measure,
} from '../utils/musicxml-parser';

// ============================================================================
// Example 1: Complete Workflow
// ============================================================================

export async function musicXMLLLMWorkflow(
  musicXMLFile: File,
  llmPrompt: string
): Promise<string> {
  const parser = new MusicXMLParser();

  // Step 1: Parse MusicXML file to validated object
  console.log('📄 Parsing MusicXML file...');
  const musicDoc = await parser.parseFile(musicXMLFile);
  console.log('✅ Parsed and validated');

  // Step 2: Prepare data for LLM (convert to JSON)
  console.log('🤖 Sending to LLM...');
  const jsonForLLM = JSON.stringify(musicDoc, null, 2);
  
  // Step 3: Call your LLM API (example with OpenAI/Anthropic)
  const llmResponse = await callLLM(llmPrompt, jsonForLLM);
  
  // Step 4: Parse LLM response (usually returns JSON string)
  let modifiedDoc: unknown;
  try {
    modifiedDoc = JSON.parse(llmResponse);
  } catch (error) {
    throw new Error('LLM returned invalid JSON: ' + error);
  }

  // Step 5: CRITICAL - Validate LLM output with Zod
  console.log('🔍 Validating LLM output...');
  const validationResult = parser.safeParse(modifiedDoc);
  
  if (!validationResult.success) {
    console.error('❌ LLM output validation failed:', validationResult.error);
    throw new Error('LLM returned invalid MusicXML structure: ' + 
      validationResult.error.message);
  }
  
  const validatedDoc = validationResult.data;
  console.log('✅ LLM output validated');

  // Step 6: Convert back to MusicXML string
  console.log('📝 Converting to MusicXML...');
  const finalXML = parser.toXML(validatedDoc);
  console.log('✅ Complete!');

  return finalXML;
}

// ============================================================================
// Example 2: Targeted Modifications
// ============================================================================

/**
 * Transpose all notes by a given number of semitones
 */
export function transposeNotes(
  musicDoc: MusicXMLDocument,
  semitones: number
): MusicXMLDocument {
  const parser = new MusicXMLParser();
  
  // Deep clone to avoid mutating original
  const modified = JSON.parse(JSON.stringify(musicDoc)) as MusicXMLDocument;
  
  const parts = Array.isArray(modified['score-partwise'].part)
    ? modified['score-partwise'].part
    : [modified['score-partwise'].part];

  for (const part of parts) {
    for (const measure of part.measure) {
      if (!measure.note) continue;
      
      const notes = Array.isArray(measure.note) ? measure.note : [measure.note];
      
      for (const note of notes) {
        if (note.pitch) {
          // Transpose pitch
          const currentAlter = note.pitch.alter 
            ? (typeof note.pitch.alter === 'string' ? parseInt(note.pitch.alter) : note.pitch.alter)
            : 0;
          
          // Simple transposition (more complex logic would handle step changes)
          note.pitch.alter = currentAlter + semitones;
        }
      }
    }
  }
  
  // Validate the modified document
  return parser.validate(modified);
}

/**
 * Change tempo marking
 */
export function changeTempo(
  musicDoc: MusicXMLDocument,
  newTempo: number
): MusicXMLDocument {
  const parser = new MusicXMLParser();
  const modified = JSON.parse(JSON.stringify(musicDoc)) as MusicXMLDocument;
  
  const parts = Array.isArray(modified['score-partwise'].part)
    ? modified['score-partwise'].part
    : [modified['score-partwise'].part];

  for (const part of parts) {
    for (const measure of part.measure) {
      if (!measure.direction) continue;
      
      const directions = Array.isArray(measure.direction) 
        ? measure.direction 
        : [measure.direction];
      
      for (const direction of directions) {
        const dirTypes = Array.isArray(direction['direction-type'])
          ? direction['direction-type']
          : [direction['direction-type']];
        
        for (const dirType of dirTypes) {
          if (dirType.metronome) {
            dirType.metronome['per-minute'] = newTempo;
          }
        }
        
        if (direction.sound) {
          direction.sound['@tempo'] = newTempo;
        }
      }
    }
  }
  
  return parser.validate(modified);
}

// ============================================================================
// Example 3: React Hook for LLM Processing
// ============================================================================

export function useMusicXMLLLM() {
  const parser = new MusicXMLParser();

  const processWithLLM = async (
    file: File,
    instruction: string
  ): Promise<{ success: boolean; xml?: string; error?: string }> => {
    try {
      // Parse original
      const originalDoc = await parser.parseFile(file);
      
      // Create prompt for LLM
      const prompt = `
You are a MusicXML editor. I will provide a MusicXML document in JSON format.
Please make the following modification: ${instruction}

Return ONLY valid JSON matching the exact MusicXML structure provided.
Do not include any explanations or markdown code blocks.

MusicXML Document:
${JSON.stringify(originalDoc, null, 2)}
`;

      // Call LLM (you would implement this)
      const llmResponse = await callLLM(prompt, '');
      
      // Parse and validate
      const modifiedDoc = JSON.parse(llmResponse);
      const validated = parser.validate(modifiedDoc);
      
      // Convert to XML
      const xml = parser.toXML(validated);
      
      return { success: true, xml };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  return { processWithLLM, parser };
}

// ============================================================================
// Example 4: Stream Processing (for large files)
// ============================================================================

/**
 * Process measures in chunks for large files
 */
export async function* processInChunks(
  musicDoc: MusicXMLDocument,
  chunkSize: number = 10
): AsyncGenerator<{ partIndex: number; measures: Measure[] }> {
  const parts = Array.isArray(musicDoc['score-partwise'].part)
    ? musicDoc['score-partwise'].part
    : [musicDoc['score-partwise'].part];

  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const measures = parts[partIndex].measure;
    
    for (let i = 0; i < measures.length; i += chunkSize) {
      const chunk = measures.slice(i, i + chunkSize);
      yield { partIndex, measures: chunk };
    }
  }
}

// ============================================================================
// Mock LLM Function (replace with actual API call)
// ============================================================================

async function callLLM(_prompt: string, _context: string): Promise<string> {
  // Example: OpenAI API
  /*
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a MusicXML editor. Return only valid JSON.' },
        { role: 'user', content: prompt + '\n\n' + context }
      ],
      temperature: 0.1, // Low temperature for structured output
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
  */

  // Example: Anthropic API
  /*
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt + '\n\n' + context }
      ],
    }),
  });
  
  const data = await response.json();
  return data.content[0].text;
  */

  // Mock for example
  throw new Error('Implement your LLM API call here');
}

// ============================================================================
// Example 5: Download Modified MusicXML
// ============================================================================

export function downloadMusicXML(xmlString: string, filename: string = 'modified.musicxml') {
  const blob = new Blob([xmlString], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
