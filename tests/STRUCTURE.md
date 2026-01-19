# Test Folder Organization

## Overview

Tests are now organized with **one folder per test case**. This makes it easy to:
- Add new test cases
- Keep related files together
- Document what each test validates
- Scale to many test cases

## Structure

```
tests/
├── inspect-midi.mjs         ← General tool: Inspect any MIDI file
├── ground-truth.mjs         ← General tool: Validate ground truth
├── regression-test.mjs      ← General tool: Run all tests
├── validate-conversion.mts  ← General tool: Test one case
├── README.md                ← Documentation
│
├── old-macdonald-had-a-farm/  ← Test case #1
│   ├── input.mid              ← Input MIDI
│   └── expected.musicxml      ← Ground truth output
│
└── <your-test-name>/          ← Test case #2
    ├── input.mid
    └── expected.musicxml
```

## File Naming Convention

Each test case folder must have:
- **`input.mid`** - The MIDI file to test (standard name)
- **`expected.musicxml`** - The correct output (standard name)
- **`generated.musicxml`** - Auto-generated during tests (for debugging)

## Commands

All commands work with folder names:

```bash
# Test a specific case
npm run test old-macdonald-had-a-farm

# Check ground truth
npm run ground-truth old-macdonald-had-a-farm

# Test all cases
npm run test:regression
```

## Benefits

✓ **Clear organization** - Each test is self-contained
✓ **Easy to add tests** - Just create a folder with input.mid
✓ **Scalable** - Can have 100+ test cases without clutter
✓ **Documentation** - Can add README.md in each test folder
✓ **Version control** - Easier to track changes per test case
