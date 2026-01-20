import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import * as Tone from 'tone';
import PlaybackManager from 'osmd-audio-player';
import './MusicXMLPlayer.css';

interface MusicXMLPlayerProps {
  xmlContent: string | null;
}

export const MusicXMLPlayer: React.FC<MusicXMLPlayerProps> = ({ xmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdAudioContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'custom' | 'osmd-audio'>('custom');
  const [osmd, setOsmd] = useState<OpenSheetMusicDisplay | null>(null);
  const [osmdAudio, setOsmdAudio] = useState<OpenSheetMusicDisplay | null>(null);
  const [playbackManager, setPlaybackManager] = useState<PlaybackManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [isDownloading, setIsDownloading] = useState(false);
  const [visibleMeasures, setVisibleMeasures] = useState(32); // Show first 32 measures initially
  const [totalMeasureCount, setTotalMeasureCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const synthsRef = useRef<Map<string, Tone.PolySynth>>(new Map());
  const partsRef = useRef<Map<string, Tone.Part>>(new Map());
  const notesDataRef = useRef<Map<string, Array<{ time: number; note: string; duration: number }>>>(new Map());
  const fullXmlRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const seekOffsetRef = useRef<number>(0); // Track the seek offset for playback position
  const baseDurationRef = useRef<{ maxPartDuration: number; originalTempo: number }>({ maxPartDuration: 0, originalTempo: 120 });
  const triggeredCountRef = useRef<number>(0); // Track how many notes have been triggered

  useEffect(() => {
    if (!containerRef.current) return;

    const newOsmd = new OpenSheetMusicDisplay(containerRef.current, {
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
    });

    setOsmd(newOsmd);

    return () => {
      // Cleanup all parts
      partsRef.current.forEach(part => part.dispose());
      partsRef.current.clear();
      
      // Cleanup all synths
      synthsRef.current.forEach(synth => synth.dispose());
      synthsRef.current.clear();
    };
  }, []);

  // Initialize OSMD Audio Player
  useEffect(() => {
    if (!osmdAudioContainerRef.current) return;

    const newOsmdAudio = new OpenSheetMusicDisplay(osmdAudioContainerRef.current, {
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
    });

    setOsmdAudio(newOsmdAudio);

    return () => {
      if (playbackManager) {
        playbackManager.stop();
      }
    };
  }, []);

  // Load and setup OSMD Audio Player
  useEffect(() => {
    if (!osmdAudio || !xmlContent || activeTab !== 'osmd-audio') return;

    const loadAndSetup = async () => {
      try {
        console.log('Loading MusicXML into OSMD Audio Player...');
        await osmdAudio.load(xmlContent);
        osmdAudio.render();
        
        // Create PlaybackManager (it's actually PlaybackEngine)
        // Note: There's a version mismatch between osmd-audio-player's OSMD version and ours
        // Using type assertion as workaround
        const manager = new PlaybackManager();
        await manager.loadScore(osmdAudio as any);
        setPlaybackManager(manager);
        console.log('OSMD Audio Player ready');
      } catch (error) {
        console.error('Error loading OSMD Audio Player:', error);
      }
    };

    loadAndSetup();
  }, [osmdAudio, xmlContent, activeTab]);

  useEffect(() => {
    if (!osmd || !xmlContent || activeTab !== 'custom') return;

    const loadAndRender = async () => {
      try {
        console.log('Loading MusicXML into OSMD...');
        fullXmlRef.current = xmlContent;
        
        // Parse to check measure count (count from first part only to avoid duplicates)
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
        const firstPart = xmlDoc.querySelector('part');
        const measures = firstPart ? firstPart.querySelectorAll('measure') : xmlDoc.querySelectorAll('measure');
        const totalMeasures = measures.length;
        setTotalMeasureCount(totalMeasures);
        
        console.log(`Total measures: ${totalMeasures}`);
        
        // Load first set of measures or entire piece if small enough
        let xmlToLoad = xmlContent;
        if (totalMeasures > visibleMeasures) {
          xmlToLoad = extractMeasuresFromStart(xmlContent, visibleMeasures);
        }
        
        await osmd.load(xmlToLoad);
        console.log('MusicXML loaded successfully, rendering...');
        osmd.render();
        console.log('Rendered successfully, creating playback sequence...');
        createPlaybackSequence();
      } catch (error) {
        console.error('Error loading/rendering MusicXML:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
    };

    loadAndRender();
  }, [osmd, xmlContent, visibleMeasures]);

  // Helper function to create appropriate synth based on MIDI program number and channel
  const createSynthForProgram = (program: number, channel: number, volume: number = -6, pan: number = 0): Tone.PolySynth => {
    // Channel 10 is always drums - use membrane synth for percussion sounds
    if (channel === 10) {
      const panner = new Tone.Panner(pan).toDestination();
      const synth = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.05,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.2 },
        volume,
      }).connect(panner);
      synth.maxPolyphony = 16; // Drums often have many simultaneous hits
      return synth;
    }
    
    // MIDI program groups: 0-7=Piano, 8-15=Chromatic Percussion, 16-23=Organ, 
    // 24-31=Guitar, 32-39=Bass, 40-47=Strings, 48-55=Ensemble, 56-63=Brass,
    // 64-71=Reed, 72-79=Pipe, 80-87=Synth Lead, 88-95=Synth Pad, etc.
    
    let synthConfig: any;
    
    if (program >= 0 && program <= 7) {
      // Piano - bright attack, sustained
      synthConfig = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
      };
    } else if (program >= 8 && program <= 15) {
      // Chromatic Percussion (vibraphone, marimba) - bell-like
      synthConfig = {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.5 },
      };
    } else if (program >= 16 && program <= 23) {
      // Organ - sustained, no decay
      synthConfig = {
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.01, sustain: 0.9, release: 0.1 },
      };
    } else if (program >= 24 && program <= 31) {
      // Guitar - plucked
      synthConfig = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
      };
    } else if (program >= 32 && program <= 39) {
      // Bass - lower frequencies, sustained
      synthConfig = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.3 },
      };
    } else if (program >= 40 && program <= 47) {
      // Strings - slow attack, long sustain
      synthConfig = {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.7, release: 1 },
      };
    } else if (program >= 48 && program <= 55) {
      // Ensemble - choir, strings ensemble
      synthConfig = {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.6, release: 0.8 },
      };
    } else if (program >= 56 && program <= 63) {
      // Brass - bright, sustained
      synthConfig = {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.5 },
      };
    } else if (program >= 64 && program <= 71) {
      // Reed (saxophone, clarinet) - woody
      synthConfig = {
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.4 },
      };
    } else if (program >= 72 && program <= 79) {
      // Pipe (flute, recorder) - airy
      synthConfig = {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 0.3 },
      };
    } else {
      // Default synth for other programs
      synthConfig = {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.5 },
      };
    }
    
    // Create panner for stereo positioning
    const panner = new Tone.Panner(pan).toDestination();
    
    const synth = new Tone.PolySynth(Tone.Synth, {
      ...synthConfig,
      volume,
    }).connect(panner);
    
    synth.maxPolyphony = 32; // Each part can have up to 32 simultaneous notes
    
    return synth;
  };

  const createPlaybackSequence = () => {
    if (!osmd) return;
    
    // Use the full XML content, not the potentially paginated version
    const xmlToUse = fullXmlRef.current || xmlContent;
    if (!xmlToUse) return;

    // Clear existing synths and parts
    partsRef.current.forEach(part => part.dispose());
    partsRef.current.clear();
    synthsRef.current.forEach(synth => synth.dispose());
    synthsRef.current.clear();
    notesDataRef.current.clear();
    
    try {
      // Parse the MusicXML content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlToUse, 'text/xml');
      
      // First, extract MIDI instrument information from part-list
      const partList = xmlDoc.querySelector('part-list');
      const partInstruments = new Map<string, { program: number; channel: number; volume: number; pan: number; name: string }>();
      
      if (partList) {
        const scoreParts = partList.querySelectorAll('score-part');
        scoreParts.forEach(scorePart => {
          const partId = scorePart.getAttribute('id') || '';
          const partName = scorePart.querySelector('part-name')?.textContent || 'Unknown';
          const midiInstrument = scorePart.querySelector('midi-instrument');
          
          let program = 0; // Default to Acoustic Grand Piano
          let channel = 1;
          let volume = -6;
          let pan = 0; // Center pan (-1 to 1)
          
          if (midiInstrument) {
            const programEl = midiInstrument.querySelector('midi-program');
            const channelEl = midiInstrument.querySelector('midi-channel');
            const volumeEl = midiInstrument.querySelector('volume');
            const panEl = midiInstrument.querySelector('pan');
            
            if (programEl) {
              // MIDI programs are 1-indexed in MusicXML, but we use 0-indexed
              program = parseInt(programEl.textContent || '1') - 1;
            }
            if (channelEl) {
              channel = parseInt(channelEl.textContent || '1');
            }
            if (volumeEl) {
              // MusicXML volume is 0-100, convert to dB (approximate)
              const vol = parseFloat(volumeEl.textContent || '80');
              volume = -20 + (vol / 100) * 20; // Map 0-100 to -20dB to 0dB
            }
            if (panEl) {
              // MusicXML pan is -90 to 90 (or sometimes 0-180), convert to -1 to 1
              const panVal = parseFloat(panEl.textContent || '0');
              // Assuming -90 to 90 range
              pan = Math.max(-1, Math.min(1, panVal / 90));
            }
          }
          
          partInstruments.set(partId, { program, channel, volume, pan, name: partName });
          console.log(`Part ${partId} (${partName}): MIDI Program ${program}, Channel ${channel}, Volume ${volume}dB, Pan ${pan}`);
        });
      }
      
      // Get tempo - check both sound element and direction elements
      let beatsPerMinute = tempo; // Use current tempo state instead of always defaulting to 120
      let xmlTempo = 120; // Track what the XML specifies
      
      // First, check for sound element with tempo attribute
      const soundElement = xmlDoc.querySelector('sound[tempo]');
      if (soundElement) {
        const tempoAttr = soundElement.getAttribute('tempo');
        if (tempoAttr) {
          xmlTempo = parseFloat(tempoAttr);
        }
      }
      
      // Also check direction elements for metronome markings
      if (xmlTempo === 120) {
        const directions = xmlDoc.querySelectorAll('direction');
        for (const direction of directions) {
          const soundInDirection = direction.querySelector('sound[tempo]');
          if (soundInDirection) {
            const tempoAttr = soundInDirection.getAttribute('tempo');
            if (tempoAttr) {
              xmlTempo = parseFloat(tempoAttr);
              break;
            }
          }
        }
      }
      
      // Only update tempo state if this is the initial load (tempo matches default)
      // Otherwise, use the user-set tempo
      if (tempo === 120 && xmlTempo !== 120) {
        beatsPerMinute = xmlTempo;
        setTempo(xmlTempo);
      }
      
      console.log(`Tempo: ${beatsPerMinute} BPM (XML specifies ${xmlTempo} BPM)`);
      
      // Process each part separately to handle multi-part scores correctly
      const parts = xmlDoc.querySelectorAll('part');
      let maxPartDuration = 0; // Track the longest part duration
      
      console.log(`Processing ${parts.length} parts`);
      
      parts.forEach((part, partIndex) => {
        const partId = part.getAttribute('id') || `P${partIndex + 1}`;
        const partInfo = partInstruments.get(partId);
        
        // Track notes by voice and staff combinations
        // Key format: "voice-staff" (e.g., "1-1", "2-1", "1-2")
        const voiceStaffNotes = new Map<string, Array<{ time: number; note: string; duration: number }>>();
        
        console.log(`Part ${partId} (${partInfo?.name || 'Unknown'}): Using MIDI program ${partInfo?.program ?? 0}`);
        const measures = part.querySelectorAll('measure');
        
        // Track time separately for each voice to handle polyphonic notation
        const voiceTimers = new Map<string, number>();
        let measureCursor = 0; // Current position in the measure (affected by backup/forward)
        let measureStartTime = 0; // Start time of the current measure
        let maxTime = 0;
        let partNoteCount = 0;
        let currentDivisions = 1; // Track divisions per part
        let currentTempo = beatsPerMinute; // Track tempo changes
        
        // Track tied notes to avoid retriggering
        const tiedNotes = new Map<string, { startTime: number; pitch: string }>();
        
        measures.forEach((measure, measureIndex) => {
          // Reset measure cursor at the start of each measure
          measureCursor = measureStartTime;
          
          // Check for divisions updates in this measure's attributes
          const attributesElement = measure.querySelector('attributes');
          if (attributesElement) {
            const divisionsElement = attributesElement.querySelector('divisions');
            if (divisionsElement) {
              const newDivisions = parseInt(divisionsElement.textContent || '1');
              if (newDivisions !== currentDivisions) {
                console.log(`Part ${partIndex + 1}, Measure ${measureIndex + 1}: divisions changed from ${currentDivisions} to ${newDivisions}`);
                currentDivisions = newDivisions;
              }
            }
          }
          
          // Check for tempo changes in this measure
          const directionElements = measure.querySelectorAll('direction');
          directionElements.forEach(direction => {
            const soundEl = direction.querySelector('sound[tempo]');
            if (soundEl) {
              const newTempo = parseFloat(soundEl.getAttribute('tempo') || String(currentTempo));
              if (newTempo !== currentTempo) {
                console.log(`Part ${partIndex + 1}, Measure ${measureIndex + 1}: tempo changed from ${currentTempo} to ${newTempo}`);
                currentTempo = newTempo;
              }
            }
          });
          
          // Recalculate seconds per division based on current tempo
          const currentSecondsPerBeat = 60 / currentTempo;
          const secondsPerDivision = currentSecondsPerBeat / currentDivisions;
          
          // Process all elements in the measure (notes, backup, forward)
          const measureChildren = Array.from(measure.children);
          
          measureChildren.forEach((element) => {
            // Handle backup elements (move measure cursor backward)
            if (element.tagName === 'backup') {
              const durationEl = element.querySelector('duration');
              if (durationEl) {
                const backupDuration = parseInt(durationEl.textContent || '0') * secondsPerDivision;
                measureCursor -= backupDuration;
              }
              return;
            }
            
            // Handle forward elements (move measure cursor forward, like a rest)
            if (element.tagName === 'forward') {
              const durationEl = element.querySelector('duration');
              if (durationEl) {
                const forwardDuration = parseInt(durationEl.textContent || '0') * secondsPerDivision;
                measureCursor += forwardDuration;
              }
              return;
            }
            
            // Handle note elements
            if (element.tagName !== 'note') return;
            
            const noteElement = element;
            const isRest = noteElement.querySelector('rest') !== null;
            const isChord = noteElement.querySelector('chord') !== null;
            const isGrace = noteElement.querySelector('grace') !== null;
            
            // Get voice and staff information
            const voiceEl = noteElement.querySelector('voice');
            const staffEl = noteElement.querySelector('staff');
            const voice = voiceEl ? voiceEl.textContent || '1' : '1';
            const staff = staffEl ? staffEl.textContent || '1' : '1';
            const voiceStaffKey = `${voice}-${staff}`;
            
            // Initialize voice timer if not exists - start from current measure cursor
            if (!voiceTimers.has(voice)) {
              voiceTimers.set(voice, measureCursor);
            }
            
            // Get current time for this voice
            let currentTime = voiceTimers.get(voice)!;
            
            // Get duration
            const durationElement = noteElement.querySelector('duration');
            let durationDivisions = durationElement ? parseInt(durationElement.textContent || '0') : 0;
            
            // Safety check: if duration is invalid, skip this note
            if (durationDivisions < 0 || isNaN(durationDivisions)) {
              console.warn('Invalid duration, skipping note');
              return;
            }
            
            // Check for time modification (tuplets) - simplified
            const timeModEl = noteElement.querySelector('time-modification');
            if (timeModEl) {
              const actualNotesEl = timeModEl.querySelector('actual-notes');
              const normalNotesEl = timeModEl.querySelector('normal-notes');
              if (actualNotesEl && normalNotesEl) {
                const actualNotes = parseInt(actualNotesEl.textContent || '3');
                const normalNotes = parseInt(normalNotesEl.textContent || '2');
                // Tuplet timing: e.g., triplet plays 3 notes in time of 2
                if (actualNotes > 0 && normalNotes > 0) {
                  durationDivisions = Math.round(durationDivisions * (normalNotes / actualNotes));
                }
              }
            }
            
            const noteDuration = durationDivisions * secondsPerDivision;
            
            // Safety check: ensure duration is reasonable
            if (noteDuration < 0 || noteDuration > 60 || isNaN(noteDuration)) {
              console.warn(`Invalid note duration: ${noteDuration}, skipping note`);
              return;
            }
            
            // Grace notes have zero duration and don't advance time
            const actualDuration = isGrace ? 0.05 : noteDuration; // Grace notes get a tiny duration
            
            // Check for ties
            const notationsEl = noteElement.querySelector('notations');
            let tieType: string | null = null;
            if (notationsEl) {
              const tiedEl = notationsEl.querySelector('tied');
              if (tiedEl) {
                tieType = tiedEl.getAttribute('type');
              }
            }
            
            if (!isRest) {
              // Get pitch information
              const pitchElement = noteElement.querySelector('pitch');
              if (pitchElement) {
                const step = pitchElement.querySelector('step')?.textContent || 'C';
                const octave = pitchElement.querySelector('octave')?.textContent || '4';
                const alterElement = pitchElement.querySelector('alter');
                const alter = alterElement ? parseInt(alterElement.textContent || '0') : 0;
                
                // Build note name
                let noteName = step + octave;
                if (alter === 1) noteName = step + '#' + octave;
                if (alter === -1) noteName = step + 'b' + octave;
                if (alter === 2) noteName = step + '##' + octave;
                if (alter === -2) noteName = step + 'bb' + octave;
                
                const tieKey = `${voiceStaffKey}-${noteName}`;
                
                // Handle tied notes
                if (tieType === 'start') {
                  // Start of a tie - store the note
                  tiedNotes.set(tieKey, { startTime: currentTime, pitch: noteName });
                } else if (tieType === 'stop') {
                  // End of a tie - extend the previous note, don't add a new one
                  const tiedNote = tiedNotes.get(tieKey);
                  if (tiedNote) {
                    // Find and extend the duration of the tied note
                    const notes = voiceStaffNotes.get(voiceStaffKey);
                    if (notes) {
                      // Find the last note with matching pitch and start time
                      let noteToExtend = null;
                      for (let i = notes.length - 1; i >= 0; i--) {
                        const n = notes[i];
                        if (n.note === noteName && Math.abs(n.time - tiedNote.startTime) < 0.001) {
                          noteToExtend = n;
                          break;
                        }
                      }
                      if (noteToExtend) {
                        noteToExtend.duration += actualDuration;
                      }
                    }
                    tiedNotes.delete(tieKey);
                  }
                  // Don't add this note - it's a continuation
                } else {
                  // Regular note or middle of tie chain - add it
                  // Get or create array for this voice-staff combination
                  if (!voiceStaffNotes.has(voiceStaffKey)) {
                    voiceStaffNotes.set(voiceStaffKey, []);
                  }
                  
                  voiceStaffNotes.get(voiceStaffKey)!.push({
                    time: currentTime,
                    note: noteName,
                    duration: actualDuration,
                  });
                  partNoteCount++;
                  
                  // Log first few notes from each part for debugging
                  if (partNoteCount <= 3) {
                    console.log(`  Part ${partIndex + 1}, Note ${partNoteCount}: ${noteName} at ${currentTime.toFixed(3)}s, duration ${actualDuration.toFixed(3)}s${isGrace ? ' (grace)' : ''}`);
                  }
                }
              }
            }
            
            // Move time forward for this voice (unless this is a chord note)
            // Grace notes still advance time slightly to avoid all grace notes stacking at same time
            if (!isChord) {
              const timeAdvance = isGrace ? 0 : noteDuration;
              currentTime += timeAdvance;
              voiceTimers.set(voice, currentTime);
              measureCursor = Math.max(measureCursor, currentTime);
              maxTime = Math.max(maxTime, currentTime);
            } else {
              // Even for chord notes, track the max time
              maxTime = Math.max(maxTime, currentTime + actualDuration);
            }
          });
          
          // Update measure start time for next measure
          // It should be the furthest point any voice reached in this measure
          let maxMeasureTime = measureStartTime;
          voiceTimers.forEach(time => {
            maxMeasureTime = Math.max(maxMeasureTime, time);
          });
          measureStartTime = maxMeasureTime;
        });
        
        // Ensure maxTime has a reasonable value
        if (maxTime === 0 || isNaN(maxTime)) {
          console.warn(`Invalid maxTime (${maxTime}) for part ${partId}, using measureStartTime`);
          maxTime = Math.max(measureStartTime, 1); // At least 1 second
        }
        
        console.log(`Part ${partId}: ${partNoteCount} notes, duration: ${maxTime.toFixed(2)}s`);
        
        // Create separate synths and store notes for each voice-staff combination
        voiceStaffNotes.forEach((notes, voiceStaffKey) => {
          const uniqueKey = `${partId}-${voiceStaffKey}`;
          
          // Calculate pan offset based on voice/staff
          // For multi-staff instruments (like piano), pan slightly left/right
          const [voice, staff] = voiceStaffKey.split('-').map(Number);
          let panOffset = 0;
          
          if (voiceStaffNotes.size > 1) {
            // Multiple voices or staves - apply subtle panning
            if (voiceStaffNotes.size === 2) {
              // Two voices/staves: pan slightly left and right
              const index = Array.from(voiceStaffNotes.keys()).indexOf(voiceStaffKey);
              panOffset = (index === 0) ? -0.2 : 0.2;
            } else if (staff > 1) {
              // Multiple staves (e.g., piano): lower staff panned slightly left
              panOffset = staff === 1 ? 0.15 : -0.15;
            } else if (voice > 1) {
              // Multiple voices: spread across stereo field
              const voiceCount = voiceStaffNotes.size;
              const index = Array.from(voiceStaffNotes.keys()).indexOf(voiceStaffKey);
              panOffset = -0.3 + (0.6 / (voiceCount - 1)) * index;
            }
          }
          
          const finalPan = Math.max(-1, Math.min(1, (partInfo?.pan ?? 0) + panOffset));
          
          const synth = createSynthForProgram(
            partInfo?.program ?? 0,
            partInfo?.channel ?? 1,
            partInfo?.volume ?? -6,
            finalPan
          );
          synthsRef.current.set(uniqueKey, synth);
          notesDataRef.current.set(uniqueKey, notes);
          
          console.log(`  Voice ${voice}, Staff ${staff}: ${notes.length} notes, pan: ${finalPan.toFixed(2)}`);
        });
        
        // Track the maximum duration across all parts (they play simultaneously)
        maxPartDuration = Math.max(maxPartDuration, maxTime);
      });
      
      // Calculate total notes across all parts
      let totalNotes = 0;
      notesDataRef.current.forEach(partNotes => {
        totalNotes += partNotes.length;
      });
      console.log(`Parsed ${totalNotes} total notes from ${notesDataRef.current.size} parts`);
      
      // Calculate total duration using the longest part
      if (maxPartDuration > 0) {
        // Store the base duration and original tempo for recalculation when tempo changes
        baseDurationRef.current = {
          maxPartDuration: maxPartDuration,
          originalTempo: beatsPerMinute
        };
        setTotalDuration(maxPartDuration);
        console.log(`Total duration: ${maxPartDuration.toFixed(2)} seconds at ${beatsPerMinute} BPM`);
      } else {
        console.warn('No notes parsed - check if XML structure is correct');
      }
    } catch (error) {
      console.error('Error parsing MusicXML:', error);
    }

    // Create Tone.js Part for each instrument part
    if (notesDataRef.current.size === 0) {
      console.warn('No notes found in the score');
      return;
    }

    triggeredCountRef.current = 0; // Reset counter
    
    notesDataRef.current.forEach((notes, partId) => {
      const synth = synthsRef.current.get(partId);
      if (!synth || notes.length === 0) return;
      
      console.log(`Creating Tone.Part for ${partId} with ${notes.length} notes`);
      
      const part = new Tone.Part((time, value) => {
        if (synth && typeof value === 'object' && 'note' in value && 'duration' in value) {
          triggeredCountRef.current++;
          if (triggeredCountRef.current <= 10) {
            console.log(`[${partId}] Triggering note ${triggeredCountRef.current}:`, value.note, 'at time', time);
          }
          synth.triggerAttackRelease(value.note, value.duration, time);
        }
      }, notes.map(n => [n.time, n]));

      part.loop = false;
      
      // Set explicit duration
      if (notes.length > 0) {
        const lastNote = notes[notes.length - 1];
        const partDuration = lastNote.time + lastNote.duration;
        part.loopEnd = partDuration;
      }
      
      partsRef.current.set(partId, part);
      console.log(`Part ${partId} created with ${notes.length} events`);
    });
  };

  const updatePlaybackPosition = () => {
    if (Tone.getTransport().state === 'started') {
      const currentSeconds = Tone.getTransport().seconds + seekOffsetRef.current;
      setCurrentTime(currentSeconds);
      animationFrameRef.current = requestAnimationFrame(updatePlaybackPosition);
    }
  };

  const handlePlay = async () => {
    if (activeTab === 'osmd-audio') {
      if (playbackManager) {
        await playbackManager.play();
        setIsPlaying(true);
      }
      return;
    }

    // Custom playback
    if (partsRef.current.size === 0) {
      console.error('No parts available for playback');
      return;
    }

    console.log('handlePlay called, transport state:', Tone.getTransport().state);
    console.log(`Starting playback of ${partsRef.current.size} parts`);
    
    if (Tone.getTransport().state !== 'started') {
      await Tone.start();
      console.log('Tone.js started');
      
      // Keep Transport BPM at default 120 since we calculate times in absolute seconds
      // Tone.getTransport().bpm.value is intentionally NOT set here
      console.log('Using default transport BPM (note times are pre-calculated in seconds)');
      
      // Start all parts
      partsRef.current.forEach((part, partId) => {
        part.start(0);
        console.log(`Part ${partId} started at time 0`);
      });
      
      Tone.getTransport().start();
      console.log('Transport started');
      console.log('Transport BPM:', Tone.getTransport().bpm.value);
      console.log('Transport state:', Tone.getTransport().state);
      
      setIsPlaying(true);
      
      // Start updating playback position
      updatePlaybackPosition();

      // Auto-stop when finished
      const duration = totalDuration;
      console.log('Setting auto-stop timeout for duration:', duration);
      
      setTimeout(() => {
        console.log(`Playback completed. Total notes triggered: ${triggeredCountRef.current}`);
        handleStop();
      }, duration * 1000);
    }
  };

  const handlePause = () => {
    if (activeTab === 'osmd-audio') {
      if (playbackManager) {
        playbackManager.pause();
        setIsPlaying(false);
      }
      return;
    }

    // Custom playback
    Tone.getTransport().pause();
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleStop = () => {
    Tone.getTransport().stop();
    setIsPlaying(false);
    setCurrentTime(0);
    seekOffsetRef.current = 0; // Reset seek offset
    partsRef.current.forEach(part => part.stop());
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    
    // To change tempo, we need to recreate the playback sequence with adjusted times
    // Stop current playback
    const wasPlaying = isPlaying;
    if (wasPlaying) {
      handleStop();
    }
    
    // Recreate the playback sequence
    // This will recalculate all note times based on the new tempo
    createPlaybackSequence();
    
    // Recalculate duration based on the new tempo
    if (baseDurationRef.current.maxPartDuration > 0 && baseDurationRef.current.originalTempo > 0) {
      // Duration scales inversely with tempo: newDuration = oldDuration * (oldTempo / newTempo)
      const newDuration = baseDurationRef.current.maxPartDuration * (baseDurationRef.current.originalTempo / newTempo);
      setTotalDuration(newDuration);
    }
    
    // Restart if it was playing
    if (wasPlaying) {
      // Small delay to ensure parts are recreated
      setTimeout(() => handlePlay(), 100);
    }
  };

  const handleSeek = (time: number) => {
    // Clamp time to valid range to avoid floating-point precision errors
    const clampedTime = Math.max(0, Math.min(time, totalDuration));
    
    const wasPlaying = isPlaying;
    
    // Stop current playback and dispose all parts
    partsRef.current.forEach(part => {
      part.stop();
      part.dispose();
    });
    partsRef.current.clear();
    
    Tone.getTransport().stop();
    Tone.getTransport().cancel(); // Cancel all scheduled events
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Set new position
    setCurrentTime(clampedTime);
    seekOffsetRef.current = clampedTime; // Store the seek offset
    
    // Recreate Parts for each instrument with notes starting from the seek position
    notesDataRef.current.forEach((notes, partId) => {
      const synth = synthsRef.current.get(partId);
      if (!synth || notes.length === 0) return;
      
      // Filter notes that should play after the seek time and adjust their times
      const filteredNotes = notes
        .filter(n => n.time >= clampedTime)
        .map(n => ({
          time: n.time - clampedTime,
          note: n.note,
          duration: n.duration
        }));
      
      if (filteredNotes.length === 0) return;
      
      // Create new Part with filtered and adjusted notes
      const part = new Tone.Part((scheduleTime, value) => {
        if (synth && typeof value === 'object' && 'note' in value && 'duration' in value) {
          synth.triggerAttackRelease(value.note, value.duration, scheduleTime);
        }
      }, filteredNotes.map(n => [n.time, n]));

      part.loop = false;
      
      // Set explicit duration
      const lastNote = filteredNotes[filteredNotes.length - 1];
      part.loopEnd = lastNote.time + lastNote.duration;
      
      partsRef.current.set(partId, part);
    });
    
    // Restart if it was playing
    if (wasPlaying && partsRef.current.size > 0) {
      Tone.getTransport().seconds = 0; // Reset transport to 0 since we've adjusted note times
      partsRef.current.forEach(part => part.start(0));
      Tone.getTransport().start();
      setIsPlaying(true);
      updatePlaybackPosition();
    } else {
      Tone.getTransport().seconds = 0;
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * totalDuration;
    handleSeek(newTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Extract measures from the start to a given endpoint
  const extractMeasuresFromStart = (xml: string, endMeasure: number): string => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    
    const parts = xmlDoc.querySelectorAll('part');
    
    parts.forEach((part) => {
      const measures = Array.from(part.querySelectorAll('measure'));
      
      // Remove measures after the end point
      measures.forEach((measure, index) => {
        if (index >= endMeasure) {
          measure.remove();
        }
      });
    });
    
    const serializer = new XMLSerializer();
    return serializer.serializeToString(xmlDoc);
  };

  const handleLoadMore = async () => {
    if (!osmd || !fullXmlRef.current) return;
    
    try {
      // Increase visible measures by 32
      const newVisibleMeasures = Math.min(visibleMeasures + 32, totalMeasureCount);
      setVisibleMeasures(newVisibleMeasures);
    } catch (error) {
      console.error('Error loading more measures:', error);
    }
  };

  const handleDownload = async () => {
    if (notesDataRef.current.size === 0) {
      console.error('No notes to download');
      return;
    }

    setIsDownloading(true);

    try {
      // Calculate the total duration (use the longest part)
      let maxDuration = 0;
      notesDataRef.current.forEach(notes => {
        if (notes.length > 0) {
          const lastNote = notes[notes.length - 1];
          const partDuration = lastNote.time + lastNote.duration;
          maxDuration = Math.max(maxDuration, partDuration);
        }
      });
      const totalDurationForDownload = maxDuration + 0.5; // Add a small buffer

      // Render audio offline with all parts
      const buffer = await Tone.Offline(async ({ transport }) => {
        // Create synths for each part (similar to main playback)
        const offlineSynths = new Map<string, Tone.PolySynth>();
        const offlineParts: Tone.Part[] = [];
        
        // Extract MIDI info from current synths
        notesDataRef.current.forEach((notes, partId) => {
          // Create a basic synth for offline rendering
          // (we'd need to replicate the program-based logic, but keeping it simple)
          const synth = new Tone.PolySynth(Tone.Synth, {
            envelope: {
              attack: 0.005,
              decay: 0.1,
              sustain: 0.3,
              release: 0.5,
            },
            volume: -6,
          }).toDestination();
          synth.maxPolyphony = 32;
          
          offlineSynths.set(partId, synth);
          
          const part = new Tone.Part((time, value) => {
            if (typeof value === 'object' && 'note' in value && 'duration' in value) {
              synth.triggerAttackRelease(value.note, value.duration, time);
            }
          }, notes.map(n => [n.time, n]));
          
          offlineParts.push(part);
        });
        
        transport.bpm.value = tempo;
        
        // Start all parts
        offlineParts.forEach(part => part.start(0));
        transport.start();
      }, totalDurationForDownload);

      // Convert buffer to WAV
      const wav = await bufferToWav(buffer);
      
      // Create download link
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'music.wav';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('Download complete');
    } catch (error) {
      console.error('Error downloading audio:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Convert AudioBuffer to WAV file
  const bufferToWav = async (buffer: Tone.ToneAudioBuffer): Promise<ArrayBuffer> => {
    const audioBuffer = buffer.get() as AudioBuffer;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = [];
    for (let i = 0; i < numberOfChannels; i++) {
      data.push(audioBuffer.getChannelData(i));
    }

    const interleaved = interleave(data);
    const dataLength = interleaved.length * bytesPerSample;
    const buffer_array = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer_array);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    floatTo16BitPCM(view, 44, interleaved);

    return buffer_array;
  };

  const interleave = (channels: Float32Array[]): Float32Array => {
    const length = channels[0].length;
    const result = new Float32Array(length * channels.length);

    let offset = 0;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < channels.length; channel++) {
        result[offset++] = channels[channel][i];
      }
    }

    return result;
  };

  const writeString = (view: DataView, offset: number, string: string): void => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const floatTo16BitPCM = (view: DataView, offset: number, input: Float32Array): void => {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  };

  return (
    <div className="musicxml-player">
      {xmlContent && (
        <>
          {/* Tab Navigation */}
          <div className="player-tabs">
            <button 
              className={activeTab === 'custom' ? 'active' : ''} 
              onClick={() => setActiveTab('custom')}
            >
              Custom Player
            </button>
            <button 
              className={activeTab === 'osmd-audio' ? 'active' : ''} 
              onClick={() => setActiveTab('osmd-audio')}
            >
              OSMD Audio Player
            </button>
          </div>

          <div className="controls">
            <button onClick={handlePlay} disabled={isPlaying}>
              ▶ Play
            </button>
            <button onClick={handlePause} disabled={!isPlaying}>
              ⏸ Pause
            </button>
            <button onClick={handleStop}>
              ⏹ Stop
            </button>
            {activeTab === 'custom' && (
              <>
                <button onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? '⏳ Downloading...' : '⬇ Download WAV'}
                </button>
                <label>
                  Tempo: {tempo} BPM
                  <input
                    type="range"
                    min="40"
                    max="240"
                    value={tempo}
                    onChange={(e) => handleTempoChange(Number(e.target.value))}
                  />
                </label>
              </>
            )}
          </div>
          
          {/* Progress Bar */}
          {totalDuration > 0 && (
            <div className="playback-progress">
              <span className="time-label">{formatTime(currentTime)}</span>
              <div 
                className="progress-bar-container"
                onClick={handleProgressBarClick}
              >
                <div 
                  className="progress-bar-handle"
                  style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                />
              </div>
              <span className="time-label">{formatTime(totalDuration)}</span>
            </div>
          )}
          
          {totalMeasureCount > visibleMeasures && (
            <div className="load-more-controls">
              <button onClick={handleLoadMore}>
                Load More Measures ({visibleMeasures} of {totalMeasureCount} shown)
              </button>
            </div>
          )}
        </>
      )}
      <div 
        ref={containerRef} 
        className="sheet-music-container"
        style={{ width: '100%', overflow: 'auto', display: activeTab === 'custom' ? 'block' : 'none' }}
      />
      <div 
        ref={osmdAudioContainerRef} 
        className="sheet-music-container"
        style={{ width: '100%', overflow: 'auto', display: activeTab === 'osmd-audio' ? 'block' : 'none' }}
      />
    </div>
  );
};