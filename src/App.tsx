import { useState, useCallback } from 'react'
import './App.css'
import { FileUploader } from './components/FileUploader'
import { MusicXMLPlayer } from './components/MusicXMLPlayer'
import { MusicXMLStats } from './components/MusicXMLStats'
import { LLMQuery } from './components/LLMQuery'
import { ConfigMenu } from './components/ConfigMenu'
import { MusicXMLParser, type MusicXMLDocument, type SemanticMusicXML, encodeToSemantic, getPartsInfo, getTotalMeasures } from './utils/musicxml-parser'
import { convertMidiToMusicXML } from './utils/midi-converter'
import { config } from './config'

function App() {
  const [xmlContent, setXmlContent] = useState<string | null>(null)
  const [parsedDocument, setParsedDocument] = useState<MusicXMLDocument | null>(null)
  const [semanticFormat, setSemanticFormat] = useState<SemanticMusicXML | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; partId?: string } | null>(null)
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; name: string }>>([])
  const [totalMeasureCount, setTotalMeasureCount] = useState(0)

  const handleFileLoad = (content: string) => {
    setXmlContent(content)
    setParseError(null) // Clear any previous errors
    
    try {
      const parser = new MusicXMLParser()
      const doc = parser.parse(content)
      setParsedDocument(doc)
      
      const semantic = encodeToSemantic(doc)
      setSemanticFormat(semantic)
      
      const parts = getPartsInfo(doc)
      setAvailableParts(parts)
      
      const measureCount = getTotalMeasures(doc)
      setTotalMeasureCount(measureCount)
      
      setParseError(null)
    } catch (error) {
      console.error('Parse error:', error)
      setParseError(error instanceof Error ? error.message : 'Unknown parse error')
      setParsedDocument(null)
      setSemanticFormat(null)
    }
  }

  const handleLLMResult = useCallback((document: MusicXMLDocument) => {
    setParsedDocument(document)
    const semantic = encodeToSemantic(document)
    setSemanticFormat(semantic)
    
    const parser = new MusicXMLParser()
    const xmlString = parser.toXML(document)
    setXmlContent(xmlString)
  }, [])

  const handleRangeSelect = useCallback((start: number, end: number, partId?: string) => {
    if (start > 0 && end > 0) {
      setSelectedRange({ start, end, partId })
    } else {
      setSelectedRange(null)
    }
  }, [])

  const handleApiKeyChange = useCallback((apiKey: string) => {
    config.setApiKey(apiKey);
  }, [])

  const handleModelIdChange = useCallback((modelId: string) => {
    config.setModelId(modelId);
  }, [])

  const handleMidiGenerated = useCallback(async (midiBlob: Blob) => {
    try {
      // Convert MIDI blob to ArrayBuffer
      const arrayBuffer = await midiBlob.arrayBuffer()
      
      // Convert MIDI to MusicXML
      const musicXML = await convertMidiToMusicXML(arrayBuffer)
      
      // Load the MusicXML
      handleFileLoad(musicXML)
    } catch (error) {
      console.error('Error converting MIDI to MusicXML:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert MIDI to MusicXML'
      // Show user-friendly error for common cases
      const displayMessage = errorMessage.includes('No tracks with notes') 
        ? 'No musical notes were detected in the audio. The recording may be too quiet, too noisy, or not contain clear pitched sounds. Please try recording again with clearer audio.'
        : `Error converting to sheet music: ${errorMessage}`
      setParseError(displayMessage)
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="home-button" onClick={() => window.location.reload()} title="Home">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          <div className="header-title-group">
            <h1><span className="title-icon">🎹</span> Mæstro AI</h1>
            <p className="subtitle">Compose, Edit & Transform Music with Intelligence</p>
          </div>
        </div>
        <div className="header-right">
          <ConfigMenu 
            onApiKeyChange={handleApiKeyChange} 
            onModelIdChange={handleModelIdChange}
          />
        </div>
      </header>

      <main className="app-main">
        {!xmlContent ? (
          <FileUploader 
            onFileLoad={handleFileLoad} 
            onMidiGenerated={handleMidiGenerated} 
            conversionError={parseError}
          />
        ) : (
          <>
            <aside className="sidebar">
              <LLMQuery 
                semanticFormat={semanticFormat} 
                onParsedResult={handleLLMResult}
                fullDocument={parsedDocument}
                selectedRange={selectedRange}
                totalMeasureCount={totalMeasureCount}
                availableParts={availableParts}
                onRangeSelect={handleRangeSelect}
              />
              <MusicXMLStats document={parsedDocument} parseError={parseError} />
            </aside>
            
            <section className="content-area">
              <MusicXMLPlayer 
                xmlContent={xmlContent}
              />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Mæstro AI &copy; 2026 | Intelligent Music Composition Platform</p>
      </footer>
    </div>
  )
}

export default App
