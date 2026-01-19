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
  totalVoices: number;
  totalStaves: number;
  partsWithMultipleVoices: number;
  partsWithMultipleStaves: number;
  tiedNotes: number;
  graceNotes: number;
  tuplets: number;
  tempoChanges: number;
  hasComplexPolyphony: boolean;
}

const getKeySignature = (fifths: number | string): string => {
  const fifthsNum = typeof fifths === 'string' ? parseInt(fifths) : fifths;
  const keys = [
    'C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F',
    'C',
    'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'
  ];
  return keys[fifthsNum + 7] || 'Unknown';
};

const calculateStats = (document: MusicXMLDocument): Stats => {
  const scorePartwise = document['score-partwise'];
  const parts = Array.isArray(scorePartwise.part) 
    ? scorePartwise.part 
    : [scorePartwise.part];

  // Title
  const title = scorePartwise['movement-title'] || null;

  // Composer
  let composer: string | null = null;
  if (scorePartwise.identification?.creator) {
    const creator = scorePartwise.identification.creator;
    if (Array.isArray(creator)) {
      const composerObj = creator.find(c => 
        typeof c === 'object' && c['@type'] === 'composer'
      );
      composer = composerObj && typeof composerObj === 'object' 
        ? composerObj['#text'] 
        : (typeof creator[0] === 'string' ? creator[0] : null);
    } else if (typeof creator === 'string') {
      composer = creator;
    } else if (creator['#text']) {
      composer = creator['#text'];
    }
  }

  // Part names
  const partList = scorePartwise['part-list'];
  const scoreParts = Array.isArray(partList['score-part']) 
    ? partList['score-part'] 
    : [partList['score-part']];
  const partNames = scoreParts.map(sp => sp['part-name']);

  // Count measures and notes
  let totalMeasures = 0;
  let totalNotes = 0;
  let divisions = 4; // default
  let maxDuration = 0; // Track the longest part duration instead of summing all parts
  let tempo: number | null = null;
  let timeSignature: string | null = null;
  let keySignature: string | null = null;
  
  // Track voices and staves
  const allVoices = new Set<string>();
  const allStaves = new Set<string>();
  const partVoiceCounts = new Map<number, Set<string>>();
  const partStaffCounts = new Map<number, Set<string>>();
  
  // Track new musicological features
  let tiedNotesCount = 0;
  let graceNotesCount = 0;
  let tupletsCount = 0;
  let tempoChangesCount = 0;
  let hasBackupForward = false;

  parts.forEach((part: Part, partIndex: number) => {
    totalMeasures += part.measure.length;
    let partDuration = 0; // Track duration for this part separately
    
    const partVoices = new Set<string>();
    const partStaves = new Set<string>();

    part.measure.forEach((measure: Measure) => {
      // Get attributes from first measure
      if (measure.attributes) {
        const attrs = Array.isArray(measure.attributes) 
          ? measure.attributes[0] 
          : measure.attributes;
        
        if (attrs.divisions) {
          divisions = typeof attrs.divisions === 'string' 
            ? parseInt(attrs.divisions) 
            : attrs.divisions;
        }

        if (attrs.time && !timeSignature) {
          const beats = typeof attrs.time.beats === 'string' 
            ? attrs.time.beats 
            : String(attrs.time.beats);
          const beatType = typeof attrs.time['beat-type'] === 'string' 
            ? attrs.time['beat-type'] 
            : String(attrs.time['beat-type']);
          timeSignature = `${beats}/${beatType}`;
        }

        if (attrs.key && !keySignature) {
          const fifths = typeof attrs.key.fifths === 'string' 
            ? parseInt(attrs.key.fifths) 
            : attrs.key.fifths;
          keySignature = getKeySignature(fifths);
          if (attrs.key.mode) {
            keySignature += ` ${attrs.key.mode}`;
          }
        }
      }

      // Get tempo from direction
      if (measure.direction && !tempo) {
        const directions = Array.isArray(measure.direction) 
          ? measure.direction 
          : [measure.direction];
        
        for (const direction of directions) {
          if (direction.sound?.['@tempo']) {
            const tempoVal = direction.sound['@tempo'];
            tempo = typeof tempoVal === 'string' ? parseFloat(tempoVal) : tempoVal;
            break;
          }
          
          const dirTypes = Array.isArray(direction['direction-type'])
            ? direction['direction-type']
            : [direction['direction-type']];
          
          for (const dirType of dirTypes) {
            if (dirType.metronome) {
              const perMin = dirType.metronome['per-minute'];
              tempo = typeof perMin === 'string' ? parseFloat(perMin) : perMin;
              break;
            }
          }
          if (tempo) break;
        }
      }
      
      // Count tempo changes (after first tempo is set)
      if (measure.direction && tempo !== null) {
        const directions = Array.isArray(measure.direction) 
          ? measure.direction 
          : [measure.direction];
        
        for (const direction of directions) {
          if (direction.sound?.['@tempo']) {
            tempoChangesCount++;
          }
        }
      }
      
      // Check for backup/forward elements (indicates complex polyphony)
      if (measure.backup || measure.forward) {
        hasBackupForward = true;
      }

      // Count notes
      if (measure.note) {
        const notes = Array.isArray(measure.note) ? measure.note : [measure.note];
        notes.forEach((note: Note) => {
          // Track voices and staves
          const voice = note.voice ? String(note.voice) : '1';
          const staff = note.staff ? String(note.staff) : '1';
          partVoices.add(voice);
          partStaves.add(staff);
          allVoices.add(voice);
          allStaves.add(staff);
          
          // Count grace notes
          if (note.grace) {
            graceNotesCount++;
          }
          
          // Count tied notes
          if (note.notations) {
            const notations = note.notations;
            if (notations.tied) {
              const tied = Array.isArray(notations.tied) ? notations.tied : [notations.tied];
              // Count 'start' ties to avoid double counting
              const hasStartTie = tied.some(t => 
                (typeof t === 'object' && t['@type'] === 'start')
              );
              if (hasStartTie) {
                tiedNotesCount++;
              }
            }
          }
          
          // Count tuplets
          if (note['time-modification']) {
            tupletsCount++;
          }
          
          if (!note.chord && !note.grace) { // Don't count chord notes or grace notes twice
            totalNotes++;
            if (note.duration) {
              const dur = typeof note.duration === 'string' 
                ? parseInt(note.duration) 
                : note.duration;
              partDuration += dur;
            }
          }
        });
      }
    });
    
    partVoiceCounts.set(partIndex, partVoices);
    partStaffCounts.set(partIndex, partStaves);
    
    // Track the maximum duration across all parts (they play simultaneously)
    maxDuration = Math.max(maxDuration, partDuration);
  });
  
  // Calculate voice and staff statistics
  const partsWithMultipleVoices = Array.from(partVoiceCounts.values()).filter(voices => voices.size > 1).length;
  const partsWithMultipleStaves = Array.from(partStaffCounts.values()).filter(staves => staves.size > 1).length;

  // Calculate duration in seconds using the longest part
  const beatsPerMinute = tempo || 120;
  const totalBeats = maxDuration / divisions;
  const durationSeconds = (totalBeats / beatsPerMinute) * 60;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const result = {
    totalParts: parts.length,
    totalMeasures,
    totalNotes,
    title,
    composer,
    partNames,
    tempo,
    timeSignature,
    keySignature,
    duration,
    totalVoices: allVoices.size,
    totalStaves: allStaves.size,
    partsWithMultipleVoices,
    partsWithMultipleStaves,
    tiedNotes: tiedNotesCount,
    graceNotes: graceNotesCount,
    tuplets: tupletsCount,
    tempoChanges: tempoChangesCount,
    hasComplexPolyphony: hasBackupForward,
  };
  
  console.log('MusicXML Stats:', result);
  
  return result;
};

export const MusicXMLStats: React.FC<MusicXMLStatsProps> = ({ document, parseError }) => {
  const stats = useMemo(() => {
    if (!document) return null;
    try {
      return calculateStats(document);
    } catch (error) {
      console.error('Error calculating stats:', error);
      return null;
    }
  }, [document]);

  if (parseError) {
    return (
      <div className="musicxml-stats error">
        <h3>❌ Parse Error</h3>
        <pre className="error-message">{parseError}</pre>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="musicxml-stats">
      <h3>📊 MusicXML Statistics</h3>
      
      <div className="stats-grid">
        {stats.title && (
          <div className="stat-card featured">
            <div className="stat-icon">🎵</div>
            <div className="stat-content">
              <div className="stat-label">Title</div>
              <div className="stat-value">{stats.title}</div>
            </div>
          </div>
        )}

        {stats.composer && (
          <div className="stat-card featured">
            <div className="stat-icon">✍️</div>
            <div className="stat-content">
              <div className="stat-label">Composer</div>
              <div className="stat-value">{stats.composer}</div>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon">🎹</div>
          <div className="stat-content">
            <div className="stat-label">Parts</div>
            <div className="stat-value">{stats.totalParts}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📏</div>
          <div className="stat-content">
            <div className="stat-label">Measures</div>
            <div className="stat-value">{stats.totalMeasures}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎼</div>
          <div className="stat-content">
            <div className="stat-label">Notes</div>
            <div className="stat-value">{stats.totalNotes.toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{stats.duration}</div>
          </div>
        </div>

        {stats.keySignature && (
          <div className="stat-card">
            <div className="stat-icon">🎹</div>
            <div className="stat-content">
              <div className="stat-label">Key</div>
              <div className="stat-value">{stats.keySignature}</div>
            </div>
          </div>
        )}

        {stats.timeSignature && (
          <div className="stat-card">
            <div className="stat-icon">🎵</div>
            <div className="stat-content">
              <div className="stat-label">Time</div>
              <div className="stat-value">{stats.timeSignature}</div>
            </div>
          </div>
        )}

        {stats.tempo && (
          <div className="stat-card">
            <div className="stat-icon">⏩</div>
            <div className="stat-content">
              <div className="stat-label">Tempo</div>
              <div className="stat-value">{stats.tempo} BPM</div>
            </div>
          </div>
        )}

        {stats.totalVoices > 1 && (
          <div className="stat-card">
            <div className="stat-icon">🎤</div>
            <div className="stat-content">
              <div className="stat-label">Voices</div>
              <div className="stat-value">{stats.totalVoices}</div>
            </div>
          </div>
        )}

        {stats.totalStaves > 1 && (
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Staves</div>
              <div className="stat-value">{stats.totalStaves}</div>
            </div>
          </div>
        )}

        {stats.partsWithMultipleVoices > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🎭</div>
            <div className="stat-content">
              <div className="stat-label">Polyphonic Parts</div>
              <div className="stat-value">{stats.partsWithMultipleVoices}</div>
            </div>
          </div>
        )}

        {stats.partsWithMultipleStaves > 0 && (
          <div className="stat-card">
            <div className="stat-icon">🎹</div>
            <div className="stat-content">
              <div className="stat-label">Multi-Staff Parts</div>
              <div className="stat-value">{stats.partsWithMultipleStaves}</div>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-icon">🔗</div>
          <div className="stat-content">
            <div className="stat-label">Tied Notes</div>
            <div className="stat-value">{stats.tiedNotes}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✨</div>
          <div className="stat-content">
            <div className="stat-label">Grace Notes</div>
            <div className="stat-value">{stats.graceNotes}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">3️⃣</div>
          <div className="stat-content">
            <div className="stat-label">Tuplets</div>
            <div className="stat-value">{stats.tuplets}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎚️</div>
          <div className="stat-content">
            <div className="stat-label">Tempo Changes</div>
            <div className="stat-value">{stats.tempoChanges}</div>
          </div>
        </div>

        {stats.hasComplexPolyphony && (
          <div className="stat-card">
            <div className="stat-icon">🎼</div>
            <div className="stat-content">
              <div className="stat-label">Complex Polyphony</div>
              <div className="stat-value">Yes</div>
            </div>
          </div>
        )}
      </div>

      {stats.partNames.length > 0 && (
        <div className="parts-list">
          <h4>Instruments</h4>
          <div className="parts-grid">
            {stats.partNames.map((name, index) => (
              <div key={index} className="part-badge">
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
