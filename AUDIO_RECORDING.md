# Audio Recording to MIDI Feature

## Overview
The Mæstro AI application now includes an audio recording feature that allows you to record your voice or instrument and convert it to MIDI using Spotify's Basic Pitch machine learning model.

## How It Works

1. **Recording**: Click the "Start Recording" button to begin capturing audio from your microphone
2. **Stop**: Click "Stop Recording" when you're done
3. **Processing**: The audio is automatically processed using the Basic Pitch model
4. **Conversion**: The resulting MIDI is converted to MusicXML and displayed in the player

## Technical Details

### Basic Pitch
- Uses Spotify's Basic Pitch neural network for automatic music transcription
- Supports polyphonic instruments (multiple notes at once)
- Works best with one instrument at a time
- Sample rate: 22.05 kHz

### Browser Requirements
- Requires a modern browser with WebAudio API support
- Needs microphone permissions
- TensorFlow.js support required

### Processing Steps
1. Audio is recorded using the MediaRecorder API
2. Audio is decoded to AudioBuffer at 22.05 kHz
3. Basic Pitch model analyzes the audio and outputs:
   - Note frames (active notes over time)
   - Note onsets (note start times)
   - Pitch contours (pitch bend information)
4. Model outputs are converted to MIDI events
5. MIDI is converted to MusicXML for display

## Usage Tips

- **Recording Quality**: Use a quiet environment for best results
- **Instrument**: Works best with melodic instruments (voice, guitar, piano, etc.)
- **Duration**: Shorter recordings (under 30 seconds) process faster
- **Pitch Range**: Optimized for standard musical pitch ranges

## Troubleshooting

### Microphone Permission Denied
- Check browser permissions
- Reload the page and allow microphone access

### Processing Failed
- Ensure you have a stable internet connection (model needs to load)
- Try recording a shorter audio clip
- Check browser console for specific error messages

### Poor Transcription Quality
- Ensure clear audio with minimal background noise
- Try playing/singing closer to the microphone
- Avoid recording multiple instruments simultaneously
- Ensure your instrument is in tune

## Technical References

- [Basic Pitch GitHub](https://github.com/spotify/basic-pitch-ts)
- [Basic Pitch Paper](https://arxiv.org/abs/2203.09893)
- [TensorFlow.js](https://www.tensorflow.org/js)
