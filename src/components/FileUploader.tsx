import React, { useRef, useState } from 'react';
import { convertMidiToMusicXML } from '../utils/midi-converter';
import { AudioRecorder } from './AudioRecorder';

interface FileUploaderProps {
  onFileLoad: (content: string, metadata?: { isMidiConversion: boolean; fileName: string }) => void;
  onMidiGenerated?: (midiBlob: Blob) => void;
}

const EXAMPLE_FILES = [
  { name: 'Chopin - Etude Op.10 No.12', path: `${import.meta.env.BASE_URL}example_xmls/Chopin_Etude_Op.10_No.12.xml` },
  { name: 'St. Anne', path: `${import.meta.env.BASE_URL}example_xmls/st_anne.xml` },
  { name: 'Vivaldi - Winter', path: `${import.meta.env.BASE_URL}example_xmls/Vivaldi_Concerto_No.4_in_F_Minor_Winter.xml` },
  { name: 'Sample Score', path: `${import.meta.env.BASE_URL}example_xmls/xml_score.musicxml` },
];

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoad, onMidiGenerated }) => {
  const musicXMLInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'audio'>('file');

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

  const handleAudioFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onMidiGenerated) return;
    
    // For now, just pass to the audio recorder logic
    // In a real implementation, you'd process the audio file here
    event.target.value = ''; // Reset input
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
        <div className="upload-icon"></div>
        <h2>Start Your Composition</h2>
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            <span className="tab-icon">📁</span>
            Upload File
          </button>
          <button 
            className={`tab-button ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            <span className="tab-icon">🎤</span>
            Audio to MIDI
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'file' && (
            <div className="file-upload-section">
              <p className="section-description">Upload your music files in MusicXML or MIDI format</p>
              <div className="upload-buttons">
                <button 
                  onClick={() => musicXMLInputRef.current?.click()} 
                  className="upload-button primary"
                  disabled={loading}
                >
                  <span className="button-icon">🎵</span>
                  <span className="button-content">
                    <span className="button-label">MusicXML</span>
                    <span className="button-hint">.xml, .musicxml</span>
                  </span>
                </button>
                <button 
                  onClick={() => midiInputRef.current?.click()} 
                  className="upload-button primary"
                  disabled={loading}
                >
                  <span className="button-icon">🎹</span>
                  <span className="button-content">
                    <span className="button-label">MIDI File</span>
                    <span className="button-hint">.mid, .midi</span>
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'audio' && onMidiGenerated && (
            <div className="audio-upload-section">
              <p className="section-description">Convert audio recordings to MIDI notation</p>
              <AudioRecorder onMidiGenerated={onMidiGenerated} />
            </div>
          )}
        </div>

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Processing...</span>
          </div>
        )}

        <input ref={musicXMLInputRef} type="file" accept=".xml,.musicxml" onChange={handleMusicXMLFileChange} style={{ display: 'none' }} />
        <input ref={midiInputRef} type="file" accept=".mid,.midi" onChange={handleMIDIFileChange} style={{ display: 'none' }} />
        <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFileChange} style={{ display: 'none' }} />

        <div className="example-files">
          <h3>Or try an example</h3>
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
          max-width: 700px;
          margin: 0 auto;
        }
        .upload-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          text-align: center;
          filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3));
        }
        .file-uploader h2 {
          margin-bottom: 0.5rem;
          color: var(--text-main);
          text-align: center;
          font-size: 2rem;
          font-weight: 700;
        }
        .file-uploader > .upload-content > p {
          color: var(--text-muted);
          margin-bottom: 2.5rem;
          text-align: center;
          font-size: 1.1rem;
        }

        /* Tab Navigation */
        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: var(--bg-card);
          padding: 0.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }
        .tab-button {
          flex: 1;
          padding: 1rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .tab-button:hover {
          background: rgba(139, 92, 246, 0.1);
          color: var(--text-main);
        }
        .tab-button.active {
          background: var(--primary-color);
          color: white;
        }
        .tab-icon {
          font-size: 1.25rem;
        }

        /* Tab Content */
        .tab-content {
          min-height: 250px;
        }
        .section-description {
          text-align: center;
          color: var(--text-muted);
          margin-bottom: 2rem;
          font-size: 0.95rem;
        }

        /* File Upload Section */
        .file-upload-section .upload-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        .upload-button.primary {
          background: var(--bg-card);
          border: 2px solid var(--border-color);
          color: var(--text-main);
          padding: 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          font-size: 1rem;
          font-weight: 600;
        }
        .upload-button.primary:hover:not(:disabled) {
          border-color: var(--primary-color);
          background: rgba(59, 130, 246, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
        }
        .upload-button.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .button-icon {
          font-size: 2.5rem;
        }
        .button-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .button-label {
          font-size: 1rem;
          font-weight: 600;
        }
        .button-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        /* Audio Upload Section */
        .audio-upload-section {
          padding: 0;
        }

        /* Loading Indicator */
        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 8px;
          color: var(--primary-color);
          font-weight: 600;
        }
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Example Files */
        .example-files {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--border-color);
        }
        .example-files h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 1rem;
          text-align: center;
          letter-spacing: 0.05em;
        }
        .example-files-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .example-file-button {
          padding: 0.875rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .example-file-button:hover:not(:disabled) {
          border-color: var(--accent-color);
          background: rgba(139, 92, 246, 0.1);
          transform: translateY(-1px);
        }
        .example-file-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
