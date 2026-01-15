/**
 * Test/Demo file for Semantic MusicXML Parser
 * Run this to verify the complete workflow
 */

import {
  SemanticMusicXMLParser,
  type SemanticMusicXML,
  encodeToSemantic,
  MusicXMLParser,
  musicXMLToString,
} from '../utils/musicxml-parser';

// ============================================================================
// Test Data: Minimal Valid MusicXML
// ============================================================================

const testMusicXML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <movement-title>Test Piece</movement-title>
  <identification>
    <creator type="composer">Test Composer</creator>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>Piano</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>120</per-minute>
          </metronome>
        </direction-type>
      </direction>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>4</duration>
        <voice>1</voice>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

// ============================================================================
// Test Functions
// ============================================================================

export function testEncoding() {
  console.log('=== TEST 1: Encoding MusicXML to Semantic Format ===\n');
  
  const parser = new MusicXMLParser();
  const fullDoc = parser.parse(testMusicXML);
  
  const semantic = encodeToSemantic(fullDoc);
  
  console.log('Original MusicXML size:', testMusicXML.length, 'bytes');
  console.log('Semantic JSON size:', JSON.stringify(semantic).length, 'bytes');
  console.log('Reduction:', Math.round((1 - JSON.stringify(semantic).length / testMusicXML.length) * 100) + '%');
  console.log('\nSemantic Format:');
  console.log(JSON.stringify(semantic, null, 2));
  
  return semantic;
}

export function testValidation(semantic: SemanticMusicXML) {
  console.log('\n\n=== TEST 2: Validating Semantic Format ===\n');
  
  const semanticParser = new SemanticMusicXMLParser();
  
  try {
    const validated = semanticParser.validate(semantic);
    console.log('✅ Validation successful!');
    console.log('Title:', validated.title);
    console.log('Composer:', validated.composer);
    console.log('Parts:', validated.parts.length);
    console.log('Measures in first part:', validated.parts[0].measures.length);
    console.log('Notes in first measure:', validated.parts[0].measures[0].notes.length);
    return validated;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

export function testDecoding(semantic: SemanticMusicXML) {
  console.log('\n\n=== TEST 3: Decoding Semantic to MusicXML ===\n');
  
  const semanticParser = new SemanticMusicXMLParser();
  
  try {
    const musicXML = semanticParser.toMusicXML(semantic);
    console.log('✅ Decoding successful!');
    
    const xml = musicXMLToString(musicXML);
    console.log('Output MusicXML size:', xml.length, 'bytes');
    console.log('\nFirst 500 chars of output:');
    console.log(xml.substring(0, 500) + '...');
    
    return musicXML;
  } catch (error) {
    console.error('❌ Decoding failed:', error);
    throw error;
  }
}

export function testEditing(semantic: SemanticMusicXML) {
  console.log('\n\n=== TEST 4: Editing Semantic Format ===\n');
  
  // Simulate LLM edit: Change key to D major and increase tempo
  const edited: SemanticMusicXML = {
    ...semantic,
    parts: semantic.parts.map(part => ({
      ...part,
      measures: part.measures.map((measure, idx) => {
        const newMeasure = { ...measure };
        
        // Change key signature in first measure
        if (idx === 0 && newMeasure.attributes?.key) {
          newMeasure.attributes = {
            ...newMeasure.attributes,
            key: { fifths: 2, mode: 'major' }, // D major
          };
        }
        
        // Change tempo
        if (newMeasure.directions) {
          newMeasure.directions = newMeasure.directions.map(dir =>
            dir.type === 'tempo' ? { ...dir, value: 140 } : dir
          );
        }
        
        return newMeasure;
      }),
    })),
  };
  
  console.log('Edits made:');
  console.log('- Changed key from C major (0) to D major (2)');
  console.log('- Changed tempo from 120 to 140 BPM');
  
  // Validate edited version
  const semanticParser = new SemanticMusicXMLParser();
  const validated = semanticParser.validate(edited);
  
  console.log('\n✅ Edited version validated successfully!');
  console.log('New key signature:', validated.parts[0].measures[0].attributes?.key);
  console.log('New tempo:', validated.parts[0].measures[0].directions?.[0].value);
  
  return validated;
}

export function testInvalidInput() {
  console.log('\n\n=== TEST 5: Invalid Input Handling ===\n');
  
  const semanticParser = new SemanticMusicXMLParser();
  
  // Test with invalid data
  const invalidData = {
    parts: [
      {
        id: 'P1',
        name: 'Piano',
        measures: [
          {
            number: 1,
            notes: [
              {
                pitch: { step: 'H', octave: 4 }, // Invalid step!
                duration: 4,
                voice: 1,
              },
            ],
          },
        ],
      },
    ],
  };
  
  const result = semanticParser.safeParse(invalidData);
  
  if (!result.success) {
    console.log('✅ Invalid input correctly rejected!');
    console.log('Error:', result.error.issues[0].message);
    console.log('Path:', result.error.issues[0].path.join('.'));
  } else {
    console.error('❌ Should have rejected invalid input!');
  }
}

export function testJSONParsing() {
  console.log('\n\n=== TEST 6: JSON String Parsing ===\n');
  
  const semanticParser = new SemanticMusicXMLParser();
  
  const jsonString = `{
    "title": "JSON Test",
    "parts": [{
      "id": "P1",
      "name": "Test Part",
      "measures": [{
        "number": 1,
        "notes": [{
          "pitch": { "step": "C", "octave": 4 },
          "duration": 4,
          "voice": 1
        }]
      }]
    }]
  }`;
  
  try {
    const parsed = semanticParser.parseJSON(jsonString);
    console.log('✅ JSON parsing successful!');
    console.log('Title:', parsed.title);
  } catch (error) {
    console.error('❌ JSON parsing failed:', error);
  }
}

// ============================================================================
// Run All Tests
// ============================================================================

export function runAllTests() {
  console.log('🧪 SEMANTIC MUSICXML PARSER TEST SUITE\n');
  console.log('='.repeat(60));
  
  try {
    const semantic = testEncoding();
    testValidation(semantic);
    testDecoding(semantic);
    const edited = testEditing(semantic);
    testDecoding(edited);
    testInvalidInput();
    testJSONParsing();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.error('❌ TEST SUITE FAILED:', error);
    console.log('='.repeat(60));
  }
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).runSemanticTests = runAllTests;
  console.log('Tests loaded! Run runSemanticTests() in console to test.');
}
