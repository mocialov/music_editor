import React, { useRef } from 'react';

interface FileUploaderProps {
  onFileLoad: (content: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    </div>
  );
};
