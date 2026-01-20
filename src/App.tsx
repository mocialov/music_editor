import { useState, useCallback } from 'react'
import './App.css'
import { FileUploader } from './components/FileUploader'
import { MusicXMLPlayer } from './components/MusicXMLPlayer'
import { MusicXMLStats } from './components/MusicXMLStats'
import { SemanticStats } from './components/SemanticStats'
import { LLMQuery } from './components/LLMQuery'
import { ConfigMenu } from './components/ConfigMenu'
import { MusicXMLParser, type MusicXMLDocument, type SemanticMusicXML, encodeToSemantic, getPartsInfo, getTotalMeasures } from './utils/musicxml-parser'
import { config } from './config'

function App() {
  const [xmlContent, setXmlContent] = useState<string | null>(null)
  const [parsedDocument, setParsedDocument] = useState<MusicXMLDocument | null>(null)
  const [semanticFormat, setSemanticFormat] = useState<SemanticMusicXML | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [midiConversionInfo, setMidiConversionInfo] = useState<{ converted: boolean; fileName: string; xmlOutput: string } | null>(null)
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; partId?: string } | null>(null)
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; name: string }>>([])
  const [totalMeasureCount, setTotalMeasureCount] = useState(0)

  const handleFileLoad = (content: string, metadata?: { isMidiConversion: boolean; fileName: string }) => {
    setXmlContent(content)
    
    // Store MIDI conversion info for debug display
    if (metadata?.isMidiConversion) {
      setMidiConversionInfo({ converted: true, fileName: metadata.fileName, xmlOutput: content })
      console.log('MIDI converted to MusicXML:', content.substring(0, 500))
    } else {
      setMidiConversionInfo(null)
    }
    
    // Parse MusicXML with the parser
    try {
      const parser = new MusicXMLParser()
      const doc = parser.parse(content)
      setParsedDocument(doc)
      
      console.log('Parsed MusicXML document:', doc)
      
      // Encode to semantic format for LLM
      const semantic = encodeToSemantic(doc)
      setSemanticFormat(semantic)
      
      // Extract parts information
      const parts = getPartsInfo(doc)
      setAvailableParts(parts)
      
      // Calculate total measure count
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
    
    // Convert back to XML string for player
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

  return (
    <div className="app">
      <ConfigMenu onApiKeyChange={handleApiKeyChange} onModelIdChange={handleModelIdChange} />
      <header className="app-header">
        <h1>🎵 MusicXML & MIDI Player</h1>
        <p>Load and play MusicXML or MIDI files with interactive sheet music</p>
      </header>

      <main className="app-main">
        <FileUploader onFileLoad={handleFileLoad} />
        
        {config.DEBUG_MODE && midiConversionInfo && (
          <div className="midi-conversion-debug">
            <h2>🎹 MIDI Conversion Debug</h2>
            <p className="conversion-info">
              Converted <strong>{midiConversionInfo.fileName}</strong> to MusicXML
            </p>
            <details>
              <summary>View Converted MusicXML</summary>
              <pre className="xml-output">{midiConversionInfo.xmlOutput}</pre>
            </details>
          </div>
        )}
        
        <MusicXMLStats document={parsedDocument} parseError={parseError} />
        
        {config.DEBUG_MODE && semanticFormat && (
          <div className="semantic-format">
            <details>
              <summary><h2>🤖 LLM-Friendly Format</h2></summary>
              
              <SemanticStats 
                semantic={semanticFormat} 
                originalSize={xmlContent?.length || 0} 
              />
              
              <p className="semantic-info">
                Compact semantic representation for AI music editing
              </p>
              <pre className="semantic-json">
                {JSON.stringify(semanticFormat, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <LLMQuery 
          semanticFormat={semanticFormat} 
          onParsedResult={handleLLMResult}
          fullDocument={parsedDocument}
          selectedRange={selectedRange}
          totalMeasureCount={totalMeasureCount}
          availableParts={availableParts}
          onRangeSelect={handleRangeSelect}
        />

        <MusicXMLPlayer 
          xmlContent={xmlContent}
        />
      </main>

      <footer className="app-footer">
        <p>Built with React + TypeScript + OpenSheetMusicDisplay + Tone.js</p>
      </footer>
    </div>
  )
}

export default App
