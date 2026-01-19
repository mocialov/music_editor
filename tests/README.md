# MIDI to MusicXML Testing

Regression testing tools for the MIDI to MusicXML converter.

## Directory Structure

```
tests/
  ├── inspect-midi.mjs         # MIDI file inspector
  ├── ground-truth.mjs         # Ground truth validator
  ├── regression-test.mjs      # Regression test runner
  ├── validate-conversion.mts  # Single test validator
  └── <test-name>/             # Test case folder
      ├── input.mid            # Input MIDI file
      └── expected.musicxml    # Expected output
```

## Quick Commands

```bash
# Test one case
npm run test old-macdonald-had-a-farm

# Test all cases
npm run test:regression

# Check ground truth
npm run ground-truth old-macdonald-had-a-farm

# Inspect MIDI
npm run inspect-midi tests/my-test/input.mid
```

## Adding a Test Case

1. **Create folder**: `mkdir tests/my-test`
2. **Add MIDI**: `cp song.mid tests/my-test/input.mid`
3. **Generate ground truth**:
   - `npm run dev`
   - Upload via http://localhost:5173/music_editor/
   - Copy MusicXML from browser console
   - Save as `tests/my-test/expected.musicxml`
4. **Validate**: `npm run test my-test`

## Test Cases

### old-macdonald-had-a-farm
- **Source**: Greensleeves
- **Properties**: 90 BPM, 2/4 time, 210 notes, C3-A4 range
- **Tests**: Grand staff, voice separation, beaming, chord duration

## What Makes Good Ground Truth

- ✓ Valid MusicXML structure
- ✓ Grand staff with dual clefs (G/2, F/4)
- ✓ Multiple voices
- ✓ Proper beaming
- ✓ Musicologically correct notation

## When Tests Fail

1. Review differences
2. If intentional improvement:
   ```bash
   cp tests/my-test/generated.musicxml tests/my-test/expected.musicxml
   ```
3. If regression: Fix code and rerun
