import React, { useMemo } from 'react';
import type { SemanticMusicXML } from '../utils/musicxml-parser';

interface SemanticStatsProps {
  semantic: SemanticMusicXML | null;
  originalSize: number;
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
  semanticSize: number;
  originalSize: number;
  sizeReduction: number;
  articulations: Set<string>;
  dynamics: Set<string>;
  ornaments: Set<string>;
}

const getKeySignature = (fifths: number): string => {
  const keys = [
    'C♭', 'G♭', 'D♭', 'A♭', 'E♭', 'B♭', 'F',
    'C',
    'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'
  ];
  return keys[fifths + 7] || 'Unknown';
};

const calculateStats = (semantic: SemanticMusicXML, originalSize: number): Stats => {
  const semanticSize = JSON.stringify(semantic).length;
  const sizeReduction = Math.round((1 - semanticSize / originalSize) * 100);

  const articulations = new Set<string>();
  const dynamics = new Set<string>();
  const ornaments = new Set<string>();
  
  let totalMeasures = 0;
  let totalNotes = 0;
  let tempo: number | null = null;
  let timeSignature: string | null = null;
  let keySignature: string | null = null;

  semantic.parts.forEach(part => {
    totalMeasures += part.measures.length;

    part.measures.forEach(measure => {
      // Get attributes from first measure
      if (measure.attributes) {
        if (measure.attributes.time && !timeSignature) {
          timeSignature = `${measure.attributes.time.beats}/${measure.attributes.time.beatType}`;
        }

        if (measure.attributes.key && !keySignature) {
          keySignature = getKeySignature(measure.attributes.key.fifths);
          if (measure.attributes.key.mode) {
            keySignature += ` ${measure.attributes.key.mode}`;
          }
        }
      }

      // Get tempo from directions
      if (measure.directions && !tempo) {
        const tempoDir = measure.directions.find(d => d.type === 'tempo');
        if (tempoDir && typeof tempoDir.value === 'number') {
          tempo = tempoDir.value;
        }
      }

      // Count notes and collect articulations/dynamics/ornaments
      measure.notes.forEach(note => {
        if (!note.chord) { // Don't count chord notes twice
          totalNotes++;
        }

        if (note.articulations) {
          note.articulations.forEach(art => articulations.add(art));
        }

        if (note.dynamics) {
          dynamics.add(note.dynamics);
        }

        if (note.ornaments) {
          note.ornaments.forEach(orn => ornaments.add(orn));
        }

        // Also collect dynamics from directions
        measure.directions?.forEach(dir => {
          if (dir.type === 'dynamics' && typeof dir.value === 'string') {
            dynamics.add(dir.value);
          }
        });
      });
    });
  });

  return {
    totalParts: semantic.parts.length,
    totalMeasures,
    totalNotes,
    title: semantic.title || null,
    composer: semantic.composer || null,
    partNames: semantic.parts.map(p => p.name),
    tempo,
    timeSignature,
    keySignature,
    semanticSize,
    originalSize,
    sizeReduction,
    articulations,
    dynamics,
    ornaments,
  };
};

export const SemanticStats: React.FC<SemanticStatsProps> = ({ semantic, originalSize }) => {
  const stats = useMemo(() => {
    if (!semantic) return null;
    return calculateStats(semantic, originalSize);
  }, [semantic, originalSize]);

  if (!semantic || !stats) {
    return null;
  }

  return (
    <div className="musicxml-stats">
      <h3>🤖 LLM-Friendly Format Statistics</h3>
      
      <div className="stats-grid">
        {stats.title && (
          <div className="stat-card featured">
            <span className="stat-icon">🎵</span>
            <div className="stat-content">
              <div className="stat-label">Title</div>
              <div className="stat-value">{stats.title}</div>
            </div>
          </div>
        )}

        {stats.composer && (
          <div className="stat-card featured">
            <span className="stat-icon">✍️</span>
            <div className="stat-content">
              <div className="stat-label">Composer</div>
              <div className="stat-value">{stats.composer}</div>
            </div>
          </div>
        )}

        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-content">
            <div className="stat-label">Size Reduction</div>
            <div className="stat-value">{stats.sizeReduction}%</div>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">💾</span>
          <div className="stat-content">
            <div className="stat-label">Semantic Size</div>
            <div className="stat-value">{Math.round(stats.semanticSize / 1024)} KB</div>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📄</span>
          <div className="stat-content">
            <div className="stat-label">Original Size</div>
            <div className="stat-value">{Math.round(stats.originalSize / 1024)} KB</div>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🎼</span>
          <div className="stat-content">
            <div className="stat-label">Parts</div>
            <div className="stat-value">{stats.totalParts}</div>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <div className="stat-label">Measures</div>
            <div className="stat-value">{stats.totalMeasures}</div>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🎹</span>
          <div className="stat-content">
            <div className="stat-label">Notes</div>
            <div className="stat-value">{stats.totalNotes}</div>
          </div>
        </div>

        {stats.keySignature && (
          <div className="stat-card">
            <span className="stat-icon">🎶</span>
            <div className="stat-content">
              <div className="stat-label">Key Signature</div>
              <div className="stat-value">{stats.keySignature}</div>
            </div>
          </div>
        )}

        {stats.timeSignature && (
          <div className="stat-card">
            <span className="stat-icon">⏱️</span>
            <div className="stat-content">
              <div className="stat-label">Time Signature</div>
              <div className="stat-value">{stats.timeSignature}</div>
            </div>
          </div>
        )}

        {stats.tempo && (
          <div className="stat-card">
            <span className="stat-icon">🎵</span>
            <div className="stat-content">
              <div className="stat-label">Tempo</div>
              <div className="stat-value">{stats.tempo} BPM</div>
            </div>
          </div>
        )}
      </div>

      {stats.partNames.length > 0 && (
        <div className="parts-list">
          <h4>🎻 Parts ({stats.totalParts})</h4>
          <div className="parts-grid">
            {stats.partNames.map((name, idx) => (
              <div key={idx} className="part-badge">
                {name}
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.dynamics.size > 0 && (
        <div className="parts-list">
          <h4>🔊 Dynamics ({stats.dynamics.size})</h4>
          <div className="parts-grid">
            {Array.from(stats.dynamics).map((dynamic, idx) => (
              <div key={idx} className="part-badge">
                {dynamic}
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.articulations.size > 0 && (
        <div className="parts-list">
          <h4>🎯 Articulations ({stats.articulations.size})</h4>
          <div className="parts-grid">
            {Array.from(stats.articulations).map((art, idx) => (
              <div key={idx} className="part-badge">
                {art}
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.ornaments.size > 0 && (
        <div className="parts-list">
          <h4>✨ Ornaments ({stats.ornaments.size})</h4>
          <div className="parts-grid">
            {Array.from(stats.ornaments).map((orn, idx) => (
              <div key={idx} className="part-badge">
                {orn}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
