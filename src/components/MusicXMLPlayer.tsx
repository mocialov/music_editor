import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import * as Tone from 'tone';

interface MusicXMLPlayerProps {
  xmlContent: string | null;
}

export const MusicXMLPlayer: React.FC<MusicXMLPlayerProps> = ({ xmlContent }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [osmd, setOsmd] = useState<OpenSheetMusicDisplay | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [isDownloading, setIsDownloading] = useState(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const partRef = useRef<Tone.Part | null>(null);
  const notesDataRef = useRef<Array<{ time: number; note: string; duration: number }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const newOsmd = new OpenSheetMusicDisplay(containerRef.current, {
      autoResize: true,
      drawTitle: true,
      drawComposer: true,
    });

    setOsmd(newOsmd);

    // Initialize synthesizer
    synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();

    return () => {
      if (partRef.current) {
        partRef.current.dispose();
      }
      if (synthRef.current) {
        synthRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!osmd || !xmlContent) return;

    const loadAndRender = async () => {
      try {
        await osmd.load(xmlContent);
        osmd.render();
        createPlaybackSequence();
      } catch (error) {
        console.error('Error loading MusicXML:', error);
      }
    };

    loadAndRender();
  }, [osmd, xmlContent]);

  const createPlaybackSequence = () => {
    if (!osmd || !synthRef.current || !xmlContent) return;

    const notes: Array<{ time: number; note: string; duration: number }> = [];
    
    try {
      // Parse the MusicXML content
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Get divisions (timing resolution)
      const divisionsElement = xmlDoc.querySelector('divisions');
      const divisions = divisionsElement ? parseInt(divisionsElement.textContent || '1') : 1;
      
      // Get tempo (default to 120 BPM if not specified)
      let beatsPerMinute = tempo;
      const soundElement = xmlDoc.querySelector('sound[tempo]');
      if (soundElement) {
        const tempoAttr = soundElement.getAttribute('tempo');
        if (tempoAttr) {
          beatsPerMinute = parseInt(tempoAttr);
          setTempo(beatsPerMinute);
        }
      }
      
      // Calculate seconds per division
      const secondsPerBeat = 60 / beatsPerMinute;
      const secondsPerDivision = secondsPerBeat / divisions;
      
      // Get all measures
      const measures = xmlDoc.querySelectorAll('measure');
      let currentTime = 0;
      
      measures.forEach((measure) => {
        // Get all notes in this measure
        const noteElements = measure.querySelectorAll('note');
        
        noteElements.forEach((noteElement) => {
          const isRest = noteElement.querySelector('rest') !== null;
          const isChord = noteElement.querySelector('chord') !== null;
          
          // Get duration
          const durationElement = noteElement.querySelector('duration');
          const durationDivisions = durationElement ? parseInt(durationElement.textContent || '0') : 0;
          const noteDuration = durationDivisions * secondsPerDivision;
          
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
              
              notes.push({
                time: currentTime,
                note: noteName,
                duration: noteDuration,
              });
            }
          }
          
          // Move time forward (unless this is a chord note)
          if (!isChord) {
            currentTime += noteDuration;
          }
        });
      });
      
      console.log(`Parsed ${notes.length} notes from MusicXML`);
      
      // Store notes data for download functionality
      notesDataRef.current = notes;
    } catch (error) {
      console.error('Error parsing MusicXML:', error);
    }

    // Create Tone.js Part
    if (partRef.current) {
      partRef.current.dispose();
    }

    if (notes.length === 0) {
      console.warn('No notes found in the score');
      return;
    }

    partRef.current = new Tone.Part((time, value) => {
      if (synthRef.current && typeof value === 'object' && 'note' in value && 'duration' in value) {
        synthRef.current.triggerAttackRelease(value.note, value.duration, time);
      }
    }, notes.map(n => [n.time, n]));

    partRef.current.loop = false;
  };

  const handlePlay = async () => {
    if (!partRef.current) return;

    if (Tone.getTransport().state !== 'started') {
      await Tone.start();
      Tone.getTransport().bpm.value = tempo;
      partRef.current.start(0);
      Tone.getTransport().start();
      setIsPlaying(true);

      // Auto-stop when finished
      const duration = partRef.current.length;
      setTimeout(() => {
        handleStop();
      }, (duration / tempo) * 60 * 1000);
    }
  };

  const handlePause = () => {
    Tone.getTransport().pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    Tone.getTransport().stop();
    setIsPlaying(false);
    if (partRef.current) {
      partRef.current.stop();
    }
  };

  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    Tone.getTransport().bpm.value = newTempo;
  };

  const handleDownload = async () => {
    if (!notesDataRef.current || notesDataRef.current.length === 0) {
      console.error('No notes to download');
      return;
    }

    setIsDownloading(true);

    try {
      // Calculate the total duration of the piece
      const lastNote = notesDataRef.current[notesDataRef.current.length - 1];
      const totalDuration = lastNote.time + lastNote.duration + 0.5; // Add a small buffer

      // Render audio offline
      const buffer = await Tone.Offline(async ({ transport }) => {
        const synth = new Tone.PolySynth(Tone.Synth).toDestination();
        transport.bpm.value = tempo;

        const part = new Tone.Part((time, value) => {
          if (typeof value === 'object' && 'note' in value && 'duration' in value) {
            synth.triggerAttackRelease(value.note, value.duration, time);
          }
        }, notesDataRef.current.map(n => [n.time, n]));

        part.start(0);
        transport.start();
      }, totalDuration);

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
        </div>
      )}
      <div 
        ref={containerRef} 
        className="sheet-music-container"
        style={{ width: '100%', overflow: 'auto' }}
      />
    </div>
  );
};
