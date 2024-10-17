import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './AICertificateGenerator.css';

function AICertificateGenerator({ isLoggedIn, userApiKeys }) {
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    date: '',
    certificateType: 'completion',
    issuer: '',
    additionalInfo: '',
    template: 'classic-elegance',
  });
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
        throw new Error('Failed to initialize chat');
      }
      await response.json();
      setChatHistory([{ type: 'ai', content: 'Welcome! I\'m your AI assistant for certificate generation. What type of certificate would you like to create?' }]);
      setIsLoading(false);
    } catch (error) {
      setError("Failed to initialize AI. Please check your API key and try again.");
      setIsLoading(false);
    }
  };

  const handleUserInput = async () => {
    if (!userInput.trim()) return;

    setChatHistory(prev => [...prev, { type: 'user', content: userInput }]);
    setUserInput('');
    setIsLoading(true);

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
          formData: formData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      setChatHistory(prev => [...prev, { type: 'ai', content: data.message }]);
      updateFormData(data.formData);
      setIsLoading(false);
    } catch (error) {
      setError("Failed to get AI response. Please try again.");
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
          signatures: signatures,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate certificate');
      }

      const data = await response.json();
      setGeneratedCertificateUrl(data.url);
    } catch (error) {
      setError(error.message);
    } finally {
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

  return (
    <div className="ai-certificate-generator">
      <div className="ai-header">
        <h1>AI Certificate Generator</h1>
        <p>Create professional certificates with the help of AI</p>
      </div>

      {isLoggedIn ? (
        <select 
          value={selectedApiKey} 
          onChange={(e) => setSelectedApiKey(e.target.value)}
          className="api-key-select"
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
          className="api-key-input"
        />
      )}

      <button onClick={initializeChat} disabled={!selectedApiKey} className="start-button">
        Start AI-Powered Certificate Generation
      </button>

      <div className="chat-container" ref={chatContainerRef}>
        {chatHistory.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            {message.type === 'ai' && <div className="ai-avatar"></div>}
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {isLoading && <div className="loading-animation"></div>}
      </div>

      <div className="user-input">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={handleUserInput}>Send</button>
      </div>

      <form onSubmit={handleSubmit} className="certificate-form">
        <div className="form-group">
          <label htmlFor="logo-upload">Upload Logo</label>
          <input id="logo-upload" type="file" onChange={handleLogoUpload} accept="image/*" />
        </div>
        
        <div className="form-group">
          <label>Signatures</label>
          {[0, 1, 2].map((index) => (
            <SignatureCanvas
              key={index}
              ref={(ref) => sigPads.current[index] = ref}
              onEnd={() => handleSignatureChange(index, sigPads.current[index].toDataURL())}
              canvasProps={{width: 300, height: 150, className: 'signature-canvas'}}
            />
          ))}
        </div>

        <button type="submit" disabled={isLoading} className="generate-button">
          Generate Certificate
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {generatedCertificateUrl && (
        <div className="generated-certificate">
          <h3>Your AI-Generated Certificate is Ready!</h3>
          <a href={generatedCertificateUrl} target="_blank" rel="noopener noreferrer" className="view-certificate-button">
            View Certificate
          </a>
        </div>
      )}
    </div>
  );
}

export default AICertificateGenerator;