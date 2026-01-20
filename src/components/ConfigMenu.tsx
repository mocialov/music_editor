import React, { useState, useEffect } from 'react';
import './ConfigMenu.css';

interface ConfigMenuProps {
  onApiKeyChange?: (apiKey: string) => void;
}

export const ConfigMenu: React.FC<ConfigMenuProps> = ({ onApiKeyChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
      onApiKeyChange?.(savedKey);
    }
  }, []);

  const handleSave = () => {
    // Save to localStorage
    if (tempApiKey.trim()) {
      localStorage.setItem('user_gemini_api_key', tempApiKey.trim());
      setApiKey(tempApiKey.trim());
      onApiKeyChange?.(tempApiKey.trim());
    } else {
      // Clear if empty
      localStorage.removeItem('user_gemini_api_key');
      setApiKey('');
      onApiKeyChange?.('');
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current saved value
    setTempApiKey(apiKey);
    setShowPassword(false);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempApiKey('');
  };

  return (
    <>
      <button 
        className="config-button" 
        onClick={() => setIsOpen(true)}
        title="Settings"
        aria-label="Open settings"
      >
        ⚙️ Settings
      </button>

      {isOpen && (
        <div className="config-modal-overlay" onClick={handleCancel}>
          <div className="config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="config-modal-header">
              <h2>⚙️ Configuration</h2>
              <button 
                className="close-button" 
                onClick={handleCancel}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="config-modal-body">
              <div className="config-section">
                <label htmlFor="api-key-input">
                  <strong>Gemini API Key</strong>
                </label>
                <p className="config-description">
                  Enter your own Google Gemini API key to enable LLM features.
                  Get your key from{' '}
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Google AI Studio
                  </a>
                </p>
                
                <div className="input-group">
                  <input
                    id="api-key-input"
                    type={showPassword ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="api-key-input"
                  />
                  <button
                    type="button"
                    className="toggle-visibility-button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide API key' : 'Show API key'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>

                <div className="config-info">
                  {apiKey ? (
                    <span className="status-active">✓ API key is configured</span>
                  ) : (
                    <span className="status-inactive">⚠️ No API key set</span>
                  )}
                </div>
              </div>
            </div>

            <div className="config-modal-footer">
              <button 
                className="button-secondary" 
                onClick={handleClear}
              >
                Clear
              </button>
              <div className="button-group">
                <button 
                  className="button-secondary" 
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button 
                  className="button-primary" 
                  onClick={handleSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
