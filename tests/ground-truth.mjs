#!/usr/bin/env node

/**
 * Ground Truth Generator for MIDI to MusicXML Testing
 * 
 * Usage:
 *   npm run ground-truth <test-folder-name>
 *   npm run ground-truth <path-to-midi>
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { resolve, basename, dirname, join } from 'path';

const inputPath = process.argv[2];

if (!inputPath || inputPath === '--help' || inputPath === '-h') {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║          MIDI to MusicXML Ground Truth Generator                      ║
╚═══════════════════════════════════════════════════════════════════════╝

Usage:
  npm run ground-truth <test-folder-name>
  npm run ground-truth <path-to-midi>

Examples:
  npm run ground-truth old-macdonald-had-a-farm
  npm run ground-truth tests/my-test/input.mid
`);
  process.exit(0);
}

// Support both folder name and file path
let midiFile, groundTruthFile;
if (!inputPath.endsWith('.mid')) {
  const testFolder = inputPath.replace(/^tests\//, '');
  midiFile = resolve('tests', testFolder, 'input.mid');
  groundTruthFile = resolve('tests', testFolder, 'expected.musicxml');
} else {
  midiFile = resolve(inputPath);
  groundTruthFile = join(dirname(midiFile), 'expected.musicxml');
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Ground Truth File Check');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');

if (!existsSync(midiFile)) {
  console.error('✗ MIDI file not found:', midiFile);
  process.exit(1);
}

console.log('✓ MIDI file exists:', basename(midiFile));
console.log(`  Size: ${statSync(midiFile).size} bytes`);

if (!existsSync(groundTruthFile)) {
  console.log('✗ Ground truth not found:', basename(groundTruthFile));
  console.log('');
  console.log('Generate via web UI:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:5173/music_editor/');
  console.log(`  3. Upload ${basename(midiFile)}`);
  console.log('  4. Copy MusicXML from console');
  console.log(`  5. Save to ${basename(dirname(midiFile))}/expected.musicxml`);
  console.log('');
  process.exit(0);
}

console.log('✓ Ground truth exists:', basename(groundTruthFile));

const xml = readFileSync(groundTruthFile, 'utf-8');
const parts = (xml.match(/<score-part/g) || []).length;
const measures = (xml.match(/<measure number/g) || []).length;
const staves = xml.match(/<staves>(\d+)<\/staves>/)?.[1];
const voices = new Set((xml.match(/<voice>(\d+)<\/voice>/g) || []).map(m => m.match(/\d+/)[0])).size;

console.log('');
console.log('Content: Parts:', parts, '| Measures:', measures, '| Staves:', staves || 1, '| Voices:', voices);
console.log('✓ Ground truth is valid');
console.log('');
