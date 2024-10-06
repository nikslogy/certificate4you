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
    const { messages, nextField, certificateCount, template, zipUrl, remainingUsage } = result;

    for (const message of messages) {
      addMessage('AI', message);
      await delay(1000);
    }

    if (nextField) {
      setCurrentField(nextField);
      addMessage('AI', `Please provide the ${nextField}:`);
    } else {
      setCurrentField(null);
      if (certificateCount) {
        addMessage('AI', `Generated ${certificateCount} certificates using the ${template} template.`);
        addMessage('AI', `You have ${remainingUsage} certificates left to generate with this API key.`);
        addMessage('AI', 'All certificates have been generated successfully! You can now download the ZIP file containing all certificates.');
        addMessage('AI', 'Download ZIP', true, true, zipUrl);
      }
    }
  };

  const handleUserInput = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    addMessage('User', userInput);
    setUserInput('');

    try {
      const response = await fetch('/.netlify/functions/ai-certificate-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData,
          [currentField]: userInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process input');
      }

      const result = await response.json();
      await processAIResponse(result);
    } catch (error) {
      console.error('Error:', error);
      addMessage('AI', `An error occurred: ${error.message}`);
    }
  };

  const addMessage = (sender, content, isUserInput = false, isDownloadLink = false, downloadUrl = '') => {
    setChatMessages(prev => [...prev, { sender, content, isUserInput, isDownloadLink, downloadUrl }]);
    setTimeout(() => {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, 100);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleDownload = (url) => {
    window.open(url, '_blank');
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
              <button onClick={() => handleDownload(message.downloadUrl)} className="download-button">
                {message.content}
              </button>
            ) : (
              <p>{message.content}</p>
            )}
          </div>
        ))}
      </div>

      {currentField && (
        <form onSubmit={handleUserInput} className="user-input-form">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={`Enter ${currentField}`}
            required
          />
          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
}

export default AICertificateGenerator;