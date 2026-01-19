#!/usr/bin/env node

/**
 * Regression Test Runner
 * 
 * Finds all test cases in tests/ and validates their ground truth files.
 * Each test case is a folder containing input.mid and expected.musicxml.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

console.log('');
console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║            MIDI to MusicXML Regression Tests                      ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log('');

// Find all test cases (folders with input.mid)
const testDir = resolve('tests');
const entries = readdirSync(testDir, { withFileTypes: true });
const testCases = entries
  .filter(entry => entry.isDirectory())
  .map(entry => {
    const midiPath = join(testDir, entry.name, 'input.mid');
    const xmlPath = join(testDir, entry.name, 'expected.musicxml');
    return existsSync(midiPath) ? { folder: entry.name, midiPath, xmlPath } : null;
  })
  .filter(Boolean);

console.log(`Found ${testCases.length} test case(s)`);
console.log('');

if (testCases.length === 0) {
  console.log('No test cases found.');
  console.log('');
  console.log('Create a test case folder with:');
  console.log('  tests/my-test/input.mid');
  console.log('  tests/my-test/expected.musicxml');
  console.log('');
  process.exit(0);
}

let missingCount = 0;
let validCount = 0;
let invalidCount = 0;

for (const { folder, midiPath, xmlPath } of testCases) {
  console.log(`Testing: ${folder}/`);
  
  if (!existsSync(xmlPath)) {
    console.log(`  ✗ Missing ground truth`);
    console.log(`    Generate: npm run ground-truth ${folder}`);
    console.log('');
    missingCount++;
    continue;
  }

  try {
    const xml = readFileSync(xmlPath, 'utf-8');
    
    // Validate structure
    const hasXmlDecl = xml.includes('<?xml version');
    const hasScorePartwise = xml.includes('<score-partwise');
    const hasGrandStaff = xml.includes('<staves>2</staves>');
    const hasTrebleClef = xml.includes('<sign>G</sign>');
    const hasBassClef = xml.includes('<sign>F</sign>');
    const hasBeaming = xml.includes('<beam number="1">');
    const voiceCount = new Set((xml.match(/<voice>(\d+)<\/voice>/g) || []).map(m => m.match(/\d+/)[0])).size;
    
    const issues = [];
    if (!hasXmlDecl) issues.push('Missing XML declaration');
    if (!hasScorePartwise) issues.push('Not valid MusicXML');
    if (!hasGrandStaff) issues.push('Not using grand staff');
    if (!hasTrebleClef || !hasBassClef) issues.push('Missing clefs');
    if (!hasBeaming) issues.push('No beaming');
    if (voiceCount < 2) issues.push('Single voice only');
    
    if (issues.length > 0) {
      console.log(`  ⚠  Ground truth has issues:`);
      issues.forEach(issue => console.log(`     - ${issue}`));
      console.log('');
      invalidCount++;
    } else {
      console.log(`  ✓ Valid ground truth`);
      console.log('');
      validCount++;
    }
    
  } catch (error) {
    console.log(`  ✗ Error reading file: ${error.message}`);
    console.log('');
    invalidCount++;
  }
}

// Summary
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Summary');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log(`Valid:   ${validCount}`);
console.log(`Invalid: ${invalidCount}`);
console.log(`Missing: ${missingCount}`);
console.log('');

if (validCount === testCases.length) {
  console.log('✓ All tests passed!');
  console.log('');
  process.exit(0);
} else {
  console.log('⚠  Some tests need attention');
  console.log('');
  process.exit(1);
}
