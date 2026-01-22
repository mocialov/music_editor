import React, { useMemo } from 'react';
import type { MusicXMLDocument, Part, Measure, Note } from '../utils/musicxml-parser';

interface MusicXMLStatsProps {
  document: MusicXMLDocument | null;
  parseError: string | null;
}

interface Stats {
  totalParts: number;
  totalMeasures: number;
  totalNotes: number;
  title: string | null;
  composer: string | null;
  partNames: string[];
  tempo: number | null;
  timeSignature: string | null;
  keySignature: string | null;
  duration: string;
  voices: number;
  staves: number;
  polyphonicParts: number;
  multiStaffParts: number;
  tiedNotes: number;
  graceNotes: number;
  tuplets: number;
  tempoChanges: number;
  hasComplexPolyphony: boolean;
}

const getKeySignature = (fifths: number | string): string => {
  const fifthsNum = typeof fifths === 'string' ? parseInt(fifths) : fifths;
  const keys = ['C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'];
  return keys[fifthsNum + 7] || 'Unknown';
};

const calculateStats = (document: MusicXMLDocument): Stats => {
  const scorePartwise = document['score-partwise'];
  const parts = Array.isArray(scorePartwise.part) ? scorePartwise.part : [scorePartwise.part];
  const title = scorePartwise['movement-title'] || null;
  
  let composer: string | null = null;
  if (scorePartwise.identification?.creator) {
    const creator = scorePartwise.identification.creator;
    if (Array.isArray(creator)) {
      const composerObj = creator.find(c => typeof c === 'object' && c['@type'] === 'composer');
      composer = composerObj && typeof composerObj === 'object' ? composerObj['#text'] : (typeof creator[0] === 'string' ? creator[0] : null);
    } else if (typeof creator === 'string') {
      composer = creator;
    } else if (creator['#text']) {
      composer = creator['#text'];
    }
  }

  const partList = scorePartwise['part-list'];
  const scoreParts = Array.isArray(partList['score-part']) ? partList['score-part'] : [partList['score-part']];
  const partNames = scoreParts.map(sp => sp['part-name']);

  let maxMeasures = 0;
  let totalNotes = 0;
  let divisions = 4;
  let maxDuration = 0;
  let tempo: number | null = null;
  let timeSignature: string | null = null;
  let keySignature: string | null = null;
  let voices = new Set<string>();
  let staves = new Set<number>();
  let tiedNotes = 0;
  let graceNotes = 0;
  let tuplets = 0;
  let tempoChanges = 0;
  let polyphonicParts = 0;
  let multiStaffParts = 0;
  let hasComplexPolyphony = false;
  
  parts.forEach((part: Part) => {
    maxMeasures = Math.max(maxMeasures, part.measure.length);
    const voiceDurations = new Map<string, number>();
    const partVoices = new Set<string>();
    const partStaves = new Set<number>();
    
    part.measure.forEach((measure: Measure) => {
      if (measure.attributes) {
        const attrs = Array.isArray(measure.attributes) ? measure.attributes[0] : measure.attributes;
        if (attrs.divisions) divisions = typeof attrs.divisions === 'string' ? parseInt(attrs.divisions) : attrs.divisions;
        if (attrs.time && !timeSignature) timeSignature = `${attrs.time.beats}/${attrs.time['beat-type']}`;
        if (attrs.key && !keySignature) {
          const fifths = typeof attrs.key.fifths === 'string' ? parseInt(attrs.key.fifths) : attrs.key.fifths;
          keySignature = getKeySignature(fifths);
        }
        if (attrs.staves) {
          const stavesCount = typeof attrs.staves === 'string' ? parseInt(attrs.staves) : attrs.staves;
          for (let i = 1; i <= stavesCount; i++) {
            staves.add(i);
            partStaves.add(i);
          }
        }
      }

      if (measure.direction) {
        const directions = Array.isArray(measure.direction) ? measure.direction : [measure.direction];
        for (const direction of directions) {
          if (direction.sound?.['@tempo']) {
            tempoChanges++;
            if (!tempo) {
              tempo = typeof direction.sound['@tempo'] === 'string' ? parseFloat(direction.sound['@tempo']) : direction.sound['@tempo'];
            }
          }
        }
      }
      
      if (measure.note) {
        const notes = Array.isArray(measure.note) ? measure.note : [measure.note];
        const measureVoices = new Set<string>();
        
        notes.forEach((note: Note) => {
          // Track voices
          const voice = note.voice ? (typeof note.voice === 'string' ? note.voice : String(note.voice)) : '1';
          if (note.voice) {
            voices.add(voice);
            partVoices.add(voice);
            measureVoices.add(voice);
          }
          
          // Track staff
          if (note.staff) {
            const staff = typeof note.staff === 'string' ? parseInt(note.staff) : note.staff;
            staves.add(staff);
            partStaves.add(staff);
          }
          
          // Count tied notes
          // note.tie can be an empty object {}, so check for undefined
          if (note.tie !== undefined) {
            tiedNotes++;
          }
          
          // Count grace notes
          // note.grace can be an empty object {}, so check for undefined
          if (note.grace !== undefined) {
            graceNotes++;
          }
          
          // Count tuplets
          // note['time-modification'] can be an empty object {}, so check for undefined
          if (note['time-modification'] !== undefined) {
            tuplets++;
          }
          
          // Count all notes (including chord members) to match playback extraction
          // Only exclude rests and grace notes
          // Note: note.rest can be an empty object {}, which is truthy, so check for pitch instead
          if (note.pitch && note.grace === undefined) {
            totalNotes++;
          }
          
          // Duration tracking: track each voice separately since voices play in parallel
          // note.chord and note.grace can be empty objects {}, so check for undefined
          if (note.chord === undefined && note.grace === undefined && note.duration) {
            const noteDuration = typeof note.duration === 'string' ? parseInt(note.duration) : note.duration;
            voiceDurations.set(voice, (voiceDurations.get(voice) || 0) + noteDuration);
          }
        });
        
        // Check for complex polyphony (multiple voices in same measure)
        if (measureVoices.size > 1) {
          hasComplexPolyphony = true;
        }
      }
    });
    
    // Count polyphonic parts (parts with multiple voices)
    if (partVoices.size > 1) {
      polyphonicParts++;
    }
    
    // Count multi-staff parts
    if (partStaves.size > 1) {
      multiStaffParts++;
    }
    // Get the maximum duration across all voices in this part (voices play in parallel)
    const partDuration = Math.max(...Array.from(voiceDurations.values()), 0);
    
    maxDuration = Math.max(maxDuration, partDuration);
  });
  
  const beatsPerMinute = tempo || 120;
  const durationSeconds = ((maxDuration / divisions) / beatsPerMinute) * 60;
  const duration = `${Math.floor(durationSeconds / 60)}:${Math.floor(durationSeconds % 60).toString().padStart(2, '0')}`;

  return { 
    totalParts: parts.length, 
    totalMeasures: maxMeasures, 
    totalNotes, 
    title, 
    composer, 
    partNames, 
    tempo, 
    timeSignature, 
    keySignature, 
    duration,
    voices: voices.size,
    staves: staves.size,
    polyphonicParts,
    multiStaffParts,
    tiedNotes,
    graceNotes,
    tuplets,
    tempoChanges,
    hasComplexPolyphony
  };
};

export const MusicXMLStats: React.FC<MusicXMLStatsProps> = ({ document, parseError }) => {
  const stats = useMemo(() => {
    if (!document) return null;
    try { return calculateStats(document); } catch (error) { return null; }
  }, [document]);

  if (parseError || !stats) return null;

  return (
    <div className="musicxml-stats">
      <h3>📊 Score Details</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">📏 Parts</span>
          <span className="stat-value">{stats.totalParts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">📐 Measures</span>
          <span className="stat-value">{stats.totalMeasures}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎼 Notes</span>
          <span className="stat-value">{stats.totalNotes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">⏱️ Duration</span>
          <span className="stat-value">{stats.duration}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎹 Key</span>
          <span className="stat-value">{stats.keySignature || 'C'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎵 Time</span>
          <span className="stat-value">{stats.timeSignature || '4/4'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">⏩ Tempo</span>
          <span className="stat-value">{stats.tempo ? stats.tempo.toFixed(2) : '120.00'} BPM</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎤 Voices</span>
          <span className="stat-value">{stats.voices}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">📊 Staves</span>
          <span className="stat-value">{stats.staves}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎭 Polyphonic Parts</span>
          <span className="stat-value">{stats.polyphonicParts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎹 Multi-Staff Parts</span>
          <span className="stat-value">{stats.multiStaffParts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🔗 Tied Notes</span>
          <span className="stat-value">{stats.tiedNotes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">✨ Grace Notes</span>
          <span className="stat-value">{stats.graceNotes}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">3️⃣ Tuplets</span>
          <span className="stat-value">{stats.tuplets}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎚️ Tempo Changes</span>
          <span className="stat-value">{stats.tempoChanges}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">🎼 Complex Polyphony</span>
          <span className="stat-value">{stats.hasComplexPolyphony ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );
};
