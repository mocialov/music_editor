# MusicXML Player

A modern React application for loading, displaying, and playing MusicXML files with interactive sheet music rendering and audio playback. **Now with AI-powered music editing capabilities!**

## Features

- 🎵 **MusicXML File Support** - Load and parse MusicXML files
- 🎼 **Interactive Sheet Music** - Beautiful rendering using OpenSheetMusicDisplay
- ▶️ **Audio Playback** - Play music with synthesized audio using Tone.js
- ⏯️ **Playback Controls** - Play, pause, and stop functionality
- 🎚️ **Tempo Control** - Adjust playback speed (40-240 BPM)
- 🎨 **Modern UI** - Clean, responsive design
- 🤖 **LLM-Friendly Format** - Compact semantic representation for AI music editing
- ✅ **Full Validation** - Zod-based schema validation for both formats

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **OpenSheetMusicDisplay** - Music notation rendering
- **Tone.js** - Web audio synthesis
- **Zod** - Schema validation
- **fast-xml-parser** - XML parsing

## AI Music Editing

This project includes a **Semantic MusicXML format** - a compact, LLM-friendly JSON representation that reduces file size by 70-90% while preserving all musical content. Perfect for AI-powered music editing!

```typescript
// Load MusicXML and encode to semantic format
const semantic = encodeToSemantic(musicXMLDocument);

// Send to LLM for editing (e.g., "Make it louder", "Change to D major")
const edited = await llm.edit(semantic, instruction);

// Validate and convert back to playable MusicXML
const musicXML = processLLMOutput(edited);
```

Check out the example workflows in `src/examples/` for more details on AI-powered music editing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

Dependencies are already installed. The project is ready to run!

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Usage

1. Click the "📁 Load MusicXML File" button
2. Select a MusicXML file (.xml or .musicxml)
3. The sheet music will be displayed
4. Use the playback controls:
   - **▶ Play** - Start playback
   - **⏸ Pause** - Pause playback
   - **⏹ Stop** - Stop and reset
   - **Tempo slider** - Adjust playback speed

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── FileUploader.tsx       # File upload component
│   │   ├── LLMQuery.tsx           # LLM integration component
│   │   ├── MusicXMLPlayer.tsx     # Main player component
│   │   ├── MusicXMLStats.tsx      # MusicXML format stats
│   │   └── SemanticStats.tsx      # Semantic format stats
│   ├── utils/
│   │   └── musicxml-parser.ts     # Parser utilities
│   ├── examples/                   # Example workflows
│   ├── App.tsx                     # Main app component
│   └── main.tsx                    # Entry point
├── example_xmls/                   # Sample MusicXML files
├── package.json
└── vite.config.ts
```

## License

MIT
