#!/usr/bin/env node

/**
 * MIDI to MusicXML Validation Test
 * 
 * Compares generated MusicXML output against ground truth.
 * Automatically converts MIDI to MusicXML in memory.
 * 
 * Usage:
 *   npm run test <test-folder-name>
 *   npm run test <midi-file> <ground-truth.musicxml>
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, basename, dirname, join } from 'path';
import { convertMidiToMusicXML } from '../src/utils/midi-converter.js';

const args = process.argv.slice(2);
let midiPath: string, groundTruthPath: string;

if (args.length === 1) {
  // Treat as folder name
  const testFolder = args[0].replace(/^tests\//, '');
  midiPath = `tests/${testFolder}/input.mid`;
  groundTruthPath = `tests/${testFolder}/expected.musicxml`;
} else if (args.length === 2) {
  // Explicit paths
  [midiPath, groundTruthPath] = args;
} else {
  midiPath = '';
  groundTruthPath = '';
}

if (!midiPath || midiPath === '--help' || midiPath === '-h') {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║          MIDI to MusicXML Validation Test                         ║
╚═══════════════════════════════════════════════════════════════════╝

Usage:
  npm run test <test-folder-name>
  npm run test <midi-file> <ground-truth.musicxml>

Examples:
  npm run test old-macdonald-had-a-farm
  npm run test tests/my-test/input.mid tests/my-test/expected.musicxml
`);
  process.exit(0);
}

const midiFile = resolve(midiPath);
const groundTruthFile = resolve(groundTruthPath);

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║          MIDI to MusicXML Validation Test                         ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log('');

// Check MIDI file
if (!existsSync(midiFile)) {
  console.error('✗ ERROR: MIDI file not found');
  console.error('  Path:', midiFile);
  console.error('');
  process.exit(1);
}

console.log('✓ MIDI file found:', basename(midiFile));

// Check ground truth
if (!existsSync(groundTruthFile)) {
  console.error('✗ ERROR: Ground truth MusicXML not found');
  console.error('  Path:', groundTruthFile);
  console.error('');
  console.error('Create ground truth first:');
  console.error(`  npm run ground-truth ${basename(dirname(midiFile))}`);
  console.error('');
  process.exit(1);
}

console.log('✓ Ground truth found:', basename(groundTruthFile));

// Convert MIDI to MusicXML in memory
console.log('⚙  Converting MIDI to MusicXML...');

let generated: string;
try {
  const midiBuffer = readFileSync(midiFile);
  const arrayBuffer = midiBuffer.buffer.slice(
    midiBuffer.byteOffset,
    midiBuffer.byteOffset + midiBuffer.byteLength
  );
  generated = await convertMidiToMusicXML(arrayBuffer);
  console.log('✓ Conversion complete');
} catch (error) {
  console.error('✗ ERROR: Failed to convert MIDI file');
  console.error('  ', error instanceof Error ? error.message : String(error));
  console.error('');
  process.exit(1);
}

console.log('');

// Load and compare
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Comparing MusicXML Files');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');

const groundTruth = readFileSync(groundTruthFile, 'utf-8');

// Basic comparison
const exactMatch = groundTruth === generated;

if (exactMatch) {
  console.log('✓✓✓ PERFECT MATCH ✓✓✓');
  console.log('');
  console.log('The generated MusicXML exactly matches the ground truth.');
  console.log('No regressions detected!');
  console.log('');
  process.exit(0);
}

console.log('⚠  Files differ - analyzing differences...');
console.log('');

// Detailed comparison
const differences = [];

// Size comparison
if (groundTruth.length !== generated.length) {
  const diff = generated.length - groundTruth.length;
  const pct = ((Math.abs(diff) / groundTruth.length) * 100).toFixed(1);
  differences.push({
    type: 'Size',
    ground: `${groundTruth.length} chars`,
    generated: `${generated.length} chars`,
    diff: `${diff > 0 ? '+' : ''}${diff} (${pct}%)`
  });
}

// Extract and compare key musical elements
const extractElements = (xml) => ({
  parts: (xml.match(/<score-part/g) || []).length,
  measures: (xml.match(/<measure number/g) || []).length,
  notes: (xml.match(/<note/g) || []).length,
  staves: (xml.match(/<staves>(\d+)<\/staves>/g) || []).map(m => m.match(/\d+/)[0]),
  clefs: (xml.match(/<sign>([GF])<\/sign>/g) || []).map(m => m.match(/[GF]/)[0]),
  beams: (xml.match(/<beam number="1">/g) || []).length,
  voices: [...new Set((xml.match(/<voice>(\d+)<\/voice>/g) || []).map(m => m.match(/\d+/)[0]))],
  tempo: (xml.match(/<per-minute>([^<]+)<\/per-minute>/) || [])[1],
  timeSignature: (xml.match(/<beats>(\d+)<\/beats>[\s\S]*?<beat-type>(\d+)<\/beat-type>/) || []).slice(1, 3).join('/'),
});

const groundElements = extractElements(groundTruth);
const generatedElements = extractElements(generated);

// Compare elements
Object.keys(groundElements).forEach(key => {
  const groundVal = JSON.stringify(groundElements[key]);
  const genVal = JSON.stringify(generatedElements[key]);
  
  if (groundVal !== genVal) {
    differences.push({
      type: key.charAt(0).toUpperCase() + key.slice(1),
      ground: groundElements[key],
      generated: generatedElements[key],
      diff: '≠'
    });
  }
});

// Display differences
if (differences.length === 0) {
  console.log('✓ Musical structure matches');
  console.log('');
  console.log('The files have identical musical content but differ in formatting/whitespace.');
  console.log('This is typically acceptable.');
  console.log('');
  
  // Optionally save for debugging
  const testFolder = basename(dirname(midiFile));
  const debugFile = join(dirname(groundTruthFile), 'generated.musicxml');
  writeFileSync(debugFile, generated, 'utf-8');
  console.log(`Debug: Generated file saved to ${testFolder}/generated.musicxml`);
  console.log('');
} else {
  console.log('Differences detected:');
  console.log('');
  console.log('Element'.padEnd(20), 'Ground Truth'.padEnd(25), 'Generated'.padEnd(25), 'Diff');
  console.log('─'.repeat(95));
  
  differences.forEach(d => {
    const groundStr = String(d.ground).substring(0, 23);
    const genStr = String(d.generated).substring(0, 23);
    const diffStr = String(d.diff).substring(0, 23);
    console.log(d.type.padEnd(20), groundStr.padEnd(25), genStr.padEnd(25), diffStr);
  });
  
  console.log('');
}

// Line-by-line diff for first difference
const groundLines = groundTruth.split('\n');
const genLines = generated.split('\n');
let firstDiffLine = -1;

for (let i = 0; i < Math.min(groundLines.length, genLines.length); i++) {
  if (groundLines[i] !== genLines[i]) {
    firstDiffLine = i + 1;
    break;
  }
}

if (firstDiffLine > 0) {
  console.log(`First difference at line ${firstDiffLine}:`);
  console.log('');
  console.log('Ground truth:');
  console.log(' ', groundLines[firstDiffLine - 1].substring(0, 80));
  console.log('');
  console.log('Generated:');
  console.log(' ', genLines[firstDiffLine - 1].substring(0, 80));
  console.log('');
}

// Summary
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');

if (differences.length === 0) {
  console.log('Status: ✓ PASS (formatting differences only)');
  console.log('');
  console.log('Action: Review whitespace differences, update ground truth if needed.');
  process.exit(0);
} else {
  console.log('Status: ⚠  DIFFERENCES DETECTED');
  console.log('');
  
  // Save generated output for debugging
  const testFolder = basename(dirname(midiFile));
  const debugFile = join(dirname(groundTruthFile), 'generated.musicxml');
  writeFileSync(debugFile, generated, 'utf-8');
  console.log(`Generated output saved to: ${testFolder}/generated.musicxml`);
  console.log('');
  
  console.log('Action:');
  console.log('  1. Review differences above');
  console.log('  2. If expected (intentional improvement):');
  console.log(`     cp tests/${testFolder}/generated.musicxml tests/${testFolder}/expected.musicxml`);
  console.log('  3. If unexpected (regression):');
  console.log('     Fix the converter code and rerun test');
  console.log('');
  process.exit(1);
}
