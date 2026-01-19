import React, { useRef, useState } from 'react';
import { convertMidiToMusicXML } from '../utils/midi-converter';

interface FileUploaderProps {
  onFileLoad: (content: string, metadata?: { isMidiConversion: boolean; fileName: string }) => void;
}

const EXAMPLE_FILES = [
  { name: 'Chopin - Etude Op.10 No.12', path: `${import.meta.env.BASE_URL}example_xmls/Chopin_Etude_Op.10_No.12.xml` },
  { name: 'Costeley - Je vois de glissantes eaux', path: `${import.meta.env.BASE_URL}example_xmls/Costeley_Je_vois_de_glissantes_eaux.xml` },
  { name: 'St. Anne', path: `${import.meta.env.BASE_URL}example_xmls/st_anne.xml` },
  { name: 'Vivaldi - Winter (Concerto No.4)', path: `${import.meta.env.BASE_URL}example_xmls/Vivaldi_Concerto_No.4_in_F_Minor_Winter.xml` },
  { name: 'Sample Score', path: `${import.meta.env.BASE_URL}example_xmls/xml_score.musicxml` },
];

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoad }) => {
  const musicXMLInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleMusicXMLFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileLoad(content, { isMidiConversion: false, fileName: file.name });
        setLoading(false);
      };
      reader.onerror = () => {
        alert('Failed to read MusicXML file');
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error processing MusicXML file:', error);
      alert(`Failed to process MusicXML file: ${error}`);
      setLoading(false);
    }
  };

  const handleMIDIFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const musicXML = await convertMidiToMusicXML(arrayBuffer);
      onFileLoad(musicXML, { isMidiConversion: true, fileName: file.name });
    } catch (error) {
      console.error('Error converting MIDI file:', error);
      alert(`Failed to convert MIDI file: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMusicXMLClick = () => {
    musicXMLInputRef.current?.click();
  };

  const handleMIDIClick = () => {
    midiInputRef.current?.click();
  };

  const handleExampleFileClick = async (path: string) => {
    setLoading(true);
    try {
      console.log('Attempting to fetch:', path);
      const response = await fetch(path);
      console.log('Response status:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      const content = await response.text();
      onFileLoad(content);
    } catch (error) {
      console.error('Error loading example file:', error);
      console.error('Failed path:', path);
      alert(`Failed to load example file. Please try another one.\nPath: ${path}\nError: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={musicXMLInputRef}
        type="file"
        accept=".xml,.musicxml"
        onChange={handleMusicXMLFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={midiInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={handleMIDIFileChange}
        style={{ display: 'none' }}
      />
      
      <div className="upload-buttons">
        <button onClick={handleMusicXMLClick} className="upload-button musicxml-button" disabled={loading}>
          🎼 {loading ? 'Processing...' : 'Load MusicXML File'}
        </button>
        <button onClick={handleMIDIClick} className="upload-button midi-button" disabled={loading}>
          🎹 {loading ? 'Processing...' : 'Load MIDI File'}
        </button>
      </div>
      
      <div className="example-files">
        <h3>Or try an example:</h3>
        <div className="example-files-list">
          {EXAMPLE_FILES.map((file) => (
            <button
              key={file.path}
              onClick={() => handleExampleFileClick(file.path)}
              className="example-file-button"
              disabled={loading}
            >
              🎼 {file.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
