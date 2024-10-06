import React, { useState, useRef, useEffect } from 'react';
import './AICertificateGenerator.css';
import * as XLSX from 'xlsx';

function AICertificateGenerator() {
  const [file, setFile] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [userInput, setUserInput] = useState('');
  const chatRef = useRef(null);
  const [fieldType, setFieldType] = useState(null);
  const [isOptional, setIsOptional] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [fieldOptions, setFieldOptions] = useState([]);
  const [additionalFields, setAdditionalFields] = useState({});

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys);
        if (data.apiKeys.length > 0) {
          setSelectedApiKey(data.apiKeys[0].apiKey);
        }
      } else {
        console.error('Failed to fetch API keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await readFileData(file);
      setFileData(data);
      const response = await fetch('/.netlify/functions/ai-certificate-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData: data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process certificates');
      }

      const result = await response.json();
      await processAIResponse(result);
    } catch (error) {
      console.error('Error:', error);
      addMessage('AI', `An error occurred: ${error.message}`);
    }

    setIsLoading(false);
  };

  const readFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const processAIResponse = async (result) => {
    const { messages, nextField, fieldType, options, isOptional } = result;

    for (const message of messages) {
      addMessage('AI', message);
      await delay(1000);
    }

    if (nextField) {
      setCurrentField(nextField);
      setFieldType(fieldType);
      setIsOptional(isOptional);
      setFieldOptions(options || []);
      addMessage('AI', `Please provide the ${nextField}${isOptional ? ' (optional)' : ''}:`);
    } else {
      setCurrentField(null);
      setShowGenerateButton(true);
    }
  };

  const handleUserInput = async (e) => {
    e.preventDefault();
    addMessage('User', userInput);
    setIsLoading(true);
  
    try {
      const response = await fetch('/.netlify/functions/ai-certificate-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData,
          ...additionalFields,
          [currentField]: userInput,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process input');
      }
  
      const result = await response.json();
      await processAIResponse(result);
  
      // Update additionalFields with the new input
      setAdditionalFields(prev => ({
        ...prev,
        [currentField]: userInput
      }));
  
    } catch (error) {
      console.error('Error:', error);
      addMessage('AI', `An error occurred: ${error.message}`);
    }
  
    setIsLoading(false);
    setUserInput('');
  };

  const addMessage = (sender, content, isUserInput = false, isDownloadLink = false, downloadUrl = '') => {
    setChatMessages(prev => [...prev, { sender, content, isUserInput, isDownloadLink, downloadUrl }]);
    setTimeout(() => {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 100);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGenerateCertificates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/ai-certificate-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData,
          generateCertificates: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate certificates');
      }

      const result = await response.json();
      addMessage('AI', `Successfully generated ${result.certificateCount} certificates.`);
      addMessage('AI', 'Download Certificates', false, true, result.zipUrl);
    } catch (error) {
      console.error('Error:', error);
      addMessage('AI', `An error occurred while generating certificates: ${error.message}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="ai-certificate-generator">
      <h1>AI Certificate Generator</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="file">Upload CSV or Excel file:</label>
          <input type="file" id="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} required />
        </div>
        <div className="form-group">
          <label htmlFor="apiKey">Select API Key:</label>
          <select
            id="apiKey"
            value={selectedApiKey}
            onChange={(e) => setSelectedApiKey(e.target.value)}
            required
          >
            {apiKeys.map((key) => (
              <option key={key.apiKey} value={key.apiKey}>
                {key.name} - Remaining: {key.limit - key.usageCount}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Analyze Data'}
        </button>
      </form>

      <div className="chat-container" ref={chatRef}>
        {chatMessages.map((message, index) => (
          <div key={index} className={`chat-message ${message.sender.toLowerCase()}`}>
            {message.isDownloadLink ? (
              <a href={message.downloadUrl} target="_blank" rel="noopener noreferrer" className="download-link">
                {message.content}
              </a>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}
      </div>

      {currentField && (
        <form onSubmit={handleUserInput} className="user-input-form">
          {fieldType === 'dropdown' ? (
            <select
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              required={!isOptional}
            >
              <option value="">Select {currentField}</option>
              {fieldOptions.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
          ) : fieldType === 'signature' ? (
            <div>
              {/* Add signature upload/draw components */}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUserInput(e.target.files[0])}
                required={!isOptional}
              />
            </div>
          ) : (
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={`Enter ${currentField}${isOptional ? ' (optional)' : ''}`}
              required={!isOptional}
            />
          )}
          <button type="submit">Submit</button>
        </form>
      )}

      {showGenerateButton && (
        <button onClick={handleGenerateCertificates} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Certificates'}
        </button>
      )}
    </div>
  );
}

export default AICertificateGenerator;