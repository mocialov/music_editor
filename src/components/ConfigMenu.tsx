import React, { useState, useEffect } from 'react';
import './ConfigMenu.css';

interface ConfigMenuProps {
  onApiKeyChange?: (apiKey: string) => void;
  onModelIdChange?: (modelId: string) => void;
}

export const ConfigMenu: React.FC<ConfigMenuProps> = ({ onApiKeyChange, onModelIdChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [tempModelId, setTempModelId] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Load API key and model ID from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
      onApiKeyChange?.(savedKey);
    }
    
    const savedModelId = localStorage.getItem('user_gemini_model_id');
    const defaultModelId = import.meta.env.VITE_GEMINI_MODEL_ID || 'gemini-2.0-flash-exp';
    const modelToUse = savedModelId || defaultModelId;
    setModelId(modelToUse);
    setTempModelId(modelToUse);
    onModelIdChange?.(modelToUse);
  }, []);

  const handleSave = () => {
    // Save API key to localStorage
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
    
    // Save model ID to localStorage
    if (tempModelId.trim()) {
      localStorage.setItem('user_gemini_model_id', tempModelId.trim());
      setModelId(tempModelId.trim());
      onModelIdChange?.(tempModelId.trim());
    } else {
      // Use default if empty
      const defaultModelId = import.meta.env.VITE_GEMINI_MODEL_ID || 'gemini-2.0-flash-exp';
      localStorage.removeItem('user_gemini_model_id');
      setModelId(defaultModelId);
      onModelIdChange?.(defaultModelId);
    }
    
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current saved values
    setTempApiKey(apiKey);
    setTempModelId(modelId);
    setShowPassword(false);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempApiKey('');
    setTempModelId('');
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

              <div className="config-section">
                <label htmlFor="model-id-input">
                  <strong>Gemini Model ID</strong>
                </label>
                <p className="config-description">
                  Specify the Gemini model to use (e.g., gemini-2.0-flash-exp, gemini-2.5-flash-lite).
                  Leave empty to use the default model.
                </p>
                
                <div className="input-group">
                  <input
                    id="model-id-input"
                    type="text"
                    value={tempModelId}
                    onChange={(e) => setTempModelId(e.target.value)}
                    placeholder="gemini-2.0-flash-exp"
                    className="api-key-input"
                  />
                </div>

                <div className="config-info">
                  {modelId ? (
                    <span className="status-active">✓ Using model: {modelId}</span>
                  ) : (
                    <span className="status-inactive">⚠️ No model specified</span>
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
