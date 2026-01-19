#!/usr/bin/env node

/**
 * MIDI File Inspector
 * Displays detailed information about a MIDI file
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import pkg from '@tonejs/midi';
const { Midi } = pkg;

const midiPath = process.argv[2];

if (!midiPath || midiPath === '--help' || midiPath === '-h') {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    MIDI File Inspector                           ║
╚═══════════════════════════════════════════════════════════════════╝

Usage:
  npm run inspect-midi <path-to-midi-file>

Examples:
  npm run inspect-midi tests/test-name/input.mid
  npm run inspect-midi path/to/song.mid
`);
  process.exit(0);
}

const midiFile = resolve(midiPath);

if (!existsSync(midiFile)) {
  console.error('✗ ERROR: MIDI file not found');
  console.error('  Path:', midiFile);
  console.error('');
  process.exit(1);
}

const midiBuffer = readFileSync(midiFile);
const midi = new Midi(midiBuffer);

console.log('═══════════════════════════════════════════════════════');
console.log('MIDI Test File Information');
console.log('═══════════════════════════════════════════════════════');
console.log('File:', basename(midiFile));
console.log('Name:', midi.name || '(unnamed)');
console.log('Duration:', midi.duration.toFixed(2), 'seconds');
console.log('Tempo:', midi.header.tempos[0]?.bpm || 120, 'BPM');
console.log('Time Signature:', midi.header.timeSignatures[0]?.timeSignature.join('/') || '4/4');
console.log('Tracks:', midi.tracks.length);
console.log('');

midi.tracks.forEach((track, index) => {
  console.log(`Track ${index}:`);
  console.log(`  Name: ${track.name || '(unnamed)'}`);
  console.log(`  Instrument: ${track.instrument?.name || 'unknown'}`);
  console.log(`  Channel: ${track.channel}`);
  console.log(`  Notes: ${track.notes.length}`);
  if (track.notes.length > 0) {
    const pitches = track.notes.map(n => n.midi);
    console.log(`  Pitch range: ${Math.min(...pitches)} - ${Math.max(...pitches)}`);
  }
  console.log('');
});

console.log('═══════════════════════════════════════════════════════');
console.log('To generate MusicXML:');
console.log('1. Start the dev server: npm run dev');
console.log('2. Open: http://localhost:5173/music_editor/tests/test-converter.html');
console.log('3. The MusicXML will be auto-downloaded');
console.log('');
console.log('Or use the web UI:');
console.log('1. Go to: http://localhost:5173/music_editor/');
console.log('2. Upload: tests/old-macdonald-had-a-farm.mid');
console.log('3. Copy the generated MusicXML from the output');
console.log('4. Save to: tests/old-macdonald-had-a-farm.musicxml');
console.log('═══════════════════════════════════════════════════════');
