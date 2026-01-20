import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import * as Tone from 'tone';
import './MusicXMLPlayer.css';

interface MusicXMLPlayerProps {
  xmlContent: string | null;
}

export const MusicXMLPlayer: React.FC<MusicXMLPlayerProps> = ({ xmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [osmd, setOsmd] = useState<OpenSheetMusicDisplay | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [totalMeasureCount, setTotalMeasureCount] = useState(0);
  const [currentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);
  
  const synthsRef = useRef<Map<string, Tone.PolySynth>>(new Map());
  const partsRef = useRef<Map<string, Tone.Part>>(new Map());
  // const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const newOsmd = new OpenSheetMusicDisplay(containerRef.current, {
      autoResize: true,
      drawTitle: false,
      drawComposer: false,
    });
    setOsmd(newOsmd);
    return () => {
      partsRef.current.forEach(part => part.dispose());
      synthsRef.current.forEach(synth => synth.dispose());
    };
  }, []);

  useEffect(() => {
    if (!osmd || !xmlContent) return;
    const loadAndRender = async () => {
      try {
        await osmd.load(xmlContent);
        osmd.render();
        
        // Basic duration estimation for progress bar
        const sourceMeasures = osmd.Sheet.SourceMeasures;
        if (sourceMeasures) {
          setTotalMeasureCount(sourceMeasures.length);
          setTotalDuration((sourceMeasures.length * 4 * 60) / tempo);
        }
      } catch (error) {
        console.error('Error rendering MusicXML:', error);
      }
    };
    loadAndRender();
  }, [osmd, xmlContent]);

  const togglePlayback = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
    }
    if (isPlaying) {
      Tone.Transport.pause();
    } else {
      Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="musicxml-player">
      <div className="player-controls-bar">
        <button className="play-button" onClick={togglePlayback}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <div className="playback-progress">
          <span className="time-label">{formatTime(currentTime)}</span>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${(currentTime / (totalDuration || 1)) * 100}%` }}
            >
              <div className="progress-bar-handle" />
            </div>
          </div>
          <span className="time-label">{formatTime(totalDuration)}</span>
        </div>

        <div className="player-settings">
          <div className="tempo-control">
            <span>Tempo</span>
            <input 
              type="range" 
              min="40" 
              max="240" 
              value={tempo} 
              onChange={(e) => setTempo(Number(e.target.value))}
            />
            <span>{tempo}</span>
          </div>
        </div>
      </div>

      <div className="sheet-music-container" ref={containerRef} />

      {totalMeasureCount > 0 && (
        <div className="pagination-controls">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
          <span className="page-info">Measures 1 - {totalMeasureCount}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};
