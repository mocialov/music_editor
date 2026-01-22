import { useState, useRef, useCallback } from 'react'
import './AudioRecorder.css'
import * as tf from '@tensorflow/tfjs'
import { Midi } from '@tonejs/midi'
import { BasicPitch, addPitchBendsToNoteEvents, noteFramesToTime, outputToNotesPoly } from '@spotify/basic-pitch'

interface AudioRecorderProps {
  onMidiGenerated: (midiBlob: Blob) => void
}

export function AudioRecorder({ onMidiGenerated }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioFileInputRef = useRef<HTMLInputElement>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      setRecordingTime(0)
      setError(null)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudioToMidi(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Failed to access microphone. Please check permissions.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const handleAudioFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    await processAudioToMidi(file)
    
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }, [])

  const processAudioToMidi = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError(null)
    
    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      
      // Create audio context and decode audio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 22050 })
      let audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Convert stereo to mono if needed
      if (audioBuffer.numberOfChannels > 1) {
        const monoBuffer = audioContext.createBuffer(
          1, // mono
          audioBuffer.length,
          audioBuffer.sampleRate
        )
        
        const monoData = monoBuffer.getChannelData(0)
        
        // Average all channels to create mono
        for (let i = 0; i < audioBuffer.length; i++) {
          let sum = 0
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            sum += audioBuffer.getChannelData(channel)[i]
          }
          monoData[i] = sum / audioBuffer.numberOfChannels
        }
        
        audioBuffer = monoBuffer
      }
      
      // Initialize TensorFlow.js
      await tf.ready()
      
      // Load Basic Pitch model from public directory
      // Use the base URL from Vite config
      const modelPath = `${import.meta.env.BASE_URL}basic-pitch-model/model.json`
      const basicPitch = new BasicPitch(modelPath)
      
      // Arrays to collect model outputs
      const frames: number[][] = []
      const onsets: number[][] = []
      const contours: number[][] = []
      
      // Run the model
      await basicPitch.evaluateModel(
        audioBuffer,
        (f: number[][], o: number[][], c: number[][]) => {
          frames.push(...f)
          onsets.push(...o)
          contours.push(...c)
        },
        (progress: number) => {
          console.log(`Processing: ${Math.round(progress * 100)}%`)
        }
      )
      
      // Convert to notes with conservative parameters focused on bass
      const notes = noteFramesToTime(
        addPitchBendsToNoteEvents(
          contours,
          outputToNotesPoly(
            frames,
            onsets,
            0.5,    // onsetThresh - higher = less noise, clearer note attacks
            0.5,    // frameThresh - higher = require stronger signal
            5,      // minNoteLen - longer = filter out short noise spikes
            true,   // inferOnsets - catch real notes
            500,    // maxFreq (Hz) - focus on bass range, filter high frequencies
            null,   // minFreq - include all bass frequencies
            false,  // melodiaTrick - keep all detected notes
            8       // energyTolerance - lower = more conservative
          )
        )
      )
      
      // Create MIDI file
      const midi = new Midi()
      const track = midi.addTrack()
      
      // Calculate average pitch to detect if octave correction is needed
      const avgPitch = notes.reduce((sum, n) => sum + n.pitchMidi, 0) / notes.length
      
      // If average pitch is below C3 (MIDI 48), it's likely an octave detection error
      // Shift notes up by 1 or 2 octaves to bring them into normal singing/instrumental range
      let octaveShift = 0
      if (avgPitch < 36) {
        // Very low (below C2) - shift up 2 octaves
        octaveShift = 24
        console.log(`Detected very low notes (avg: ${avgPitch.toFixed(1)}). Applying +2 octave correction.`)
      } else if (avgPitch < 48) {
        // Low (below C3) - shift up 1 octave
        octaveShift = 12
        console.log(`Detected low notes (avg: ${avgPitch.toFixed(1)}). Applying +1 octave correction.`)
      }
      
      // Check if any notes were detected
      if (notes.length === 0) {
        setError('No musical notes detected in the audio. Please try recording clearer audio with stronger, sustained tones.')
        setIsProcessing(false)
        return
      }
      
      notes.forEach(note => {
        track.addNote({
          midi: Math.min(127, note.pitchMidi + octaveShift), // Ensure we don't exceed MIDI range
          time: note.startTimeSeconds,
          duration: note.durationSeconds,
          velocity: note.amplitude
        })
      })
      
      console.log(`Detected ${notes.length} notes from audio`)
      
      // Convert MIDI to blob
      const midiArray = midi.toArray()
      const midiBlob = new Blob([midiArray as any], { type: 'audio/midi' })
      
      onMidiGenerated(midiBlob)
      setIsProcessing(false)
      
    } catch (err) {
      console.error('Error processing audio:', err)
      setError(`Failed to convert audio to MIDI: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-recorder">      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="recorder-controls">
        {!isRecording && !isProcessing && (
          <div className="control-buttons">
            <button 
              className="record-button start"
              onClick={startRecording}
            >
              <span className="button-icon">🎤</span>
              <span className="button-content">
                <span className="button-label">Record Audio</span>
                <span className="button-hint">Use your microphone</span>
              </span>
            </button>
            <button 
              className="record-button upload"
              onClick={() => audioFileInputRef.current?.click()}
            >
              <span className="button-icon">📁</span>
              <span className="button-content">
                <span className="button-label">Upload Audio</span>
                <span className="button-hint">.mp3, .wav, .ogg</span>
              </span>
            </button>
          </div>
        )}
        
        <input 
          ref={audioFileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.webm"
          onChange={handleAudioFileChange}
          style={{ display: 'none' }}
        />
        
        {isRecording && (
          <div className="recording-active">
            <button 
              className="record-button stop"
              onClick={stopRecording}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              Stop Recording
            </button>
            <div className="recording-timer">
              <span className="recording-indicator">●</span>
              {formatTime(recordingTime)}
            </div>
          </div>
        )}
        
        {isProcessing && (
          <div className="processing">
            <div className="spinner"></div>
            <span>Converting to MIDI...</span>
          </div>
        )}
      </div>

      <div className="settings-display">
        <div className="settings-title">⚙️ Transcription Settings (Conservative Bass Focus)</div>
        <div className="settings-attribution">
          Powered by <a href="https://github.com/spotify/basic-pitch-ts" target="_blank" rel="noopener noreferrer">Spotify Basic Pitch</a>
        </div>
        <div className="settings-grid">
          <div className="setting-item">
            <span className="setting-label">Onset Threshold:</span>
            <span className="setting-value">0.5</span>
            <span className="setting-description">Higher - filters noise, captures clear note attacks</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Frame Threshold:</span>
            <span className="setting-value">0.5</span>
            <span className="setting-description">Higher - requires stronger signal, reduces noise</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Min Note Length:</span>
            <span className="setting-value">5 frames</span>
            <span className="setting-description">Filters short noise spikes, keeps sustained notes</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Frequency Range:</span>
            <span className="setting-value">Bass focus (up to 500 Hz)</span>
            <span className="setting-description">Concentrates on bass range, filters high frequencies</span>
          </div>
        </div>
      </div>
    </div>
  )
}
