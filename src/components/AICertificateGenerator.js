import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './AICertificateGenerator.css';

function AICertificateGenerator({ isLoggedIn, userApiKeys }) {
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [formData, setFormData] = useState({});
  const [currentField, setCurrentField] = useState(null);
  const [logo, setLogo] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedCertificateUrl, setGeneratedCertificateUrl] = useState(null);
  const sigPads = useRef([]);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const initializeChat = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': selectedApiKey,
        },
        body: JSON.stringify({ action: 'initialize' }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setChatHistory([{ type: 'ai', content: data.message }]);
      setCurrentField(data.nextField);
      setIsLoading(false);
    } catch (error) {
      setError(`Failed to initialize AI: ${error.message}. Please check your API key and try again.`);
      setIsLoading(false);
    }
  };



  const handleUserInput = async () => {
    if (!userInput.trim()) return;
  
    setChatHistory(prev => [...prev, { type: 'user', content: userInput }]);
    setUserInput('');
    setIsLoading(true);
    setError(null);
  
    try {
      const response = await fetch('/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': selectedApiKey,
        },
        body: JSON.stringify({ 
          action: 'chat', 
          message: userInput,
          formData: formData,
          currentField: currentField
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      setChatHistory(prev => [...prev, { type: 'ai', content: data.message }]);
      updateFormData(data.formData);
      setCurrentField(data.nextField);
      setIsLoading(false);
    } catch (error) {
      setError(`Failed to get AI response: ${error.message}. Please try again.`);
      setIsLoading(false);
    }
  };

  const updateFormData = (newData) => {
    setFormData(prev => ({
      ...prev,
      ...newData
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': selectedApiKey,
        },
        body: JSON.stringify({
          action: 'generate',
          formData: formData,
          logo: logo,
          signatures: signatures
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedCertificateUrl(data.certificateUrl);
      setIsLoading(false);
    } catch (error) {
      setError(`Failed to generate certificate: ${error.message}. Please try again.`);
      setIsLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureChange = (index, signatureData) => {
    const newSignatures = [...signatures];
    newSignatures[index] = signatureData.split(',')[1];
    setSignatures(newSignatures);
  };

  const renderCurrentField = () => {
    if (!currentField) return null;

    switch (currentField.type) {
      case 'text':
        return (
          <div className="form-input-group animate-field">
            <label htmlFor={currentField.name}>{currentField.name}</label>
            <input
              type="text"
              id={currentField.name}
              value={formData[currentField.name] || ''}
              onChange={(e) => updateFormData({ [currentField.name]: e.target.value })}
              required={!currentField.optional}
            />
          </div>
        );
      case 'dropdown':
        return (
          <div className="form-input-group animate-field">
            <label htmlFor={currentField.name}>{currentField.name}</label>
            <select
              id={currentField.name}
              value={formData[currentField.name] || ''}
              onChange={(e) => updateFormData({ [currentField.name]: e.target.value })}
              required={!currentField.optional}
            >
              <option value="">Select an option</option>
              {currentField.options.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="ai-cert-gen-container">
      <div className="ai-cert-header">
        <h1>AI Certificate Generator</h1>
        <p>Create professional certificates with the help of AI</p>
      </div>

      {isLoggedIn ? (
        <select 
          value={selectedApiKey} 
          onChange={(e) => setSelectedApiKey(e.target.value)}
          className="api-key-dropdown"
        >
          <option value="">Select your API key</option>
          {userApiKeys.map(key => (
            <option key={key.id} value={key.value}>{key.name}</option>
          ))}
        </select>
      ) : (
        <input 
          type="text" 
          value={selectedApiKey} 
          onChange={(e) => setSelectedApiKey(e.target.value)}
          placeholder="Enter your API key"
          className="api-key-text-input"
        />
      )}

      <button onClick={initializeChat} disabled={!selectedApiKey} className="init-chat-btn">
        Start AI-Powered Certificate Generation
      </button>

      <div className="chat-history-container" ref={chatContainerRef}>
        {chatHistory.map((message, index) => (
          <div key={index} className={`chat-message ${message.type}`}>
            {message.type === 'ai' && <div className="ai-avatar-icon"></div>}
            <div className="chat-message-text">{message.content}</div>
          </div>
        ))}
        {isLoading && <div className="loading-spinner"></div>}
      </div>

      <div className="user-input-area">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleUserInput}>Send</button>
      </div>

      <form onSubmit={handleSubmit} className="cert-generation-form">
        {renderCurrentField()}

        <div className="form-input-group">
          <label htmlFor="logo-upload">Upload Logo</label>
          <input id="logo-upload" type="file" onChange={handleLogoUpload} accept="image/*" />
        </div>
        
        <div className="form-input-group">
          <label>Signatures</label>
          {[0, 1, 2].map((index) => (
            <SignatureCanvas
              key={index}
              ref={(ref) => sigPads.current[index] = ref}
              onEnd={() => handleSignatureChange(index, sigPads.current[index].toDataURL())}
              canvasProps={{width: 300, height: 150, className: 'signature-pad'}}
            />
          ))}
        </div>

        <button type="submit" disabled={isLoading} className="submit-cert-btn">
          Generate Certificate
        </button>
      </form>

      {error && <div className="error-notification">{error}</div>}

      {generatedCertificateUrl && (
        <div className="cert-success-message">
          <h3>Your AI-Generated Certificate is Ready!</h3>
          <a href={generatedCertificateUrl} target="_blank" rel="noopener noreferrer" className="cert-view-link">
            View Certificate
          </a>
        </div>
      )}
    </div>
  );
}

export default AICertificateGenerator;