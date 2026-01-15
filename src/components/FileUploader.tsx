import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileLoad: (content: string) => void;
}

const EXAMPLE_FILES = [
  { name: 'Chopin - Etude Op.10 No.12', path: '/example_xmls/Chopin_Etude_Op.10_No.12.xml' },
  { name: 'Costeley - Je vois de glissantes eaux', path: '/example_xmls/Costeley_Je_vois_de_glissantes_eaux.xml' },
  { name: 'St. Anne', path: '/example_xmls/st_anne.xml' },
  { name: 'Vivaldi - Winter (Concerto No.4)', path: '/example_xmls/Vivaldi_Concerto_No.4_in_F_Minor_Winter.xml' },
  { name: 'Sample Score', path: '/example_xmls/xml_score.musicxml' },
];

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoad(content);
    };
    reader.readAsText(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleExampleFileClick = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.statusText}`);
      }
      const content = await response.text();
      onFileLoad(content);
    } catch (error) {
      console.error('Error loading example file:', error);
      alert('Failed to load example file. Please try another one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,.musicxml"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button onClick={handleClick} className="upload-button">
        📁 Load MusicXML File
      </button>
      
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
