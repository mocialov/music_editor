/**
 * MIDI to MusicXML Converter
 * Professional-grade conversion similar to MuseScore/Dorico
 */

import pkg from '@tonejs/midi';
const { Midi } = pkg;
import type { Track } from '@tonejs/midi';

// ============================================================================
// General MIDI (GM) Instrument Definitions
// ============================================================================

/**
 * General MIDI Level 1 Sound Set
 * Program numbers 0-127 (internally stored as 0-indexed)
 */
const GM_INSTRUMENTS: Record<number, { name: string; family: string; clef: 'treble' | 'bass' | 'alto' | 'percussion' }> = {
  // Piano (0-7)
  0: { name: 'Acoustic Grand Piano', family: 'Piano', clef: 'treble' },
  1: { name: 'Bright Acoustic Piano', family: 'Piano', clef: 'treble' },
  2: { name: 'Electric Grand Piano', family: 'Piano', clef: 'treble' },
  3: { name: 'Honky-tonk Piano', family: 'Piano', clef: 'treble' },
  4: { name: 'Electric Piano 1', family: 'Piano', clef: 'treble' },
  5: { name: 'Electric Piano 2', family: 'Piano', clef: 'treble' },
  6: { name: 'Harpsichord', family: 'Piano', clef: 'treble' },
  7: { name: 'Clavinet', family: 'Piano', clef: 'treble' },
  
  // Chromatic Percussion (8-15)
  8: { name: 'Celesta', family: 'Chromatic Percussion', clef: 'treble' },
  9: { name: 'Glockenspiel', family: 'Chromatic Percussion', clef: 'treble' },
  10: { name: 'Music Box', family: 'Chromatic Percussion', clef: 'treble' },
  11: { name: 'Vibraphone', family: 'Chromatic Percussion', clef: 'treble' },
  12: { name: 'Marimba', family: 'Chromatic Percussion', clef: 'treble' },
  13: { name: 'Xylophone', family: 'Chromatic Percussion', clef: 'treble' },
  14: { name: 'Tubular Bells', family: 'Chromatic Percussion', clef: 'treble' },
  15: { name: 'Dulcimer', family: 'Chromatic Percussion', clef: 'treble' },
  
  // Organ (16-23)
  16: { name: 'Drawbar Organ', family: 'Organ', clef: 'treble' },
  17: { name: 'Percussive Organ', family: 'Organ', clef: 'treble' },
  18: { name: 'Rock Organ', family: 'Organ', clef: 'treble' },
  19: { name: 'Church Organ', family: 'Organ', clef: 'treble' },
  20: { name: 'Reed Organ', family: 'Organ', clef: 'treble' },
  21: { name: 'Accordion', family: 'Organ', clef: 'treble' },
  22: { name: 'Harmonica', family: 'Organ', clef: 'treble' },
  23: { name: 'Tango Accordion', family: 'Organ', clef: 'treble' },
  
  // Guitar (24-31)
  24: { name: 'Acoustic Guitar (nylon)', family: 'Guitar', clef: 'treble' },
  25: { name: 'Acoustic Guitar (steel)', family: 'Guitar', clef: 'treble' },
  26: { name: 'Electric Guitar (jazz)', family: 'Guitar', clef: 'treble' },
  27: { name: 'Electric Guitar (clean)', family: 'Guitar', clef: 'treble' },
  28: { name: 'Electric Guitar (muted)', family: 'Guitar', clef: 'treble' },
  29: { name: 'Overdriven Guitar', family: 'Guitar', clef: 'treble' },
  30: { name: 'Distortion Guitar', family: 'Guitar', clef: 'treble' },
  31: { name: 'Guitar Harmonics', family: 'Guitar', clef: 'treble' },
  
  // Bass (32-39)
  32: { name: 'Acoustic Bass', family: 'Bass', clef: 'bass' },
  33: { name: 'Electric Bass (finger)', family: 'Bass', clef: 'bass' },
  34: { name: 'Electric Bass (pick)', family: 'Bass', clef: 'bass' },
  35: { name: 'Fretless Bass', family: 'Bass', clef: 'bass' },
  36: { name: 'Slap Bass 1', family: 'Bass', clef: 'bass' },
  37: { name: 'Slap Bass 2', family: 'Bass', clef: 'bass' },
  38: { name: 'Synth Bass 1', family: 'Bass', clef: 'bass' },
  39: { name: 'Synth Bass 2', family: 'Bass', clef: 'bass' },
  
  // Strings (40-47)
  40: { name: 'Violin', family: 'Strings', clef: 'treble' },
  41: { name: 'Viola', family: 'Strings', clef: 'alto' },
  42: { name: 'Cello', family: 'Strings', clef: 'bass' },
  43: { name: 'Contrabass', family: 'Strings', clef: 'bass' },
  44: { name: 'Tremolo Strings', family: 'Strings', clef: 'treble' },
  45: { name: 'Pizzicato Strings', family: 'Strings', clef: 'treble' },
  46: { name: 'Orchestral Harp', family: 'Strings', clef: 'treble' },
  47: { name: 'Timpani', family: 'Strings', clef: 'bass' },
  
  // Ensemble (48-55)
  48: { name: 'String Ensemble 1', family: 'Ensemble', clef: 'treble' },
  49: { name: 'String Ensemble 2', family: 'Ensemble', clef: 'treble' },
  50: { name: 'Synth Strings 1', family: 'Ensemble', clef: 'treble' },
  51: { name: 'Synth Strings 2', family: 'Ensemble', clef: 'treble' },
  52: { name: 'Choir Aahs', family: 'Ensemble', clef: 'treble' },
  53: { name: 'Voice Oohs', family: 'Ensemble', clef: 'treble' },
  54: { name: 'Synth Choir', family: 'Ensemble', clef: 'treble' },
  55: { name: 'Orchestra Hit', family: 'Ensemble', clef: 'treble' },
  
  // Brass (56-63)
  56: { name: 'Trumpet', family: 'Brass', clef: 'treble' },
  57: { name: 'Trombone', family: 'Brass', clef: 'bass' },
  58: { name: 'Tuba', family: 'Brass', clef: 'bass' },
  59: { name: 'Muted Trumpet', family: 'Brass', clef: 'treble' },
  60: { name: 'French Horn', family: 'Brass', clef: 'treble' },
  61: { name: 'Brass Section', family: 'Brass', clef: 'treble' },
  62: { name: 'Synth Brass 1', family: 'Brass', clef: 'treble' },
  63: { name: 'Synth Brass 2', family: 'Brass', clef: 'treble' },
  
  // Reed (64-71)
  64: { name: 'Soprano Sax', family: 'Reed', clef: 'treble' },
  65: { name: 'Alto Sax', family: 'Reed', clef: 'treble' },
  66: { name: 'Tenor Sax', family: 'Reed', clef: 'treble' },
  67: { name: 'Baritone Sax', family: 'Reed', clef: 'treble' },
  68: { name: 'Oboe', family: 'Reed', clef: 'treble' },
  69: { name: 'English Horn', family: 'Reed', clef: 'treble' },
  70: { name: 'Bassoon', family: 'Reed', clef: 'bass' },
  71: { name: 'Clarinet', family: 'Reed', clef: 'treble' },
  
  // Pipe (72-79)
  72: { name: 'Piccolo', family: 'Pipe', clef: 'treble' },
  73: { name: 'Flute', family: 'Pipe', clef: 'treble' },
  74: { name: 'Recorder', family: 'Pipe', clef: 'treble' },
  75: { name: 'Pan Flute', family: 'Pipe', clef: 'treble' },
  76: { name: 'Blown Bottle', family: 'Pipe', clef: 'treble' },
  77: { name: 'Shakuhachi', family: 'Pipe', clef: 'treble' },
  78: { name: 'Whistle', family: 'Pipe', clef: 'treble' },
  79: { name: 'Ocarina', family: 'Pipe', clef: 'treble' },
  
  // Synth Lead (80-87)
  80: { name: 'Lead 1 (square)', family: 'Synth Lead', clef: 'treble' },
  81: { name: 'Lead 2 (sawtooth)', family: 'Synth Lead', clef: 'treble' },
  82: { name: 'Lead 3 (calliope)', family: 'Synth Lead', clef: 'treble' },
  83: { name: 'Lead 4 (chiff)', family: 'Synth Lead', clef: 'treble' },
  84: { name: 'Lead 5 (charang)', family: 'Synth Lead', clef: 'treble' },
  85: { name: 'Lead 6 (voice)', family: 'Synth Lead', clef: 'treble' },
  86: { name: 'Lead 7 (fifths)', family: 'Synth Lead', clef: 'treble' },
  87: { name: 'Lead 8 (bass + lead)', family: 'Synth Lead', clef: 'treble' },
  
  // Synth Pad (88-95)
  88: { name: 'Pad 1 (new age)', family: 'Synth Pad', clef: 'treble' },
  89: { name: 'Pad 2 (warm)', family: 'Synth Pad', clef: 'treble' },
  90: { name: 'Pad 3 (polysynth)', family: 'Synth Pad', clef: 'treble' },
  91: { name: 'Pad 4 (choir)', family: 'Synth Pad', clef: 'treble' },
  92: { name: 'Pad 5 (bowed)', family: 'Synth Pad', clef: 'treble' },
  93: { name: 'Pad 6 (metallic)', family: 'Synth Pad', clef: 'treble' },
  94: { name: 'Pad 7 (halo)', family: 'Synth Pad', clef: 'treble' },
  95: { name: 'Pad 8 (sweep)', family: 'Synth Pad', clef: 'treble' },
  
  // Synth Effects (96-103)
  96: { name: 'FX 1 (rain)', family: 'Synth Effects', clef: 'treble' },
  97: { name: 'FX 2 (soundtrack)', family: 'Synth Effects', clef: 'treble' },
  98: { name: 'FX 3 (crystal)', family: 'Synth Effects', clef: 'treble' },
  99: { name: 'FX 4 (atmosphere)', family: 'Synth Effects', clef: 'treble' },
  100: { name: 'FX 5 (brightness)', family: 'Synth Effects', clef: 'treble' },
  101: { name: 'FX 6 (goblins)', family: 'Synth Effects', clef: 'treble' },
  102: { name: 'FX 7 (echoes)', family: 'Synth Effects', clef: 'treble' },
  103: { name: 'FX 8 (sci-fi)', family: 'Synth Effects', clef: 'treble' },
  
  // Ethnic (104-111)
  104: { name: 'Sitar', family: 'Ethnic', clef: 'treble' },
  105: { name: 'Banjo', family: 'Ethnic', clef: 'treble' },
  106: { name: 'Shamisen', family: 'Ethnic', clef: 'treble' },
  107: { name: 'Koto', family: 'Ethnic', clef: 'treble' },
  108: { name: 'Kalimba', family: 'Ethnic', clef: 'treble' },
  109: { name: 'Bagpipe', family: 'Ethnic', clef: 'treble' },
  110: { name: 'Fiddle', family: 'Ethnic', clef: 'treble' },
  111: { name: 'Shanai', family: 'Ethnic', clef: 'treble' },
  
  // Percussive (112-119)
  112: { name: 'Tinkle Bell', family: 'Percussive', clef: 'treble' },
  113: { name: 'Agogo', family: 'Percussive', clef: 'treble' },
  114: { name: 'Steel Drums', family: 'Percussive', clef: 'treble' },
  115: { name: 'Woodblock', family: 'Percussive', clef: 'percussion' },
  116: { name: 'Taiko Drum', family: 'Percussive', clef: 'percussion' },
  117: { name: 'Melodic Tom', family: 'Percussive', clef: 'percussion' },
  118: { name: 'Synth Drum', family: 'Percussive', clef: 'percussion' },
  119: { name: 'Reverse Cymbal', family: 'Percussive', clef: 'percussion' },
  
  // Sound Effects (120-127)
  120: { name: 'Guitar Fret Noise', family: 'Sound Effects', clef: 'treble' },
  121: { name: 'Breath Noise', family: 'Sound Effects', clef: 'treble' },
  122: { name: 'Seashore', family: 'Sound Effects', clef: 'treble' },
  123: { name: 'Bird Tweet', family: 'Sound Effects', clef: 'treble' },
  124: { name: 'Telephone Ring', family: 'Sound Effects', clef: 'treble' },
  125: { name: 'Helicopter', family: 'Sound Effects', clef: 'treble' },
  126: { name: 'Applause', family: 'Sound Effects', clef: 'treble' },
  127: { name: 'Gunshot', family: 'Sound Effects', clef: 'treble' },
};

/**
 * Instrument families that should use grand staff (piano-like layout)
 */
const GRAND_STAFF_FAMILIES = new Set(['Piano', 'Organ']);

/**
 * Get instrument information from MIDI program number
 */
function getInstrumentInfo(programNumber: number): { name: string; family: string; clef: 'treble' | 'bass' | 'alto' | 'percussion' } {
  const info = GM_INSTRUMENTS[programNumber];
  if (info) {
    return info;
  }
  // Fallback for unknown programs
  return { name: `Program ${programNumber}`, family: 'Unknown', clef: 'treble' };
}

/**
 * Check if instrument family should use grand staff
 */
function shouldUseGrandStaff(family: string): boolean {
  return GRAND_STAFF_FAMILIES.has(family);
}

/**
 * Detect if track is on MIDI channel 10 (drums/percussion)
 */
function isDrumTrack(track: Track): boolean {
  // MIDI channel 10 (0-indexed as 9) is always drums in General MIDI
  return track.channel === 9;
}

// ============================================================================
// General MIDI Drum Map (MIDI Note to Drum Instrument)
// ============================================================================

/**
 * General MIDI Drum Map - defines percussion instruments and their notation
 * MIDI notes 27-87 are used for drums on channel 10
 */
const GM_DRUM_MAP: Record<number, { 
  name: string; 
  displayStep: string; 
  displayOctave: number;
  notehead?: 'x' | 'circle-x' | 'diamond' | 'triangle' | 'slash' | 'normal';
}> = {
  // Bass Drums
  35: { name: 'Acoustic Bass Drum', displayStep: 'F', displayOctave: 4, notehead: 'normal' },
  36: { name: 'Bass Drum 1', displayStep: 'F', displayOctave: 4, notehead: 'normal' },
  
  // Snares
  38: { name: 'Acoustic Snare', displayStep: 'C', displayOctave: 5, notehead: 'normal' },
  40: { name: 'Electric Snare', displayStep: 'C', displayOctave: 5, notehead: 'normal' },
  37: { name: 'Side Stick', displayStep: 'C', displayOctave: 5, notehead: 'x' },
  
  // Toms
  41: { name: 'Low Floor Tom', displayStep: 'G', displayOctave: 4, notehead: 'normal' },
  43: { name: 'High Floor Tom', displayStep: 'A', displayOctave: 4, notehead: 'normal' },
  45: { name: 'Low Tom', displayStep: 'B', displayOctave: 4, notehead: 'normal' },
  47: { name: 'Low-Mid Tom', displayStep: 'D', displayOctave: 5, notehead: 'normal' },
  48: { name: 'Hi-Mid Tom', displayStep: 'E', displayOctave: 5, notehead: 'normal' },
  50: { name: 'High Tom', displayStep: 'F', displayOctave: 5, notehead: 'normal' },
  
  // Hi-Hats
  42: { name: 'Closed Hi-Hat', displayStep: 'G', displayOctave: 5, notehead: 'x' },
  44: { name: 'Pedal Hi-Hat', displayStep: 'G', displayOctave: 5, notehead: 'x' },
  46: { name: 'Open Hi-Hat', displayStep: 'G', displayOctave: 5, notehead: 'circle-x' },
  
  // Cymbals
  49: { name: 'Crash Cymbal 1', displayStep: 'A', displayOctave: 5, notehead: 'x' },
  51: { name: 'Ride Cymbal 1', displayStep: 'D', displayOctave: 6, notehead: 'x' },
  52: { name: 'Chinese Cymbal', displayStep: 'E', displayOctave: 6, notehead: 'diamond' },
  53: { name: 'Ride Bell', displayStep: 'D', displayOctave: 6, notehead: 'diamond' },
  55: { name: 'Splash Cymbal', displayStep: 'B', displayOctave: 5, notehead: 'x' },
  57: { name: 'Crash Cymbal 2', displayStep: 'C', displayOctave: 6, notehead: 'x' },
  59: { name: 'Ride Cymbal 2', displayStep: 'E', displayOctave: 6, notehead: 'x' },
  
  // Hand Percussion
  39: { name: 'Hand Clap', displayStep: 'E', displayOctave: 5, notehead: 'triangle' },
  54: { name: 'Tambourine', displayStep: 'A', displayOctave: 5, notehead: 'x' },
  56: { name: 'Cowbell', displayStep: 'B', displayOctave: 5, notehead: 'triangle' },
  58: { name: 'Vibraslap', displayStep: 'D', displayOctave: 6, notehead: 'diamond' },
  
  // Latin Percussion
  60: { name: 'Hi Bongo', displayStep: 'D', displayOctave: 5, notehead: 'normal' },
  61: { name: 'Low Bongo', displayStep: 'C', displayOctave: 5, notehead: 'normal' },
  62: { name: 'Mute Hi Conga', displayStep: 'E', displayOctave: 5, notehead: 'normal' },
  63: { name: 'Open Hi Conga', displayStep: 'E', displayOctave: 5, notehead: 'circle-x' },
  64: { name: 'Low Conga', displayStep: 'D', displayOctave: 5, notehead: 'normal' },
  65: { name: 'High Timbale', displayStep: 'F', displayOctave: 5, notehead: 'normal' },
  66: { name: 'Low Timbale', displayStep: 'E', displayOctave: 5, notehead: 'normal' },
  67: { name: 'High Agogo', displayStep: 'G', displayOctave: 5, notehead: 'triangle' },
  68: { name: 'Low Agogo', displayStep: 'F', displayOctave: 5, notehead: 'triangle' },
  
  // Other
  69: { name: 'Cabasa', displayStep: 'A', displayOctave: 5, notehead: 'slash' },
  70: { name: 'Maracas', displayStep: 'B', displayOctave: 5, notehead: 'slash' },
  71: { name: 'Short Whistle', displayStep: 'C', displayOctave: 6, notehead: 'triangle' },
  72: { name: 'Long Whistle', displayStep: 'C', displayOctave: 6, notehead: 'triangle' },
  73: { name: 'Short Guiro', displayStep: 'D', displayOctave: 6, notehead: 'slash' },
  74: { name: 'Long Guiro', displayStep: 'D', displayOctave: 6, notehead: 'slash' },
  75: { name: 'Claves', displayStep: 'E', displayOctave: 6, notehead: 'triangle' },
  76: { name: 'Hi Wood Block', displayStep: 'F', displayOctave: 6, notehead: 'triangle' },
  77: { name: 'Low Wood Block', displayStep: 'E', displayOctave: 6, notehead: 'triangle' },
  78: { name: 'Mute Cuica', displayStep: 'G', displayOctave: 6, notehead: 'triangle' },
  79: { name: 'Open Cuica', displayStep: 'G', displayOctave: 6, notehead: 'circle-x' },
  80: { name: 'Mute Triangle', displayStep: 'A', displayOctave: 6, notehead: 'diamond' },
  81: { name: 'Open Triangle', displayStep: 'A', displayOctave: 6, notehead: 'diamond' },
};

/**
 * Get drum information from MIDI note number
 */
function getDrumInfo(midiNote: number) {
  const info = GM_DRUM_MAP[midiNote];
  if (info) {
    return info;
  }
  // Fallback for unmapped drum notes - use middle line of staff
  return {
    name: `Drum ${midiNote}`,
    displayStep: 'B',
    displayOctave: 4,
    notehead: 'normal' as const
  };
}

interface QuantizedNote {
  midi: number;
  time: number;
  duration: number;
  velocity: number;
  originalTicks: number;
  originalDuration: number;
}

interface NoteEvent {
  notes: QuantizedNote[];
  time: number;
  duration: number;
  voice?: number; // Add voice assignment
}

interface VoicedNoteEvent extends NoteEvent {
  voice: number;
}

/**
 * Detect if a track is piano/keyboard music requiring grand staff (2 staves)
 * Primarily uses MIDI program number, with pitch range analysis as fallback
 */
function isPianoTrack(notes: QuantizedNote[], track: Track): boolean {
  if (notes.length < 10) return false;
  
  // First check: Is this a GM instrument that uses grand staff?
  const programNumber = track.instrument.number ?? 0;
  const instrumentInfo = getInstrumentInfo(programNumber);
  
  console.log(`Instrument detection: Program ${programNumber} = ${instrumentInfo.name} (${instrumentInfo.family})`);
  
  // If it's a Piano or Organ family instrument, it should use grand staff
  if (shouldUseGrandStaff(instrumentInfo.family)) {
    console.log(`✓ Detected ${instrumentInfo.family} from GM program number - will use grand staff`);
    return true;
  }
  
  // Only use heuristics if program is 0 (might be unset) AND characteristics are very piano-like
  if (programNumber === 0 || instrumentInfo.family === 'Unknown') {
    const pitches = notes.map(n => n.midi);
    const minPitch = Math.min(...pitches);
    const maxPitch = Math.max(...pitches);
    const range = maxPitch - minPitch;
    
    console.log(`Piano detection heuristics (fallback): minPitch=${minPitch}, maxPitch=${maxPitch}, range=${range} semitones`);
    
    // Very strict criteria - must have ALL of these characteristics
    const crossesMiddleC = minPitch < 60 && maxPitch >= 60;
    const veryWideRange = range >= 24; // At least 2 octaves
    const inPianoRange = minPitch >= 28 && maxPitch <= 103; // Full piano range A0-G8
    const hasPolyphony = notes.some((n, i, arr) => {
      // Check if there are simultaneous notes (chords)
      return arr.some((other, j) => i !== j && Math.abs(n.time - other.time) < 0.01);
    });
    
    const isPianoByHeuristics = crossesMiddleC && veryWideRange && inPianoRange && hasPolyphony;
    
    console.log(`Piano heuristics result: ${isPianoByHeuristics} (crosses middle C: ${crossesMiddleC}, wide range: ${veryWideRange}, polyphonic: ${hasPolyphony})`);
    
    return isPianoByHeuristics;
  }
  
  // Not a piano - trust the GM program number
  console.log(`✗ Not a piano instrument (${instrumentInfo.family})`);
  return false;
}

/**
 * Convert MIDI file content to MusicXML string with professional-grade conversion
 */
export async function convertMidiToMusicXML(midiArrayBuffer: ArrayBuffer): Promise<string> {
  const midi = new Midi(midiArrayBuffer);
  
  console.log('MIDI file info:', {
    name: midi.name,
    duration: midi.duration,
    durationTicks: midi.durationTicks,
    header: midi.header,
    tracks: midi.tracks.length
  });
  
  const tempo = midi.header.tempos[0]?.bpm || 120;
  const timeSignature = midi.header.timeSignatures[0];
  const numerator = timeSignature?.timeSignature[0] || 4;
  const denominator = timeSignature?.timeSignature[1] || 4;
  
  console.log('Using tempo:', tempo, 'Time signature:', `${numerator}/${denominator}`);
  
  const divisions = 480;
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${escapeXml(midi.name || 'MIDI Conversion')}</work-title>
  </work>
  <identification>
    <encoding>
      <software>MusicAI MIDI Converter Pro</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
`;

  const activeTracks = midi.tracks.filter(track => track.notes.length > 0);
  
  console.log('Active tracks:', activeTracks.length);
  activeTracks.forEach((track, index) => {
    const notesByChannel = new Map<number, number>();
    track.notes.forEach(() => {
      const channel = track.channel || 0;
      notesByChannel.set(channel, (notesByChannel.get(channel) || 0) + 1);
    });
    
    // Get GM instrument info
    const programNumber = track.instrument.number ?? 0;
    const instrumentInfo = getInstrumentInfo(programNumber);
    const isDrums = isDrumTrack(track);
    
    console.log(`Track ${index}:`, {
      name: track.name,
      notes: track.notes.length,
      instrument: track.instrument.name,
      gmInstrument: instrumentInfo.name,
      family: instrumentInfo.family,
      defaultClef: instrumentInfo.clef,
      channel: track.channel,
      isDrums: isDrums,
      channelDistribution: Array.from(notesByChannel.entries())
    });
  });
  
  if (activeTracks.length === 0) {
    throw new Error('No tracks with notes found in MIDI file');
  }
  
  // Split tracks by MIDI channel if a single track contains multiple instruments
  const separatedTracks: Track[] = [];
  activeTracks.forEach(track => {
    const notesByChannel = new Map<number, typeof track.notes>();
    
    track.notes.forEach(note => {
      const channel = track.channel ?? 0;
      if (!notesByChannel.has(channel)) {
        notesByChannel.set(channel, []);
      }
      notesByChannel.get(channel)!.push(note);
    });
    
    if (notesByChannel.size === 1) {
      separatedTracks.push(track);
    } else {
      console.warn(`Track "${track.name}" has notes on ${notesByChannel.size} different channels - keeping as single track`);
      separatedTracks.push(track);
    }
  });
  
  console.log(`Final track count after separation: ${separatedTracks.length}`);
  
  const partDefinitions: Array<{ id: string; name: string; track: Track }> = [];
  let prePartCounter = 1;
  
  separatedTracks.forEach((track) => {
    // Handle drum tracks - they get single part with percussion notation
    if (isDrumTrack(track)) {
      console.log(`✓ Drum track detected: "${track.name || 'Drums'}" (Channel 10) - will use percussion notation`);
      partDefinitions.push({
        id: `P${prePartCounter}`,
        name: track.name || 'Drums',
        track: track
      });
      prePartCounter++;
      return;
    }
    
    // Quick analysis to see if we'll split this track
    const quantizedNotes = quantizeNotes(track, divisions, tempo);
    
    // Check if this is piano music FIRST - piano should NOT be split into multiple parts
    const isPiano = isPianoTrack(quantizedNotes, track);
    
    if (isPiano) {
      // Piano/keyboard music - keep as single part with grand staff
      const programNumber = track.instrument.number ?? 0;
      const instrumentInfo = getInstrumentInfo(programNumber);
      const instrumentName = instrumentInfo.name;
      
      console.log(`Track "${track.name || 'Unnamed'}" detected as GRAND STAFF instrument (${instrumentName}) - NOT splitting into parts`);
      partDefinitions.push({
        id: `P${prePartCounter}`,
        name: track.name || instrumentName,
        track: track
      });
      prePartCounter++;
      return; // Skip voice splitting logic
    }
    
    // Not piano - check for voice splitting
    const noteEvents = groupNotesIntoChords(quantizedNotes, divisions);
    const voicedEvents = separateIntoVoices(noteEvents);
    
    const voiceNumbers = new Set(voicedEvents.map(e => e.voice));
    const voiceCount = voiceNumbers.size;
    
    const eventsPerVoice = new Map<number, number>();
    voicedEvents.forEach(e => {
      eventsPerVoice.set(e.voice, (eventsPerVoice.get(e.voice) || 0) + 1);
    });
    
    const minEventsForSeparation = voicedEvents.length * 0.15;
    const significantVoices = Array.from(eventsPerVoice.entries())
      .filter(([_, count]) => count >= minEventsForSeparation)
      .map(([voice, _]) => voice);
    
    if (voiceCount > 1 && significantVoices.length > 1 && voicedEvents.length >= 10) {
      // Will be split
      significantVoices.forEach((_, idx) => {
        const voiceName = idx === 0 ? 'Melody' : idx === 1 ? 'Accompaniment' : `Voice ${idx + 1}`;
        partDefinitions.push({
          id: `P${prePartCounter}`,
          name: `${track.name || 'Part'} - ${voiceName}`,
          track
        });
        prePartCounter++;
      });
    } else {
      // Single part
      partDefinitions.push({
        id: `P${prePartCounter}`,
        name: track.name || `Part ${prePartCounter}`,
        track
      });
      prePartCounter++;
    }
  });
  
  console.log(`Will create ${partDefinitions.length} parts in total`);
  
  partDefinitions.forEach((partDef) => {
    // For drum tracks, use simple drum set naming
    if (isDrumTrack(partDef.track)) {
      xml += `    <score-part id="${partDef.id}">
      <part-name>${escapeXml(partDef.name)}</part-name>
      <score-instrument id="${partDef.id}-I1">
        <instrument-name>Drum Set</instrument-name>
      </score-instrument>
      <midi-instrument id="${partDef.id}-I1">
        <midi-channel>10</midi-channel>
        <midi-program>1</midi-program>
      </midi-instrument>
    </score-part>
`;
      return;
    }
    
    // Get proper instrument name from GM specification
    const programNumber = partDef.track.instrument.number ?? 0;
    const instrumentInfo = getInstrumentInfo(programNumber);
    const instrumentName = instrumentInfo.name;
    
    // Use GM instrument name if track name is generic or missing
    const displayName = partDef.name.match(/^(Part \d+|Track \d+|Unnamed)/) 
      ? instrumentName 
      : partDef.name;
    
    xml += `    <score-part id="${partDef.id}">
      <part-name>${escapeXml(displayName)}</part-name>
      <score-instrument id="${partDef.id}-I1">
        <instrument-name>${escapeXml(instrumentName)}</instrument-name>
      </score-instrument>
      <midi-instrument id="${partDef.id}-I1">
        <midi-channel>${(partDef.track.channel || 0) + 1}</midi-channel>
        <midi-program>${programNumber + 1}</midi-program>
      </midi-instrument>
    </score-part>
`;
  });

  xml += `  </part-list>
`;

  // Process each track - use percussion notation for drums, grand staff for piano, voice splitting for others
  let partCounter = 1;
  separatedTracks.forEach((track) => {
    // Handle drum tracks with percussion notation
    if (isDrumTrack(track)) {
      console.log(`Converting drum track "${track.name || 'Drums'}" with percussion notation`);
      const partXml = convertDrumTrackToPart(track, `P${partCounter}`, divisions, numerator, denominator, tempo);
      xml += partXml;
      partCounter++;
      return;
    }
    
    // Check if this is a piano track
    const quantizedNotesForCheck = quantizeNotes(track, divisions, tempo);
    const isPiano = isPianoTrack(quantizedNotesForCheck, track);
    
    if (isPiano) {
      console.log(`Converting track "${track.name || 'Unnamed'}" as PIANO with grand staff`);
      const partXml = convertTrackToPart(track, `P${partCounter}`, divisions, numerator, denominator, tempo);
      xml += partXml;
      partCounter++;
    } else {
      const partXmls = convertTrackToPartWithVoiceSplitting(track, partCounter, divisions, numerator, denominator, tempo);
      partXmls.forEach(partXml => xml += partXml);
      partCounter += partXmls.length;
    }
  });

  xml += `</score-partwise>`;

  // Debug: Log first 3000 characters of generated XML to verify structure
  console.log('=== GENERATED MUSICXML (first 3000 chars) ===');
  console.log(xml.substring(0, 3000));
  console.log('=== END MUSICXML PREVIEW ===');

  return xml;
}

/**
 * Convert a drum track to MusicXML part with unpitched percussion notation
 */
function convertDrumTrackToPart(
  track: Track,
  partId: string,
  divisions: number,
  numerator: number,
  denominator: number,
  tempo: number
): string {
  console.log(`\n=== Converting drum track ${partId} ===`);
  console.log('Drum notes:', track.notes.length);
  
  let xml = `  <part id="${partId}">
`;

  const quantizedNotes = quantizeNotes(track, divisions, tempo);
  console.log(`Quantized ${quantizedNotes.length} drum hits`);
  
  const noteEvents = groupNotesIntoChords(quantizedNotes, divisions);
  const voicedEvents = separateIntoVoices(noteEvents);
  
  const measureDuration = (4 / denominator) * numerator * divisions;
  
  const lastEventTime = voicedEvents.length > 0 
    ? Math.max(...voicedEvents.map(e => e.time + e.duration))
    : measureDuration;
  const totalMeasures = Math.max(1, Math.ceil(lastEventTime / measureDuration));
  
  console.log(`Drum part: ${totalMeasures} measures`);

  for (let measureNum = 1; measureNum <= totalMeasures; measureNum++) {
    const measureStartTime = (measureNum - 1) * measureDuration;
    const measureEndTime = measureNum * measureDuration;

    xml += `    <measure number="${measureNum}">
`;

    // Add attributes in first measure
    if (measureNum === 1) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>${numerator}</beats>
          <beat-type>${denominator}</beat-type>
        </time>
        <clef>
          <sign>percussion</sign>
          <line>2</line>
        </clef>
      </attributes>
`;
    }

    // Get events for this measure
    const measureEvents = voicedEvents.filter(
      e => e.time >= measureStartTime && e.time < measureEndTime
    );

    // Group by voice and time
    const eventsByVoice = new Map<number, VoicedNoteEvent[]>();
    measureEvents.forEach(event => {
      if (!eventsByVoice.has(event.voice)) {
        eventsByVoice.set(event.voice, []);
      }
      eventsByVoice.get(event.voice)!.push(event);
    });

    const voices = Array.from(eventsByVoice.keys()).sort();

    voices.forEach((voiceNum) => {
      const voiceEvents = eventsByVoice.get(voiceNum)!.sort((a, b) => a.time - b.time);
      let currentTime = measureStartTime;

      for (let i = 0; i < voiceEvents.length; i++) {
        const event = voiceEvents[i];

        // Add rest if there's a gap
        if (event.time > currentTime) {
          const restDuration = Math.round(event.time - currentTime);
          xml += addRests(restDuration, divisions, voiceNum);
          currentTime += restDuration;
        }

        // Add the drum hit(s) - use unpitched notation
        xml += convertDrumEventToXML(event, voiceNum);
        currentTime = event.time + event.duration;
      }

      // Fill measure with rest if needed
      if (currentTime < measureEndTime) {
        const restDuration = Math.round(measureEndTime - currentTime);
        xml += addRests(restDuration, divisions, voiceNum);
      }
    });

    xml += `    </measure>
`;
  }

  xml += `  </part>
`;
  return xml;
}

/**
 * Convert a drum event (chord of drum hits) to MusicXML unpitched notation
 */
function convertDrumEventToXML(event: VoicedNoteEvent, voice: number): string {
  let xml = '';
  
  const sortedNotes = [...event.notes].sort((a, b) => b.midi - a.midi); // High to low
  
  sortedNotes.forEach((note, noteIndex) => {
    const drumInfo = getDrumInfo(note.midi);
    const { noteType, dots } = getDurationComponents(note.duration, 480); // Use standard divisions
    
    // First note in chord doesn't get <chord/>, others do
    const isChord = noteIndex > 0;
    
    xml += `      <note>
`;
    if (isChord) {
      xml += `        <chord/>
`;
    }
    
    // Use unpitched notation with display-step and display-octave
    xml += `        <unpitched>
          <display-step>${drumInfo.displayStep}</display-step>
          <display-octave>${drumInfo.displayOctave}</display-octave>
        </unpitched>
        <duration>${note.duration}</duration>
        <voice>${voice}</voice>
        <type>${noteType}</type>
`;
    
    // Add dots if present
    for (let d = 0; d < dots; d++) {
      xml += `        <dot/>
`;
    }
    
    // Add notehead if not default
    if (drumInfo.notehead && drumInfo.notehead !== 'normal') {
      xml += `        <notehead>${drumInfo.notehead}</notehead>
`;
    }
    
    // Add stem direction (up for high drums, down for low)
    const stemDirection = drumInfo.displayOctave >= 5 ? 'up' : 'down';
    xml += `        <stem>${stemDirection}</stem>
`;
    
    xml += `      </note>
`;
  });
  
  return xml;
}

/**
 * Convert a track to one or more parts, splitting by voice if needed
 */
function convertTrackToPartWithVoiceSplitting(
  track: Track,
  startPartNum: number,
  divisions: number,
  numerator: number,
  denominator: number,
  tempo: number
): string[] {
  console.log(`\n=== Analyzing track for part splitting (starting at P${startPartNum}) ===`);
  
  // Quantize and analyze voices
  const quantizedNotes = quantizeNotes(track, divisions, tempo);
  const noteEvents = groupNotesIntoChords(quantizedNotes, divisions);
  const voicedEvents = separateIntoVoices(noteEvents);
  
  // Check how many distinct voices we have
  const voiceNumbers = new Set(voicedEvents.map(e => e.voice));
  const voiceCount = voiceNumbers.size;
  
  console.log(`Detected ${voiceCount} distinct voices`);
  
  // If only one voice or very few events, keep as single part
  if (voiceCount <= 1 || voicedEvents.length < 10) {
    console.log('Keeping as single part');
    const partId = `P${startPartNum}`;
    return [convertTrackToPart(track, partId, divisions, numerator, denominator, tempo)];
  }
  
  // Check if voices are substantially different (worthy of separate parts)
  const eventsPerVoice = new Map<number, number>();
  voicedEvents.forEach(e => {
    eventsPerVoice.set(e.voice, (eventsPerVoice.get(e.voice) || 0) + 1);
  });
  
  const minEventsForSeparation = voicedEvents.length * 0.15; // At least 15% of events
  const significantVoices = Array.from(eventsPerVoice.entries())
    .filter(([_, count]) => count >= minEventsForSeparation)
    .map(([voice, _]) => voice);
  
  console.log('Significant voices:', significantVoices, 'with event counts:', Array.from(eventsPerVoice.entries()));
  
  if (significantVoices.length <= 1) {
    console.log('Not enough significant voices for splitting');
    const partId = `P${startPartNum}`;
    return [convertTrackToPart(track, partId, divisions, numerator, denominator, tempo)];
  }
  
  // Split into separate parts
  console.log(`Splitting into ${significantVoices.length} separate parts`);
  
  const parts: string[] = [];
  significantVoices.forEach((voiceNum, idx) => {
    const partId = `P${startPartNum + idx}`;
    const voiceName = idx === 0 ? 'Melody' : idx === 1 ? 'Accompaniment' : `Voice ${idx + 1}`;
    
    // Filter events for this voice
    const voiceOnlyEvents = voicedEvents.filter(e => e.voice === voiceNum);
    
    console.log(`Creating part ${partId} (${voiceName}) with ${voiceOnlyEvents.length} events`);
    
    const partXml = convertVoiceEventsToPart(
      voiceOnlyEvents,
      partId,
      `${track.name || 'Part'} - ${voiceName}`,
      track,
      divisions,
      numerator,
      denominator,
      tempo
    );
    
    parts.push(partXml);
  });
  
  return parts;
}

/**
 * Convert filtered voice events to a MusicXML part
 */
function convertVoiceEventsToPart(
  voicedEvents: VoicedNoteEvent[],
  partId: string,
  _partName: string,
  originalTrack: Track,
  divisions: number,
  numerator: number,
  denominator: number,
  tempo: number
): string {
  console.log(`\n=== Converting voice events to part ${partId} ===`);
  console.log(`Events: ${voicedEvents.length}`);
  
  let xml = `  <part id="${partId}">
`;

  const notesForKeyDetection = voicedEvents.flatMap(e => e.notes);
  const keyFifths = detectKey(notesForKeyDetection);
  
  const clef = determineClef(notesForKeyDetection, originalTrack);
  
  const measureDuration = (4 / denominator) * numerator * divisions;
  
  const lastEventTime = voicedEvents.length > 0 
    ? Math.max(...voicedEvents.map(e => e.time + e.duration))
    : measureDuration;
  const totalMeasures = Math.max(1, Math.ceil(lastEventTime / measureDuration));
  
  console.log(`Part ${partId}: ${totalMeasures} measures`);

  for (let measureNum = 1; measureNum <= totalMeasures; measureNum++) {
    const measureStartTime = (measureNum - 1) * measureDuration;
    const measureEndTime = measureNum * measureDuration;

    xml += `    <measure number="${measureNum}">
`;

    // Add attributes in first measure
    if (measureNum === 1) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${keyFifths}</fifths>
        </key>
        <time>
          <beats>${numerator}</beats>
          <beat-type>${denominator}</beat-type>
        </time>
        <clef>
          <sign>${clef.sign}</sign>
          <line>${clef.line}</line>
        </clef>
      </attributes>
`;
      // Add tempo marking
      xml += `      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${Math.round(tempo)}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${tempo}"/>
      </direction>
`;
    }

    // Get events in this measure
    const measureEvents = voicedEvents.filter(event => {
      return event.time >= measureStartTime && event.time < measureEndTime;
    });

    if (measureEvents.length === 0) {
      // Add a whole measure rest
      const restDuration = Math.round(measureDuration);
      xml += `      <note>
        <rest measure="yes"/>
        <duration>${restDuration}</duration>
        <voice>1</voice>
      </note>
`;
    } else {
      let currentTime = measureStartTime;
      
      for (const event of measureEvents) {
        // Add rest if there's a gap
        if (event.time > currentTime) {
          const restDuration = Math.round(event.time - currentTime);
          xml += addRests(restDuration, divisions, 1);
          currentTime = event.time;
        }

        // Add note(s) - could be a chord - force voice to 1 since this is a separate part now
        const singleVoiceEvent = { ...event, voice: 1 };
        xml += addNoteEvent(singleVoiceEvent, divisions, keyFifths);
        currentTime = event.time + event.duration;
      }

      // Fill remaining measure with rests if needed
      if (currentTime < measureEndTime) {
        const restDuration = Math.round(measureEndTime - currentTime);
        xml += addRests(restDuration, divisions, 1);
      }
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
`;
  return xml;
}

/**
 * Convert a MIDI track to a MusicXML part with professional quantization
 * For piano music, creates a two-staff grand staff system
 */
function convertTrackToPart(
  track: Track,
  partId: string,
  divisions: number,
  numerator: number,
  denominator: number,
  tempo: number
): string {
  console.log(`\n=== Converting track ${partId} ===`);
  console.log('Track notes:', track.notes.length);
  
  if (track.notes.length > 0) {
    const times = track.notes.map(n => n.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    console.log(`Time range: ${minTime.toFixed(2)}s to ${maxTime.toFixed(2)}s`);
    
    // Check for simultaneity
    const uniqueTimes = new Set(times.map(t => Math.round(t * 100) / 100));
    const simultaneousNotes = track.notes.length - uniqueTimes.size;
    console.log(`Simultaneous notes detected: ${simultaneousNotes}`);
  }
  
  let xml = `  <part id="${partId}">
`;

  const quantizedNotes = quantizeNotes(track, divisions, tempo);
  
  const needsGrandStaff = isPianoTrack(quantizedNotes, track);
  console.log(`Track ${partId}: Grand staff needed: ${needsGrandStaff}`);
  
  const keyFifths = detectKey(quantizedNotes);
  const clef = determineClef(quantizedNotes, track);
  const noteEvents = groupNotesIntoChords(quantizedNotes, divisions);
  
  let voicedEvents: VoicedNoteEvent[];
  if (needsGrandStaff) {
    // Split events that contain both melody and accompaniment notes
    // Melody: single high notes (typically C4 and above, moving melodically)
    // Accompaniment: chords or lower notes
    const melodyEvents: NoteEvent[] = [];
    const accompEvents: NoteEvent[] = [];
    
    noteEvents.forEach(event => {
      if (event.notes.length === 1) {
        // Single note - check if it's melody or bass/accompaniment
        const note = event.notes[0];
        if (note.midi >= 60) {
          // C4 and above -> likely melody on treble staff
          melodyEvents.push(event);
        } else {
          // Below C4 -> bass line on bass staff
          accompEvents.push(event);
        }
      } else {
        // Multiple notes (chord) - almost always accompaniment
        // Exception: if it's a single high note with low notes, split them
        
        const highNotes = event.notes.filter(n => n.midi >= 60);
        const lowNotes = event.notes.filter(n => n.midi < 60);
        
        if (highNotes.length === 1 && lowNotes.length >= 1) {
          // Mixed: single high note + low notes = melody + accompaniment
          // Split them into separate events
          melodyEvents.push({
            notes: highNotes,
            time: event.time,
            duration: highNotes[0].duration
          });
          
          const accompDuration = Math.max(...lowNotes.map(n => n.duration));
          accompEvents.push({
            notes: lowNotes,
            time: event.time,
            duration: accompDuration
          });
        } else {
          // All other chords (pure high, pure low, or complex mix) -> accompaniment on bass staff
          // This includes chords like A3-A#3-D4 which should be in the bass clef
          accompEvents.push(event);
        }
      }
    });
    
    console.log(`Piano separation: ${melodyEvents.length} melody events (treble), ${accompEvents.length} accompaniment events (bass)`);
    
    // Extend accompaniment chord durations to fill gaps
    // In piano music, bass chords often sustain until the next chord
    const measureDuration = (4 / denominator) * numerator * divisions;
    for (let i = 0; i < accompEvents.length; i++) {
      const event = accompEvents[i];
      const nextEventTime = i < accompEvents.length - 1 
        ? accompEvents[i + 1].time 
        : event.time + measureDuration; // Use measure duration as fallback
      
      // If this is a chord (multiple notes) and there's a significant gap to the next event
      if (event.notes.length > 1) {
        const gapToNext = nextEventTime - event.time;
        const measureStart = Math.floor(event.time / measureDuration) * measureDuration;
        const measureEnd = measureStart + measureDuration;
        
        // If the chord doesn't reach the next chord or end of measure, extend it
        const targetDuration = Math.min(gapToNext, measureEnd - event.time);
        if (targetDuration > event.duration) {
          console.log(`Extending chord at time ${event.time} from ${event.duration} to ${targetDuration}`);
          event.duration = targetDuration;
        }
      }
    }
    
    // Assign to staves and voices:
    // Melody -> treble staff (staff 1), voice 1
    // Accompaniment -> bass staff (staff 2), voices 2-3
    const melodyVoiced: VoicedNoteEvent[] = melodyEvents.map(e => ({ ...e, voice: 1 }));
    const accompVoiced = separatePianoVoices(accompEvents, 2); // Bass staff with voice separation
    
    voicedEvents = [...melodyVoiced, ...accompVoiced].sort((a, b) => a.time - b.time);
  } else {
    // Single staff - use regular voice separation
    voicedEvents = separateIntoVoices(noteEvents);
  }
  
  console.log(`Track ${partId}: ${quantizedNotes.length} notes -> ${noteEvents.length} events`);
  
  if (voicedEvents.length === 0) {
    console.warn(`Track ${partId} has no note events after quantization!`);
  }
  
  // Calculate measures
  const measureDuration = (4 / denominator) * numerator * divisions;
  
  // Find the last note to determine total duration
  const lastEventTime = voicedEvents.length > 0 
    ? Math.max(...voicedEvents.map(e => e.time + e.duration))
    : measureDuration;
  const totalMeasures = Math.max(1, Math.ceil(lastEventTime / measureDuration));
  
  console.log(`Track ${partId}: ${totalMeasures} measures, measureDuration=${measureDuration}`);

  for (let measureNum = 1; measureNum <= totalMeasures; measureNum++) {
    const measureStartTime = (measureNum - 1) * measureDuration;
    const measureEndTime = measureNum * measureDuration;

    xml += `    <measure number="${measureNum}">
`;

    // Add attributes in first measure
    if (measureNum === 1) {
      xml += `      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${keyFifths}</fifths>
        </key>
        <time>
          <beats>${numerator}</beats>
          <beat-type>${denominator}</beat-type>
        </time>
`;
      
      if (needsGrandStaff) {
        // Piano: Two staves - treble (G) clef on top, bass (F) clef on bottom
        console.log('>>> CREATING GRAND STAFF - Two staves with G and F clefs');
        xml += `        <staves>2</staves>
        <clef number="1">
          <sign>G</sign>
          <line>2</line>
        </clef>
        <clef number="2">
          <sign>F</sign>
          <line>4</line>
        </clef>
`;
      } else {
        // Single staff
        xml += `        <clef>
          <sign>${clef.sign}</sign>
          <line>${clef.line}</line>
        </clef>
`;
      }
      
      xml += `      </attributes>
`;
      // Add tempo marking
      xml += `      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${Math.round(tempo)}</per-minute>
          </metronome>
        </direction-type>
        <sound tempo="${tempo}"/>
      </direction>
`;
    }

    // Get events in this measure
    const measureEvents = voicedEvents.filter(event => {
      return event.time >= measureStartTime && event.time < measureEndTime;
    });
    
    const notesInMeasure = measureEvents.reduce((sum, e) => sum + e.notes.length, 0);
    console.log(`Measure ${measureNum}: ${measureEvents.length} events, ${notesInMeasure} notes (time ${measureStartTime}-${measureEndTime})`);

    if (measureEvents.length === 0) {
      // Add a whole measure rest
      const restDuration = Math.round(measureDuration);
      xml += `      <note>
        <rest measure="yes"/>
        <duration>${restDuration}</duration>
        <voice>1</voice>
      </note>
`;
    } else {
      // Group events by voice and process each voice separately
      const eventsByVoice = new Map<number, VoicedNoteEvent[]>();
      measureEvents.forEach(event => {
        if (!eventsByVoice.has(event.voice)) {
          eventsByVoice.set(event.voice, []);
        }
        eventsByVoice.get(event.voice)!.push(event);
      });
      
      // Process each voice
      const voices = Array.from(eventsByVoice.keys()).sort((a, b) => a - b);
      
      for (let voiceIndex = 0; voiceIndex < voices.length; voiceIndex++) {
        const voiceNum = voices[voiceIndex];
        const voiceEvents = eventsByVoice.get(voiceNum)!;
        
        // Calculate beaming for eighth notes and smaller
        const beamInfo = calculateBeaming(voiceEvents, divisions, numerator, denominator, measureStartTime);
        
        let currentTime = measureStartTime;
        
        for (let i = 0; i < voiceEvents.length; i++) {
          const event = voiceEvents[i];
          
          // Add rest if there's a gap
          if (event.time > currentTime) {
            const restDuration = Math.round(event.time - currentTime);
            // For piano, determine staff based on voice (1 = treble, 2-3 = bass)
            const staffForRest = needsGrandStaff ? (voiceNum >= 2 ? 2 : 1) : undefined;
            xml += addRests(restDuration, divisions, voiceNum, staffForRest);
            currentTime = event.time;
          }

          // Add note(s) - could be a chord
          // For piano, determine staff based on voice (1 = treble staff 1, 2-3 = bass staff 2)
          const staffForNote = needsGrandStaff ? (voiceNum >= 2 ? 2 : 1) : undefined;
          xml += addNoteEvent(event, divisions, keyFifths, staffForNote, beamInfo[i]);
          currentTime = event.time + event.duration;
        }

        // Fill remaining measure with rests if needed for this voice
        // For piano music, don't add trailing rests - polyphonic voices don't need to fill the measure
        if (currentTime < measureEndTime && !needsGrandStaff) {
          const restDuration = Math.round(measureEndTime - currentTime);
          const staffForRest = needsGrandStaff ? (voiceNum >= 2 ? 2 : 1) : undefined;
          xml += addRests(restDuration, divisions, voiceNum, staffForRest);
        }
        
        // Add backup to measure start for next voice (except last voice)
        if (voiceIndex < voices.length - 1) {
          const measureDuration = measureEndTime - measureStartTime;
          xml += `      <backup>
        <duration>${Math.round(measureDuration)}</duration>
      </backup>
`;
        }
      }
    }

    xml += `    </measure>
`;
  }

  xml += `  </part>
`;
  return xml;
}


/**
 * Quantize MIDI notes to standard durations using intelligent rhythm detection
 */
function quantizeNotes(track: Track, divisions: number, tempo: number): QuantizedNote[] {
  // Convert tempo to divisions per second
  // tempo is in BPM (beats per minute)
  // 1 beat = 1 quarter note = divisions
  const beatsPerSecond = tempo / 60;
  const divisionsPerSecond = beatsPerSecond * divisions;
  
  console.log('Quantizing with:', { divisions, tempo, divisionsPerSecond });
  console.log('Original track notes:', track.notes.length);
  
  const quantized = track.notes.map(note => {
    // note.time and note.duration are in seconds from Tone.js
    const timeInDivisions = note.time * divisionsPerSecond;
    const durationInDivisions = note.duration * divisionsPerSecond;
    
    // Quantize to nearest 32nd note (divisions/8)
    const quantumSize = divisions / 8;
    const quantizedTime = Math.max(0, Math.round(timeInDivisions / quantumSize) * quantumSize);
    const quantizedDuration = Math.max(quantumSize, Math.round(durationInDivisions / quantumSize) * quantumSize);
    
    return {
      midi: note.midi,
      time: quantizedTime,
      duration: quantizedDuration,
      velocity: note.velocity,
      originalTicks: note.ticks,
      originalDuration: note.durationTicks
    };
  });
  
  console.log('Quantized notes sample:', quantized.slice(0, 3));
  console.log('Quantized notes count:', quantized.length);
  return quantized;
}

/**
 * Group simultaneous notes into chords
 */
function groupNotesIntoChords(notes: QuantizedNote[], divisions: number): NoteEvent[] {
  if (notes.length === 0) {
    console.warn('groupNotesIntoChords: No notes to group!');
    return [];
  }
  
  console.log(`Grouping ${notes.length} notes into chords...`);
  
  // Sort by time
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  
  const events: NoteEvent[] = [];
  let currentChord: QuantizedNote[] = [sorted[0]];
  let currentTime = sorted[0].time;
  let currentDuration = sorted[0].duration;
  
  const chordThreshold = divisions / 16; // Within 64th note = chord
  console.log('Chord threshold (divisions):', chordThreshold);
  
  for (let i = 1; i < sorted.length; i++) {
    const note = sorted[i];
    
    // Check if this note starts at roughly the same time (chord)
    if (Math.abs(note.time - currentTime) <= chordThreshold) {
      currentChord.push(note);
      currentDuration = Math.max(currentDuration, note.duration);
    } else {
      // Save current chord
      events.push({
        notes: currentChord,
        time: currentTime,
        duration: currentDuration
      });
      
      // Start new chord
      currentChord = [note];
      currentTime = note.time;
      currentDuration = note.duration;
    }
  }
  
  // Don't forget the last chord
  if (currentChord.length > 0) {
    events.push({
      notes: currentChord,
      time: currentTime,
      duration: currentDuration
    });
  }
  
  console.log(`Grouped into ${events.length} events`);
  console.log('Event sample:', events.slice(0, 3).map(e => ({
    noteCount: e.notes.length,
    time: e.time,
    duration: e.duration
  })));
  
  const totalNotesInEvents = events.reduce((sum, e) => sum + e.notes.length, 0);
  console.log(`Total notes in events: ${totalNotesInEvents} (input: ${notes.length})`);
  
  return events;
}

/**
 * Separate piano notes into voices with musicological understanding
 * Voice 1 = melody (highest notes, moving)
 * Voice 2 = accompaniment/inner voices (middle)
 * Voice 3 = bass line (lowest notes, often sustained)
 */
function separatePianoVoices(events: NoteEvent[], staffNum: number): VoicedNoteEvent[] {
  if (events.length === 0) return [];
  
  console.log(`Separating ${events.length} events into piano voices for staff ${staffNum}`);
  
  const voicedEvents: VoicedNoteEvent[] = [];
  
  // Calculate average duration to identify sustained notes
  const avgDuration = events.reduce((sum, e) => sum + e.duration, 0) / events.length;
  console.log(`Staff ${staffNum}: Average duration = ${avgDuration.toFixed(2)}`);
  
  // For bass clef (staff 2), identify sustained bass notes vs moving inner voices
  if (staffNum === 2) {
    // Track the current bass note (lowest sustained)
    let currentBassNote: { pitch: number; endTime: number } | null = null;
    
    for (const event of events) {
      // Sort notes by pitch
      const sortedNotes = [...event.notes].sort((a, b) => a.midi - b.midi);
      const lowestNote = sortedNotes[0];
      const eventEnd = event.time + event.duration;
      
      // Check if this could be a bass note - sustained notes are typically 1.5x or longer than average
      const isLongDuration = event.duration >= avgDuration * 1.3;
      
      if (sortedNotes.length === 1) {
        // Single note - check if it's bass or inner voice
        if (isLongDuration || (currentBassNote && lowestNote.midi === currentBassNote.pitch)) {
          // This is a bass note (voice 3 for bass staff = voice 3 overall)
          voicedEvents.push({ ...event, voice: 3 });
          currentBassNote = { pitch: lowestNote.midi, endTime: eventEnd };
          console.log(`  Bass note detected: MIDI ${lowestNote.midi}, duration ${event.duration.toFixed(2)} (${(event.duration/avgDuration).toFixed(1)}x avg)`);
        } else {
          // Inner voice (voice 2 for bass staff)
          voicedEvents.push({ ...event, voice: 2 });
        }
      } else {
        // Chord - keep together as single voice if all notes have same duration
        // This preserves accompaniment chords like F3-A3 in Greensleeves
        // Only split if we detect bass note + moving inner voices (different durations)
        const allSameDuration = sortedNotes.every(n => n.duration === sortedNotes[0].duration);
        
        if (allSameDuration) {
          // Chord moves together - keep as single voice
          // Use voice 3 if long duration (bass), voice 2 if shorter (inner voices)
          const voice = isLongDuration ? 3 : 2;
          voicedEvents.push({ ...event, voice });
          if (isLongDuration) {
            currentBassNote = { pitch: lowestNote.midi, endTime: eventEnd };
          }
        } else {
          // Different durations - split lowest from rest, preserving individual durations
          const bassNoteEvent = {
            notes: [lowestNote],
            time: event.time,
            duration: lowestNote.duration,  // Use individual note duration
            voice: 3
          };
          voicedEvents.push(bassNoteEvent);
          
          if (sortedNotes.length > 1) {
            // For inner notes, use the max duration of the remaining notes
            const innerNotes = sortedNotes.slice(1);
            const innerDuration = Math.max(...innerNotes.map(n => n.duration));
            const innerNotesEvent = {
              notes: innerNotes,
              time: event.time,
              duration: innerDuration,
              voice: 2
            };
            voicedEvents.push(innerNotesEvent);
          }
          
          currentBassNote = { pitch: lowestNote.midi, endTime: event.time + lowestNote.duration };
        }
      }
    }
  } else {
    // Treble clef (staff 1) - simpler: melody is highest, accompaniment is lower
    for (const event of events) {
      const sortedNotes = [...event.notes].sort((a, b) => b.midi - a.midi);
      
      if (sortedNotes.length === 1) {
        // Single note - assume melody (voice 1)
        voicedEvents.push({ ...event, voice: 1 });
      } else {
        // Chord - split highest note (melody) from rest (accompaniment)
        // Preserve individual note durations
        const melodyNote = sortedNotes[0];
        const melodyEvent = {
          notes: [melodyNote],
          time: event.time,
          duration: melodyNote.duration,  // Use individual note duration
          voice: 1
        };
        voicedEvents.push(melodyEvent);
        
        if (sortedNotes.length > 1) {
          // For accompaniment notes, use the max duration of the remaining notes
          const accompNotes = sortedNotes.slice(1);
          const accompDuration = Math.max(...accompNotes.map(n => n.duration));
          const accompEvent = {
            notes: accompNotes,
            time: event.time,
            duration: accompDuration,
            voice: 2
          };
          voicedEvents.push(accompEvent);
        }
      }
    }
  }
  
  // Sort by time
  voicedEvents.sort((a, b) => a.time - b.time);
  
  console.log(`Staff ${staffNum}: Created ${voicedEvents.length} voiced events`);
  return voicedEvents;
}

/**
 * Separate note events into voices based on pitch range and melodic continuity
 * This handles polyphonic music by separating melody from accompaniment
 */
function separateIntoVoices(events: NoteEvent[]): VoicedNoteEvent[] {
  if (events.length === 0) return [];
  
  console.log('Separating into voices based on pitch and melodic continuity...');
  
  // First, analyze the overall pitch distribution to find natural voice boundaries
  const allPitches: number[] = [];
  events.forEach(event => {
    event.notes.forEach(note => allPitches.push(note.midi));
  });
  
  const avgPitch = allPitches.reduce((sum, p) => sum + p, 0) / allPitches.length;
  const sortedPitches = [...allPitches].sort((a, b) => a - b);
  const medianPitch = sortedPitches[Math.floor(sortedPitches.length / 2)];
  
  console.log(`Pitch analysis: avg=${avgPitch.toFixed(1)}, median=${medianPitch}, range=${sortedPitches[0]}-${sortedPitches[sortedPitches.length - 1]}`);
  
  const voicedEvents: VoicedNoteEvent[] = [];
  
  // Track active voices with their current pitch and end time
  interface VoiceState {
    lastPitch: number;
    endTime: number;
    noteCount: number;
  }
  const voices: VoiceState[] = [];
  
  for (const event of events) {
    // Get the average pitch of this event (for multi-note chords)
    const eventPitch = event.notes.reduce((sum, n) => sum + n.midi, 0) / event.notes.length;
    
    // Find the best voice for this event based on:
    // 1. Voice is available (ended before this event starts)
    // 2. Pitch continuity (close to the last pitch in that voice)
    let bestVoice = -1;
    let bestScore = -Infinity;
    
    for (let v = 0; v < voices.length; v++) {
      const voice = voices[v];
      
      // Skip if voice is still active (overlapping notes)
      if (voice.endTime > event.time) {
        continue;
      }
      
      // Calculate score based on pitch proximity
      // Closer pitches = higher score (voice leading)
      const pitchDistance = Math.abs(eventPitch - voice.lastPitch);
      const score = -pitchDistance; // Negative because closer is better
      
      if (score > bestScore) {
        bestScore = score;
        bestVoice = v;
      }
    }
    
    // If no suitable voice found, create a new one
    if (bestVoice === -1) {
      bestVoice = voices.length;
      voices.push({
        lastPitch: eventPitch,
        endTime: event.time + event.duration,
        noteCount: 0
      });
    }
    
    // Update voice state
    voices[bestVoice].lastPitch = eventPitch;
    voices[bestVoice].endTime = event.time + event.duration;
    voices[bestVoice].noteCount++;
    
    // Assign event to voice (1-based)
    voicedEvents.push({
      ...event,
      voice: bestVoice + 1
    });
  }
  
  const voiceCount = voices.length;
  console.log(`Separated into ${voiceCount} voice(s)`);
  
  // Log voice distribution and pitch ranges
  const voiceStats = voices.map((v, i) => ({
    voice: i + 1,
    events: v.noteCount,
  }));
  console.log('Voice statistics:', voiceStats);
  
  // Now reassign voice numbers based on average pitch
  // Higher pitches should get lower voice numbers (voice 1 = melody)
  const voiceAvgPitches = voices.map((_, idx) => {
    const voiceEvents = voicedEvents.filter(e => e.voice === idx + 1);
    const pitches: number[] = [];
    voiceEvents.forEach(e => e.notes.forEach(n => pitches.push(n.midi)));
    return pitches.length > 0 
      ? pitches.reduce((sum, p) => sum + p, 0) / pitches.length
      : 0;
  });
  
  // Create mapping from old voice to new voice (sorted by pitch, high to low)
  const voiceMapping = new Map<number, number>();
  voiceAvgPitches
    .map((pitch, idx) => ({ oldVoice: idx + 1, avgPitch: pitch }))
    .sort((a, b) => b.avgPitch - a.avgPitch) // High to low
    .forEach((v, newIdx) => {
      voiceMapping.set(v.oldVoice, newIdx + 1);
      console.log(`Voice ${v.oldVoice} (avg pitch ${v.avgPitch.toFixed(1)}) -> Voice ${newIdx + 1}`);
    });
  
  // Remap all events to new voice numbers
  voicedEvents.forEach(event => {
    event.voice = voiceMapping.get(event.voice) || event.voice;
  });
  
  return voicedEvents;
}

/**
 * Detect key signature using Krumhansl-Schmuckler algorithm
 */
function detectKey(notes: QuantizedNote[]): number {
  if (notes.length === 0) return 0;
  
  // Count pitch classes
  const pitchClasses = new Array(12).fill(0);
  notes.forEach(note => {
    const pc = note.midi % 12;
    pitchClasses[pc] += note.duration; // Weight by duration
  });
  
  // Krumhansl-Kessler key profiles for major and minor
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  
  let bestCorrelation = -Infinity;
  let bestKey = 0;
  
  // Try all 24 keys (12 major + 12 minor)
  for (let tonic = 0; tonic < 12; tonic++) {
    // Major key
    const majorCorr = correlate(pitchClasses, rotate(majorProfile, tonic));
    if (majorCorr > bestCorrelation) {
      bestCorrelation = majorCorr;
      bestKey = toFifths(tonic, true);
    }
    
    // Minor key
    const minorCorr = correlate(pitchClasses, rotate(minorProfile, tonic));
    if (minorCorr > bestCorrelation) {
      bestCorrelation = minorCorr;
      bestKey = toFifths(tonic, false);
    }
  }
  
  // Clamp to valid range (-7 to 7) just to be safe
  bestKey = Math.max(-7, Math.min(7, bestKey));
  
  console.log('Detected key signature (fifths):', bestKey);
  return bestKey;
}

/**
 * Calculate correlation between two arrays
 */
function correlate(a: number[], b: number[]): number {
  const meanA = a.reduce((sum, val) => sum + val, 0) / a.length;
  const meanB = b.reduce((sum, val) => sum + val, 0) / b.length;
  
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const devA = a[i] - meanA;
    const devB = b[i] - meanB;
    numerator += devA * devB;
    denomA += devA * devA;
    denomB += devB * devB;
  }
  
  return numerator / Math.sqrt(denomA * denomB);
}

/**
 * Rotate array by n positions
 */
function rotate<T>(arr: T[], n: number): T[] {
  const len = arr.length;
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = arr[(i + n) % len];
  }
  return result;
}

/**
 * Convert pitch class and mode to circle of fifths position
 * Only returns valid key signatures (-7 to 7)
 */
function toFifths(pitchClass: number, isMajor: boolean): number {
  // Valid major keys: Cb(-7), Gb(-6), Db(-5), Ab(-4), Eb(-3), Bb(-2), F(-1), C(0), G(1), D(2), A(3), E(4), B(5), F#(6), C#(7)
  // Valid minor keys: Ab(-7), Eb(-6), Bb(-5), F(-4), C(-3), G(-2), D(-1), A(0), E(1), B(2), F#(3), C#(4), G#(5), D#(6), A#(7)
  
  if (isMajor) {
    // Major keys - map pitch class to fifths
    const majorMap: { [key: number]: number } = {
      0: 0,   // C major = 0 fifths
      1: -5,  // Db major = -5 fifths (5 flats)
      2: 2,   // D major = 2 fifths (2 sharps)
      3: -3,  // Eb major = -3 fifths (3 flats)
      4: 4,   // E major = 4 fifths (4 sharps)
      5: -1,  // F major = -1 fifth (1 flat)
      6: 6,   // F# major = 6 fifths (6 sharps)
      7: 1,   // G major = 1 fifth (1 sharp)
      8: -4,  // Ab major = -4 fifths (4 flats)
      9: 3,   // A major = 3 fifths (3 sharps)
      10: -2, // Bb major = -2 fifths (2 flats)
      11: 5   // B major = 5 fifths (5 sharps)
    };
    return majorMap[pitchClass] ?? 0;
  } else {
    // Minor keys - map pitch class to fifths
    const minorMap: { [key: number]: number } = {
      0: -3,  // C minor = -3 fifths (3 flats)
      1: 4,   // C# minor = 4 fifths (4 sharps)
      2: -1,  // D minor = -1 fifth (1 flat)
      3: 6,   // D# minor = 6 fifths (6 sharps) - or Eb minor
      4: 1,   // E minor = 1 fifth (1 sharp)
      5: -4,  // F minor = -4 fifths (4 flats)
      6: 3,   // F# minor = 3 fifths (3 sharps)
      7: -2,  // G minor = -2 fifths (2 flats)
      8: 5,   // G# minor = 5 fifths (5 sharps) - or Ab minor
      9: 0,   // A minor = 0 fifths
      10: -5, // Bb minor = -5 fifths (5 flats)
      11: 2   // B minor = 2 fifths (2 sharps)
    };
    return minorMap[pitchClass] ?? 0;
  }
}

/**
 * Determine best clef based on average pitch
 */
/**
 * Determine appropriate clef for a track
 * Uses GM instrument info first, then pitch range analysis
 */
function determineClef(notes: QuantizedNote[], track: Track): { sign: string; line: number } {
  if (notes.length === 0) return { sign: 'G', line: 2 };
  
  // First check: Use GM instrument default clef
  const programNumber = track.instrument.number ?? 0;
  const instrumentInfo = getInstrumentInfo(programNumber);
  
  // Special handling for drums (percussion clef is rarely used in practice)
  if (isDrumTrack(track) || instrumentInfo.clef === 'percussion') {
    return { sign: 'percussion', line: 0 };
  }
  
  // Use GM clef unless pitch analysis strongly contradicts it
  const avgPitch = notes.reduce((sum, note) => sum + note.midi, 0) / notes.length;
  
  // If instrument default is bass but average pitch is very high (>72), use treble
  if (instrumentInfo.clef === 'bass' && avgPitch > 72) {
    console.log(`Overriding bass clef with treble due to high average pitch: ${avgPitch}`);
    return { sign: 'G', line: 2 }; // Treble clef
  }
  
  // If instrument default is treble but average pitch is very low (<48), use bass
  if (instrumentInfo.clef === 'treble' && avgPitch < 48) {
    console.log(`Overriding treble clef with bass due to low average pitch: ${avgPitch}`);
    return { sign: 'F', line: 4 }; // Bass clef
  }
  
  // Alto clef (viola)
  if (instrumentInfo.clef === 'alto') {
    return { sign: 'C', line: 3 };
  }
  
  // Otherwise use GM default
  if (instrumentInfo.clef === 'bass') {
    return { sign: 'F', line: 4 };
  } else {
    return { sign: 'G', line: 2 }; // Treble is default
  }
}

/**
 * Calculate beaming for notes in a measure
 * Beams eighth notes and smaller within beats
 */
function calculateBeaming(
  events: VoicedNoteEvent[], 
  divisions: number, 
  _numerator: number, 
  denominator: number,
  measureStartTime: number
): string[] {
  const beamInfo: string[] = [];
  const beatDuration = (4 / denominator) * divisions; // Duration of one beat
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { noteType } = getDurationComponents(event.duration, divisions);
    
    // Only beam eighth notes and smaller
    if (!noteType || !['eighth', '16th', '32nd'].includes(noteType)) {
      beamInfo.push('');
      continue;
    }
    
    // Determine which beat this note is on
    const timeInMeasure = event.time - measureStartTime;
    const currentBeat = Math.floor(timeInMeasure / beatDuration);
    
    // Check if next note is in same beat and should be beamed together
    const nextEvent = i < events.length - 1 ? events[i + 1] : null;
    let beamType = '';
    
    if (nextEvent) {
      const nextTimeInMeasure = nextEvent.time - measureStartTime;
      const nextBeat = Math.floor(nextTimeInMeasure / beatDuration);
      const { noteType: nextNoteType } = getDurationComponents(nextEvent.duration, divisions);
      
      // Check if previous note was in same beat and beamable
      const prevEvent = i > 0 ? events[i - 1] : null;
      const prevTimeInMeasure = prevEvent ? prevEvent.time - measureStartTime : -1;
      const prevBeat = prevEvent ? Math.floor(prevTimeInMeasure / beatDuration) : -1;
      const prevNoteType = prevEvent ? getDurationComponents(prevEvent.duration, divisions).noteType : null;
      const prevBeamable = prevNoteType && ['eighth', '16th', '32nd'].includes(prevNoteType);
      
      const nextIsBeamable = nextNoteType && ['eighth', '16th', '32nd'].includes(nextNoteType);
      const inSameBeatAsNext = currentBeat === nextBeat && nextIsBeamable;
      const inSameBeatAsPrev = prevBeamable && currentBeat === prevBeat;
      
      if (inSameBeatAsPrev && inSameBeatAsNext) {
        beamType = 'continue'; // Middle of beam group
      } else if (!inSameBeatAsPrev && inSameBeatAsNext) {
        beamType = 'begin'; // Start of beam group
      } else if (inSameBeatAsPrev && !inSameBeatAsNext) {
        beamType = 'end'; // End of beam group
      }
      // else: single note, no beam
    } else {
      // Last note - check if it should end a beam
      const prevEvent = i > 0 ? events[i - 1] : null;
      const prevTimeInMeasure = prevEvent ? prevEvent.time - measureStartTime : -1;
      const prevBeat = prevEvent ? Math.floor(prevTimeInMeasure / beatDuration) : -1;
      const prevNoteType = prevEvent ? getDurationComponents(prevEvent.duration, divisions).noteType : null;
      const prevBeamable = prevNoteType && ['eighth', '16th', '32nd'].includes(prevNoteType);
      
      if (prevBeamable && currentBeat === prevBeat) {
        beamType = 'end';
      }
    }
    
    beamInfo.push(beamType);
  }
  
  return beamInfo;
}

/**
 * Add a note event (single note or chord) to XML
 * Includes staff assignment for piano grand staff
 */
function addNoteEvent(
  event: VoicedNoteEvent, 
  divisions: number, 
  keyFifths: number, 
  staffNum?: number,
  beamType?: string
): string {
  let xml = '';
  
  // Sort notes by pitch (lowest to highest)
  const sortedNotes = [...event.notes].sort((a, b) => a.midi - b.midi);
  
  sortedNotes.forEach((note, index) => {
    const isChord = index > 0;
    const { step, octave, alter } = midiToNoteName(note.midi);
    const { noteType, dots } = getDurationComponents(event.duration, divisions);
    const displayAccidental = shouldDisplayAccidental(step, alter, keyFifths);
    const dynamics = velocityToDynamics(note.velocity);
    
    xml += `      <note`;
    if (dynamics && index === 0) {
      xml += ` dynamics="${dynamics}"`;
    }
    xml += `>
`;
    
    if (isChord) {
      xml += `        <chord/>
`;
    }
    
    xml += `        <pitch>
          <step>${step}</step>
`;
    if (alter !== 0) {
      xml += `          <alter>${alter}</alter>
`;
    }
    xml += `          <octave>${octave}</octave>
        </pitch>
        <duration>${Math.round(event.duration)}</duration>
        <voice>${event.voice}</voice>
        <type>${noteType || 'quarter'}</type>
`;
    
    // Add staff number for piano grand staff
    if (staffNum !== undefined) {
      xml += `        <staff>${staffNum}</staff>
`;
    }
    
    // Add beaming for eighth notes and smaller (only on first note of chord)
    if (beamType && index === 0) {
      xml += `        <beam number="1">${beamType}</beam>
`;
    }
    
    for (let d = 0; d < dots; d++) {
      xml += `        <dot/>
`;
    }
    
    if (displayAccidental && alter !== 0) {
      xml += `        <accidental>${alter === 1 ? 'sharp' : alter === -1 ? 'flat' : 'natural'}</accidental>
`;
    }
    
    xml += `      </note>
`;
  });
  
  return xml;
}

/**
 * Add rests to fill a duration, splitting into standard note values
 */
function addRests(duration: number, divisions: number, voice: number, staffNum?: number): string {
  let xml = '';
  let remaining = duration;
  
  // Standard durations in descending order
  const standardDurations = [
    { value: divisions * 4, type: 'whole' },      // Whole note
    { value: divisions * 2, type: 'half' },       // Half note
    { value: divisions, type: 'quarter' },        // Quarter note
    { value: divisions / 2, type: 'eighth' },     // Eighth note
    { value: divisions / 4, type: '16th' },       // 16th note
    { value: divisions / 8, type: '32nd' },       // 32nd note
  ];
  
  while (remaining > 0) {
    // Find largest standard duration that fits
    let found = false;
    for (const std of standardDurations) {
      if (remaining >= std.value) {
        xml += `      <note>\n`;
        xml += `        <rest/>\n`;
        xml += `        <duration>${Math.round(std.value)}</duration>\n`;
        xml += `        <voice>${voice}</voice>\n`;
        xml += `        <type>${std.type}</type>\n`;
        if (staffNum !== undefined) {
          xml += `        <staff>${staffNum}</staff>\n`;
        }
        xml += `      </note>\n`;
        remaining -= std.value;
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Use smallest available for remainder
      const smallest = standardDurations[standardDurations.length - 1];
      xml += `      <note>\n`;
      xml += `        <rest/>\n`;
      xml += `        <duration>${Math.round(remaining)}</duration>\n`;
      xml += `        <voice>${voice}</voice>\n`;
      xml += `        <type>${smallest.type}</type>\n`;
      if (staffNum !== undefined) {
        xml += `        <staff>${staffNum}</staff>\n`;
      }
      xml += `      </note>\n`;
      remaining = 0;
    }
  }
  
  return xml;
}

/**
 * Get note type and dots from duration
 */
function getDurationComponents(duration: number, divisions: number): { noteType: string; dots: number } {
  // Check for dotted notes (1.5x, 1.75x, 1.875x)
  const dottedDurations = [
    { base: divisions * 4, multiplier: 1.5, type: 'whole', dots: 1 },
    { base: divisions * 4, multiplier: 1.75, type: 'whole', dots: 2 },
    { base: divisions * 2, multiplier: 1.5, type: 'half', dots: 1 },
    { base: divisions * 2, multiplier: 1.75, type: 'half', dots: 2 },
    { base: divisions, multiplier: 1.5, type: 'quarter', dots: 1 },
    { base: divisions, multiplier: 1.75, type: 'quarter', dots: 2 },
    { base: divisions / 2, multiplier: 1.5, type: 'eighth', dots: 1 },
    { base: divisions / 2, multiplier: 1.75, type: 'eighth', dots: 2 },
    { base: divisions / 4, multiplier: 1.5, type: '16th', dots: 1 },
    { base: divisions / 4, multiplier: 1.75, type: '16th', dots: 2 },
  ];
  
  for (const dotted of dottedDurations) {
    const expectedDuration = dotted.base * dotted.multiplier;
    if (Math.abs(duration - expectedDuration) < divisions / 32) {
      return { noteType: dotted.type, dots: dotted.dots };
    }
  }
  
  // Standard undotted notes
  const standardDurations = [
    { value: divisions * 8, type: 'breve' },
    { value: divisions * 4, type: 'whole' },
    { value: divisions * 2, type: 'half' },
    { value: divisions, type: 'quarter' },
    { value: divisions / 2, type: 'eighth' },
    { value: divisions / 4, type: '16th' },
    { value: divisions / 8, type: '32nd' },
    { value: divisions / 16, type: '64th' },
  ];
  
  for (const std of standardDurations) {
    if (Math.abs(duration - std.value) < divisions / 32) {
      return { noteType: std.type, dots: 0 };
    }
  }
  
  // Default to quarter note if nothing matches
  return { noteType: 'quarter', dots: 0 };
}

/**
 * Determine if accidental should be displayed based on key signature
 */
function shouldDisplayAccidental(step: string, alter: number, fifths: number): boolean {
  // Key signature sharps/flats
  const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  
  if (fifths > 0) {
    // Sharp keys
    const inKey = sharpOrder.slice(0, fifths).includes(step);
    return alter !== (inKey ? 1 : 0);
  } else if (fifths < 0) {
    // Flat keys
    const inKey = flatOrder.slice(0, -fifths).includes(step);
    return alter !== (inKey ? -1 : 0);
  } else {
    // C major / A minor
    return alter !== 0;
  }
}

/**
 * Convert MIDI velocity to dynamics marking
 */
function velocityToDynamics(velocity: number): string | null {
  if (velocity <= 0.2) return 'ppp';
  if (velocity <= 0.35) return 'pp';
  if (velocity <= 0.5) return 'p';
  if (velocity <= 0.65) return 'mp';
  if (velocity <= 0.75) return 'mf';
  if (velocity <= 0.85) return 'f';
  if (velocity <= 0.95) return 'ff';
  return 'fff';
}

/**
 * Convert MIDI note number to note name with octave (prefer sharps in key context)
 */
function midiToNoteName(midi: number): { step: string; octave: number; alter: number } {
  const noteNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
  const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]; // 1 = sharp
  
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  
  return {
    step: noteNames[noteIndex],
    octave,
    alter: alters[noteIndex]
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

