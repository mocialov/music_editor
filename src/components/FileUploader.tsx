import React, { useRef, useState } from 'react';
import { convertMidiToMusicXML } from '../utils/midi-converter';

interface FileUploaderProps {
  onFileLoad: (content: string, metadata?: { isMidiConversion: boolean; fileName: string }) => void;
}

const EXAMPLE_FILES = [
  { name: 'Chopin - Etude Op.10 No.12', path: `${import.meta.env.BASE_URL}example_xmls/Chopin_Etude_Op.10_No.12.xml` },
  { name: 'St. Anne', path: `${import.meta.env.BASE_URL}example_xmls/st_anne.xml` },
  { name: 'Vivaldi - Winter', path: `${import.meta.env.BASE_URL}example_xmls/Vivaldi_Concerto_No.4_in_F_Minor_Winter.xml` },
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
      reader.readAsText(file);
    } catch (error) {
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
    } finally {
      setLoading(false);
    }
  };

  const handleExampleFileClick = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(path);
      const content = await response.text();
      onFileLoad(content);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <div className="upload-content">
        <div className="upload-icon">📁</div>
        <h2>Start Your Composition</h2>
        <p>Upload a MusicXML or MIDI file to begin editing with AI</p>
        
        <div className="upload-buttons">
          <button onClick={() => musicXMLInputRef.current?.click()} className="upload-button" disabled={loading}>
            {loading ? '⌛ Processing...' : 'Load MusicXML'}
          </button>
          <button onClick={() => midiInputRef.current?.click()} className="upload-button" disabled={loading}>
            {loading ? '⌛ Processing...' : 'Load MIDI'}
          </button>
        </div>

        <input ref={musicXMLInputRef} type="file" accept=".xml,.musicxml" onChange={handleMusicXMLFileChange} style={{ display: 'none' }} />
        <input ref={midiInputRef} type="file" accept=".mid,.midi" onChange={handleMIDIFileChange} style={{ display: 'none' }} />

        <div className="example-files">
          <h3>Or try an example:</h3>
          <div className="example-files-list">
            {EXAMPLE_FILES.map((file) => (
              <button key={file.path} onClick={() => handleExampleFileClick(file.path)} className="example-file-button" disabled={loading}>
                {file.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .upload-content {
          max-width: 600px;
          margin: 0 auto;
        }
        .upload-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .file-uploader h2 {
          margin-bottom: 0.5rem;
          color: var(--text-main);
        }
        .file-uploader p {
          color: var(--text-muted);
          margin-bottom: 2rem;
        }
        .example-files {
          margin-top: 3rem;
          border-top: 1px solid var(--border-color);
          padding-top: 2rem;
        }
        .example-files h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};
