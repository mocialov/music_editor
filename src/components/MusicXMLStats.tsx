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

  let totalMeasures = 0;
  let totalNotes = 0;
  let divisions = 4;
  let maxDuration = 0;
  let tempo: number | null = null;
  let timeSignature: string | null = null;
  let keySignature: string | null = null;
  
  parts.forEach((part: Part) => {
    totalMeasures += part.measure.length;
    let partDuration = 0;
    
    part.measure.forEach((measure: Measure) => {
      if (measure.attributes) {
        const attrs = Array.isArray(measure.attributes) ? measure.attributes[0] : measure.attributes;
        if (attrs.divisions) divisions = typeof attrs.divisions === 'string' ? parseInt(attrs.divisions) : attrs.divisions;
        if (attrs.time && !timeSignature) timeSignature = `${attrs.time.beats}/${attrs.time['beat-type']}`;
        if (attrs.key && !keySignature) {
          const fifths = typeof attrs.key.fifths === 'string' ? parseInt(attrs.key.fifths) : attrs.key.fifths;
          keySignature = getKeySignature(fifths);
        }
      }

      if (measure.direction && !tempo) {
        const directions = Array.isArray(measure.direction) ? measure.direction : [measure.direction];
        for (const direction of directions) {
          if (direction.sound?.['@tempo']) {
            tempo = typeof direction.sound['@tempo'] === 'string' ? parseFloat(direction.sound['@tempo']) : direction.sound['@tempo'];
            break;
          }
        }
      }
      
      if (measure.note) {
        const notes = Array.isArray(measure.note) ? measure.note : [measure.note];
        notes.forEach((note: Note) => {
          if (!note.chord && !note.grace) {
            totalNotes++;
            if (note.duration) partDuration += typeof note.duration === 'string' ? parseInt(note.duration) : note.duration;
          }
        });
      }
    });
    maxDuration = Math.max(maxDuration, partDuration);
  });
  
  const beatsPerMinute = tempo || 120;
  const durationSeconds = ((maxDuration / divisions) / beatsPerMinute) * 60;
  const duration = `${Math.floor(durationSeconds / 60)}:${Math.floor(durationSeconds % 60).toString().padStart(2, '0')}`;

  return { totalParts: parts.length, totalMeasures, totalNotes, title, composer, partNames, tempo, timeSignature, keySignature, duration };
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
        <div className="stat-card featured">
          <span className="stat-label">Title</span>
          <span className="stat-value">{stats.title || 'Untitled'}</span>
        </div>
        {stats.composer && (
          <div className="stat-card">
            <span className="stat-label">Composer</span>
            <span className="stat-value">{stats.composer}</span>
          </div>
        )}
        <div className="stat-card">
          <span className="stat-label">Measures</span>
          <span className="stat-value">{stats.totalMeasures}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Key</span>
          <span className="stat-value">{stats.keySignature || 'C'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Time</span>
          <span className="stat-value">{stats.timeSignature || '4/4'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Tempo</span>
          <span className="stat-value">{stats.tempo || 120} BPM</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Duration</span>
          <span className="stat-value">{stats.duration}</span>
        </div>
      </div>
    </div>
  );
};
