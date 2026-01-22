import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
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
  const [volume, setVolume] = useState(-12); // Default volume in dB (-12dB is much quieter)
  
  const synthsRef = useRef<Map<string, Tone.PolySynth>>(new Map());
  const partRef = useRef<Tone.Part | null>(null);
  const notesDataRef = useRef<Array<{ time: number; note: string; duration: number; partId: string }>>([]);
  const animationFrameRef = useRef<number | null>(null);
  const cursorIndexRef = useRef<number>(0);
  const [_currentTime, setCurrentTime] = useState(0);
  const masterGainRef = useRef<Tone.Volume | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const compressorRef = useRef<Tone.Compressor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const newOsmd = new OpenSheetMusicDisplay(containerRef.current, {
      autoResize: true,
      drawTitle: false,
      drawComposer: false,
      drawingParameters: 'compacttight',
      drawPartNames: true,          // Shows full instrument names at the start
      drawPartAbbreviations: true,  // Shows abbreviated names on subsequent systems
    });
    setOsmd(newOsmd);
    
    // Initialize audio effects chain
    masterGainRef.current = new Tone.Volume(volume).toDestination();
    reverbRef.current = new Tone.Reverb({ decay: 1.5, wet: 0.15 }).connect(masterGainRef.current);
    compressorRef.current = new Tone.Compressor(-20, 3).connect(reverbRef.current);
    
    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }
      // Dispose all synths and effects
      synthsRef.current.forEach(synth => synth.dispose());
      synthsRef.current.clear();
      masterGainRef.current?.dispose();
      reverbRef.current?.dispose();
      compressorRef.current?.dispose();
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

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.volume.value = volume;
    }
  }, [volume]);

  const createPlaybackSequence = () => {
    if (!xmlContent) return;
    
    // Clear existing part
    if (partRef.current) {
      partRef.current.dispose();
    }
    
    // Clear and reinitialize synths
    synthsRef.current.forEach(synth => synth.dispose());
    synthsRef.current.clear();
    
    const notes: Array<{ time: number; note: string; duration: number; partId: string }> = [];
    
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
      parts.forEach((part, partIndex) => {
        const partId = part.getAttribute('id') || `P${partIndex + 1}`;
        
        // Create a synth for this part if it doesn't exist
        if (!synthsRef.current.has(partId)) {
          // Use AMSynth for more musical, less harsh sound
          const synth = new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: 2.5,
            oscillator: { type: 'sine' },
            envelope: {
              attack: 0.01,
              decay: 0.2,
              sustain: 0.3,
              release: 0.8
            },
            modulation: { type: 'square' },
            modulationEnvelope: {
              attack: 0.01,
              decay: 0.3,
              sustain: 0.1,
              release: 0.2
            }
          });
          
          // Add panning for stereo separation
          const panner = new Tone.Panner((partIndex - parts.length / 2) * 0.3);
          
          // Connect to effects chain instead of directly to destination
          if (compressorRef.current) {
            synth.chain(panner, compressorRef.current);
          } else {
            synth.toDestination();
          }
          
          synthsRef.current.set(partId, synth);
        }
        
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
            const isGrace = noteElement.querySelector('grace') !== null;
            
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
            
            // Only process notes that are not rests and not grace notes (to match stats counting)
            if (!isRest && !isGrace) {
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
                  time: Math.max(0, currentTime), // Ensure time is never negative
                  note: noteName,
                  duration: Math.max(0.01, noteDuration), // Ensure duration is positive
                  partId: partId
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
          if (typeof value === 'object' && 'note' in value && 'duration' in value && 'partId' in value) {
            // Ensure time is never negative (fix floating-point precision issues)
            const safeTime = Math.max(0, time);
            
            // Use the synth for this specific part
            const synth = synthsRef.current.get(value.partId);
            if (synth) {
              synth.triggerAttackRelease(value.note, value.duration, safeTime);
            }
            
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
        // Use same better synth for export
        const gain = new Tone.Volume(-12).toDestination();
        const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.15 }).connect(gain);
        const compressor = new Tone.Compressor(-20, 3).connect(reverb);
        const synth = new Tone.PolySynth(Tone.AMSynth, {
          harmonicity: 2.5,
          oscillator: { type: 'sine' },
          envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.3,
            release: 0.8
          },
          modulation: { type: 'square' },
          modulationEnvelope: {
            attack: 0.01,
            decay: 0.3,
            sustain: 0.1,
            release: 0.2
          }
        }).connect(compressor);
        
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

  const handleDownloadMidi = async () => {
    try {
      if (notesDataRef.current.length === 0) {
        alert('No notes to export. Please load a score first.');
        return;
      }

      // Create MIDI file
      const midi = new Midi();
      const track = midi.addTrack();
      
      // Add notes to track
      notesDataRef.current.forEach(noteData => {
        track.addNote({
          midi: Tone.Frequency(noteData.note).toMidi(),
          time: noteData.time,
          duration: noteData.duration,
          velocity: 0.8
        });
      });
      
      // Set tempo
      midi.header.setTempo(tempo);
      
      // Convert MIDI to blob
      const midiArray = midi.toArray();
      const blob = new Blob([midiArray as any], { type: 'audio/midi' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `music_${Date.now()}.mid`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting MIDI:', error);
      alert('Failed to export MIDI. Please try again.');
    }
  };

  const handleDownloadMusicXML = () => {
    try {
      if (!xmlContent) {
        alert('No MusicXML content to download. Please load a score first.');
        return;
      }

      // Create blob from XML content
      const blob = new Blob([xmlContent], { type: 'application/vnd.recordare.musicxml+xml' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `music_${Date.now()}.musicxml`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting MusicXML:', error);
      alert('Failed to export MusicXML. Please try again.');
    }
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

        <button 
          className="play-button download-button" 
          onClick={handleDownloadMidi}
          title="Download as MIDI"
        >
          ⬇ MIDI
        </button>

        <button 
          className="play-button download-button" 
          onClick={handleDownloadMusicXML}
          title="Download as MusicXML"
        >
          ⬇ XML
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
          
          <div className="volume-control">
            <span>🔊 Volume</span>
            <input 
              type="range" 
              min="-40" 
              max="0" 
              value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))}
              title={`${volume} dB`}
            />
            <span>{volume > -40 ? Math.round((volume + 40) / 40 * 100) + '%' : 'Mute'}</span>
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
