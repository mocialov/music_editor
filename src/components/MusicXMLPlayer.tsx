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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [measuresPerPage] = useState(50);
  const [usePagination, setUsePagination] = useState(false);
  
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const notesDataRef = useRef<Array<{ time: number; note: string; duration: number }>>([]);
  const animationFrameRef = useRef<number | null>(null);
  const cursorIndexRef = useRef<number>(0);
  const [_currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const newOsmd = new OpenSheetMusicDisplay(containerRef.current, {
      autoResize: true,
      drawTitle: false,
      drawComposer: false,
      drawingParameters: 'compacttight',
    });
    setOsmd(newOsmd);
    
    // Initialize synth
    synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    
    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      Tone.Transport.stop();
      Tone.Transport.cancel();
    };
  }, []);

  useEffect(() => {
    if (!osmd || !xmlContent) return;
    const loadAndRender = async () => {
      try {
        await osmd.load(xmlContent);
        
        // Get measure count
        const sourceMeasures = osmd.Sheet.SourceMeasures;
        if (sourceMeasures) {
          const measureCount = sourceMeasures.length;
          setTotalMeasureCount(measureCount);
          
          console.log('Total measures:', measureCount);
          console.log('Measures per page:', measuresPerPage);
          
          // Enable pagination if more than 50 measures
          if (measureCount > measuresPerPage) {
            setUsePagination(true);
            const pages = Math.ceil(measureCount / measuresPerPage);
            setTotalPages(pages);
            console.log('Pagination enabled. Total pages:', pages);
            
            // Set options to render only first page
            osmd.setOptions({
              renderSingleHorizontalStaffline: false,
            });
          } else {
            setUsePagination(false);
            setTotalPages(1);
            console.log('Pagination disabled - not enough measures');
          }
          
          osmd.render();
        } else {
          osmd.render();
        }
        
        // Enable and initialize cursor
        osmd.cursor.show();
        
        // Parse MusicXML and extract notes
        createPlaybackSequence();
      } catch (error) {
        console.error('Error rendering MusicXML:', error);
      }
    };
    loadAndRender();
  }, [osmd, xmlContent, measuresPerPage]);

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  const createPlaybackSequence = () => {
    if (!xmlContent || !synthRef.current) return;
    
    // Clear existing part
    if (partRef.current) {
      partRef.current.dispose();
    }
    
    const notes: Array<{ time: number; note: string; duration: number }> = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Get tempo
      let beatsPerMinute = tempo;
      const soundElement = xmlDoc.querySelector('sound[tempo]');
      if (soundElement) {
        const tempoAttr = soundElement.getAttribute('tempo');
        if (tempoAttr && tempo === 120) {
          beatsPerMinute = parseFloat(tempoAttr);
          setTempo(beatsPerMinute);
        }
      }
      
      const parts = xmlDoc.querySelectorAll('part');
      
      // Process each part - IMPORTANT: Each part starts at time 0 (they play simultaneously)
      parts.forEach((part) => {
        const measures = part.querySelectorAll('measure');
        let currentDivisions = 1;
        
        // Track time separately for each voice in this part
        const voiceTimers = new Map<string, number>();
        let measureStartTime = 0;
        
        measures.forEach((measure) => {
          // Reset to measure start for all voices
          let measureCursor = measureStartTime;
          
          // Check for divisions
          const attributesElement = measure.querySelector('attributes');
          if (attributesElement) {
            const divisionsElement = attributesElement.querySelector('divisions');
            if (divisionsElement) {
              currentDivisions = parseInt(divisionsElement.textContent || '1');
            }
          }
          
          const secondsPerBeat = 60 / beatsPerMinute;
          const secondsPerDivision = secondsPerBeat / currentDivisions;
          
          // Process all elements in the measure
          const measureChildren = Array.from(measure.children);
          
          measureChildren.forEach((element) => {
            if (element.tagName !== 'note') return;
            
            const noteElement = element;
            const isRest = noteElement.querySelector('rest') !== null;
            const isChord = noteElement.querySelector('chord') !== null;
            
            // Get voice information for polyphonic music
            const voiceEl = noteElement.querySelector('voice');
            const voice = voiceEl ? voiceEl.textContent || '1' : '1';
            
            // Initialize voice timer if not exists
            if (!voiceTimers.has(voice)) {
              voiceTimers.set(voice, measureCursor);
            }
            
            let currentTime = voiceTimers.get(voice)!;
            
            const durationElement = noteElement.querySelector('duration');
            const durationDivisions = durationElement ? parseInt(durationElement.textContent || '0') : 0;
            const noteDuration = durationDivisions * secondsPerDivision;
            
            if (!isRest) {
              const pitchElement = noteElement.querySelector('pitch');
              if (pitchElement) {
                const step = pitchElement.querySelector('step')?.textContent || 'C';
                const octave = pitchElement.querySelector('octave')?.textContent || '4';
                const alterElement = pitchElement.querySelector('alter');
                const alter = alterElement ? parseInt(alterElement.textContent || '0') : 0;
                
                let noteName = step + octave;
                if (alter === 1) noteName = step + '#' + octave;
                if (alter === -1) noteName = step + 'b' + octave;
                if (alter === 2) noteName = step + '##' + octave;
                if (alter === -2) noteName = step + 'bb' + octave;
                
                notes.push({
                  time: currentTime,
                  note: noteName,
                  duration: noteDuration
                });
              }
            }
            
            // Advance time for this voice (unless this is a chord note)
            if (!isChord) {
              currentTime += noteDuration;
              voiceTimers.set(voice, currentTime);
            }
          });
          
          // Move to next measure - use the furthest point any voice reached
          let maxMeasureTime = measureStartTime;
          voiceTimers.forEach(time => {
            maxMeasureTime = Math.max(maxMeasureTime, time);
          });
          measureStartTime = maxMeasureTime;
        });
      });
      
      console.log('Extracted notes:', notes.length);
      notesDataRef.current = notes;
      
      if (notes.length > 0) {
        // Create a map to track when to advance cursor
        // We'll advance cursor every N milliseconds worth of notes to avoid too many updates
        const cursorAdvanceThreshold = 0.1; // Advance every 100ms of music
        let lastCursorTime = -1;
        
        partRef.current = new Tone.Part((time, value) => {
          if (typeof value === 'object' && 'note' in value && 'duration' in value) {
            synthRef.current?.triggerAttackRelease(value.note, value.duration, time);
            
            // Schedule cursor advance at the exact moment this note plays
            Tone.Draw.schedule(() => {
              if (osmd && value.time - lastCursorTime >= cursorAdvanceThreshold) {
                try {
                  osmd.cursor.next();
                  lastCursorTime = value.time;
                  
                  // Auto-navigate pages during playback
                  if (usePagination && osmd.cursor.iterator) {
                    try {
                      const voiceEntries = osmd.cursor.iterator.CurrentVoiceEntries;
                      if (voiceEntries && voiceEntries.length > 0) {
                        const firstEntry = voiceEntries[0];
                        if (firstEntry && firstEntry.ParentSourceStaffEntry && 
                            firstEntry.ParentSourceStaffEntry.VerticalContainerParent) {
                          const measureNumber = firstEntry.ParentSourceStaffEntry.VerticalContainerParent.ParentMeasure?.MeasureNumber || 1;
                          const requiredPage = Math.floor((measureNumber - 1) / measuresPerPage) + 1;
                          
                          if (requiredPage !== currentPage && requiredPage <= totalPages) {
                            setCurrentPage(requiredPage);
                          }
                        }
                      }
                    } catch (e) {
                      // Ignore cursor tracking errors
                    }
                  }
                } catch (e) {
                  // Cursor reached end
                }
              }
            }, time);
          }
        }, notes.map(n => [n.time, n]));
        
        partRef.current.loop = false;
      }
    } catch (error) {
      console.error('Error parsing MusicXML:', error);
    }
  };

  const updateCursor = () => {
    if (!osmd || Tone.Transport.state !== 'started') return;
    
    const currentSeconds = Tone.Transport.seconds;
    setCurrentTime(currentSeconds);
    
    animationFrameRef.current = requestAnimationFrame(updateCursor);
  };

  const togglePlayback = async () => {
    if (!partRef.current) return;
    
    await Tone.start();
    
    if (isPlaying) {
      Tone.Transport.pause();
      setIsPlaying(false);
      
      // Stop cursor animation
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      if (Tone.Transport.state !== 'started') {
        partRef.current.start(0);
        Tone.Transport.start();
      } else {
        Tone.Transport.start();
      }
      setIsPlaying(true);
      
      // Start cursor animation
      if (osmd) {
        updateCursor();
      }
    }
  };

  const handleStop = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    cursorIndexRef.current = 0;
    
    if (partRef.current) {
      partRef.current.stop();
    }
    
    // Stop cursor animation and reset
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (osmd) {
      osmd.cursor.reset();
    }
    
    // Reset to first page
    if (usePagination) {
      setCurrentPage(1);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (!osmd || !usePagination || !containerRef.current) return;
    
    setCurrentPage(newPage);
    
    // Calculate which measure to scroll to
    const targetMeasure = ((newPage - 1) * measuresPerPage);
    
    console.log(`Changing to page ${newPage}, scrolling to measure ${targetMeasure + 1}`);
    
    // Find the measure element and scroll to it
    const container = containerRef.current;
    const svg = container.querySelector('svg');
    if (svg) {
      // Estimate scroll position based on page (rough approximation)
      const svgHeight = svg.getBoundingClientRect().height;
      const scrollPosition = (svgHeight / totalPages) * (newPage - 1);
      container.scrollTop = scrollPosition;
    }
  };

  const handleDownloadAudio = async () => {
    if (!notesDataRef.current || notesDataRef.current.length === 0) {
      alert('No music to export. Please load a MusicXML file first.');
      return;
    }

    try {
      // Calculate total duration
      const maxTime = Math.max(...notesDataRef.current.map(n => n.time + n.duration));
      const duration = maxTime + 1; // Add 1 second buffer

      // Use Tone.Offline to render audio
      const buffer = await Tone.Offline(({ transport }) => {
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        
        const part = new Tone.Part((time, value) => {
          if (typeof value === 'object' && 'note' in value && 'duration' in value) {
            synth.triggerAttackRelease(value.note, value.duration, time);
          }
        }, notesDataRef.current.map(n => [n.time, n]));
        
        part.start(0);
        transport.bpm.value = tempo;
        transport.start();
      }, duration);

      // Convert to WAV
      const audioBuffer = buffer.get() as AudioBuffer;
      const wav = bufferToWave(audioBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `music_${Date.now()}.wav`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audio:', error);
      alert('Failed to export audio. Please try again.');
    }
  };

  // Helper function to convert AudioBuffer to WAV
  const bufferToWave = (buffer: AudioBuffer): ArrayBuffer => {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length * numberOfChannels * 2;
    const outputBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(outputBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // "RIFF" chunk descriptor
    setUint32(0x46464952);
    setUint32(36 + length);
    setUint32(0x45564157);

    // "fmt " sub-chunk
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numberOfChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numberOfChannels * 2);
    setUint16(numberOfChannels * 2);
    setUint16(16);

    // "data" sub-chunk
    setUint32(0x61746164);
    setUint32(length);

    // Write interleaved data
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < outputBuffer.byteLength) {
      for (let i = 0; i < numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return outputBuffer;
  };

  return (
    <div className="musicxml-player">
      <div className="player-controls-bar">
        <button className="play-button" onClick={togglePlayback}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button className="play-button" onClick={handleStop}>
          ⏹
        </button>

        <button 
          className="play-button download-button" 
          onClick={handleDownloadAudio}
          title="Download as WAV"
        >
          ⬇ WAV
        </button>

        <div className="player-settings">
          <div className="tempo-control">
            <span>Tempo (BPM)</span>
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

      {usePagination && totalMeasureCount > 0 && (
        <div className="pagination-controls">
          <button disabled={currentPage === 1} onClick={() => handlePageChange(1)} title="First page">⏮</button>
          <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Previous</button>
          <div className="page-input-container">
            <span className="page-label">Page</span>
            <input 
              type="number" 
              min="1" 
              max={totalPages} 
              value={currentPage}
              onChange={(e) => {
                const pageNum = parseInt(e.target.value);
                if (pageNum >= 1 && pageNum <= totalPages) {
                  handlePageChange(pageNum);
                }
              }}
              className="page-input"
            />
            <span className="page-label">of {totalPages}</span>
          </div>
          <span className="page-info">
            (Measures {((currentPage - 1) * measuresPerPage) + 1} - {Math.min(currentPage * measuresPerPage, totalMeasureCount)})
          </span>
          <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Next</button>
          <button disabled={currentPage === totalPages} onClick={() => handlePageChange(totalPages)} title="Last page">⏭</button>
        </div>
      )}
    </div>
  );
};
