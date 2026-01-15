import { useState } from 'react'
import './App.css'
import { FileUploader } from './components/FileUploader'
import { MusicXMLPlayer } from './components/MusicXMLPlayer'
import { MusicXMLStats } from './components/MusicXMLStats'
import { SemanticStats } from './components/SemanticStats'
import { LLMQuery } from './components/LLMQuery'
import { MusicXMLParser, type MusicXMLDocument, type SemanticMusicXML, encodeToSemantic } from './utils/musicxml-parser'
import { config } from './config'

function App() {
  const [xmlContent, setXmlContent] = useState<string | null>(null)
  const [parsedDocument, setParsedDocument] = useState<MusicXMLDocument | null>(null)
  const [semanticFormat, setSemanticFormat] = useState<SemanticMusicXML | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleFileLoad = (content: string) => {
    setXmlContent(content)
    
    // Parse MusicXML with the parser
    try {
      const parser = new MusicXMLParser()
      const doc = parser.parse(content)
      setParsedDocument(doc)
      
      // Encode to semantic format for LLM
      const semantic = encodeToSemantic(doc)
      setSemanticFormat(semantic)
      
      setParseError(null)
    } catch (error) {
      console.error('Parse error:', error)
      setParseError(error instanceof Error ? error.message : 'Unknown parse error')
      setParsedDocument(null)
      setSemanticFormat(null)
    }
  }

  const handleLLMResult = (document: MusicXMLDocument) => {
    setParsedDocument(document)
    const semantic = encodeToSemantic(document)
    setSemanticFormat(semantic)
    
    // Convert back to XML string for player
    const parser = new MusicXMLParser()
    const xmlString = parser.toXML(document)
    setXmlContent(xmlString)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎵 MusicXML Player</h1>
        <p>Load and play MusicXML files with interactive sheet music</p>
      </header>

      <main className="app-main">
        <FileUploader onFileLoad={handleFileLoad} />
        
        <LLMQuery semanticFormat={semanticFormat} onParsedResult={handleLLMResult} />
        
        <MusicXMLStats document={parsedDocument} parseError={parseError} />

        {config.DEBUG_MODE && semanticFormat && (
          <div className="semantic-format">
            <h2>🤖 LLM-Friendly Format</h2>
            
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
          </div>
        )}

        <MusicXMLPlayer xmlContent={xmlContent} />
      </main>

      <footer className="app-footer">
        <p>Built with React + TypeScript + OpenSheetMusicDisplay + Tone.js</p>
      </footer>
    </div>
  )
}

export default App
