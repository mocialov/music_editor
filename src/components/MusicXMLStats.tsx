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
  let totalDuration = 0;
  let tempo: number | null = null;
  let timeSignature: string | null = null;
  let keySignature: string | null = null;

  parts.forEach((part: Part) => {
    totalMeasures += part.measure.length;

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

      // Count notes
      if (measure.note) {
        const notes = Array.isArray(measure.note) ? measure.note : [measure.note];
        notes.forEach((note: Note) => {
          if (!note.chord && !note.grace) { // Don't count chord notes or grace notes twice
            totalNotes++;
            if (note.duration) {
              const dur = typeof note.duration === 'string' 
                ? parseInt(note.duration) 
                : note.duration;
              totalDuration += dur;
            }
          }
        });
      }
    });
  });

  // Calculate duration in seconds
  const beatsPerMinute = tempo || 120;
  const totalBeats = totalDuration / divisions;
  const durationSeconds = (totalBeats / beatsPerMinute) * 60;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const duration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return {
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
  };
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
