/* eslint-disable no-unused-vars */
import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
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
  const [signatures, setSignatures] = useState([]);
  const sigPads = useRef([]);
  const [remainingFields, setRemainingFields] = useState([]);

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

  const readFileData = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(Array.isArray(jsonData) ? jsonData : []);
        } catch (error) {
          reject(new Error('Failed to parse file data'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      const data = await readFileData(file);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid or empty file data');
      }
      setFileData(data);
  
      // Initial AI interaction
      const response = await fetch('/.netlify/functions/ai-certificate-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData: data,
          action: 'initialize' // Add this to indicate it's the initial request
        }),
      });
  
      let result;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        result = await response.json();
      } else {
        // If the response is not JSON, get the text content
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Received non-JSON response from server');
      }
  
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }
  
      console.log('Full server response:', result);
      await processAIResponse(result);
    } catch (error) {
      console.error('Error:', error);
      addMessage('AI', `An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const processAIResponse = async (result) => {
    if (!result || typeof result !== 'object') {
      console.error('Invalid response format:', result);
      addMessage('AI', 'Received an invalid response from the server.');
      return;
    }
  
    const { messages, nextField, fieldType, remainingFields, url } = result;
    
    if (url) {
        // This is the final response with the generated certificates
        addMessage('AI', 'Certificates generated successfully!', false, true, url);
        setShowGenerateButton(false);
        return;
      }

      if (Array.isArray(messages)) {
        for (const message of messages) {
          addMessage('AI', message);
          await delay(1000);
        }
      } else if (typeof messages === 'string') {
        addMessage('AI', messages);
        await delay(1000);
      } else if (messages === undefined) {
        console.warn('No messages received from the server');
        addMessage('AI', 'Processing your request...');
      } else {
        console.warn('Unexpected messages format:', messages);
        addMessage('AI', 'Received an unexpected response format.');
      }

      if (nextField) {
        setCurrentField(nextField);
        setFieldType(fieldType || 'text');
        setIsOptional(false); // You might want to determine this based on the AI response
        setFieldOptions([]); // You might want to set this for dropdown fields
        addMessage('AI', `Please provide the ${nextField}:`);
        setRemainingFields(remainingFields || []);
      } else {
        setCurrentField(null);
        setShowGenerateButton(true);
      }
    };

    const handleUserInput = async (e) => {
        e.preventDefault();
        let inputValue = isOptional && !userInput ? null : userInput;
      
        if (fieldType === 'file' && inputValue instanceof File) {
          // Convert File to base64
          inputValue = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(inputValue);
          });
        } else if (fieldType === 'signature') {
          inputValue = signatures;
        }
      
        addMessage('User', inputValue ? (fieldType === 'file' ? 'File uploaded' : inputValue) : 'Skipped (optional)');
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
              [currentField]: inputValue,
            }),
          });
      
          let result;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.indexOf("application/json") !== -1) {
            result = await response.json();
          } else {
            // If the response is not JSON, get the text content
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Received non-JSON response from server');
          }
      
          if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`);
          }
      
          await processAIResponse(result);
      
          setAdditionalFields(prev => ({
            ...prev,
            [currentField]: inputValue,
          }));
        } catch (error) {
          console.error('Error:', error);
          addMessage('AI', `An error occurred: ${error.message}`);
        } finally {
          setIsLoading(false);
          setUserInput('');
          setSignatures([]);
        }
      };

  const addMessage = (sender, content, isUserInput = false, isDownloadLink = false, downloadUrl = '') => {
    setChatMessages(prev => [...prev, { sender, content, isUserInput, isDownloadLink, downloadUrl }]);
    setTimeout(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 100);
  };

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleGenerateCertificates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/generate-certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData,
          ...additionalFields,
        }),
      });
  
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();
        console.log('Full server response:', result);
        await processAIResponse(result);
      } else {
        // If the response is not JSON, get the text content
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Received non-JSON response from server');
      }
    } catch (error) {
      console.error('Error:', error);
      addMessage('AI', `An error occurred: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignatureNameChange = (index, name) => {
    const newSignatures = [...signatures];
    newSignatures[index].name = name;
    setSignatures(newSignatures);
  };

  const handleSignatureTypeChange = (index, type) => {
    const newSignatures = [...signatures];
    newSignatures[index].type = type;
    newSignatures[index].image = null;
    setSignatures(newSignatures);
  };

  const handleSignatureUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newSignatures = [...signatures];
        newSignatures[index].image = event.target.result;
        setSignatures(newSignatures);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSignatureField = () => {
    if (signatures.length < 3) {
      setSignatures([...signatures, { name: '', image: null, type: 'upload' }]);
    }
  };

  const removeSignatureField = (index) => {
    const newSignatures = signatures.filter((_, i) => i !== index);
    setSignatures(newSignatures);
  };

  return (
    <div className="ai-certificate-generator">
      { <h1>This feature is coming soon!</h1>
      /* <h1>AI Certificate Generator</h1>
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
              {signatures.map((sig, index) => (
                <div key={index} className="signature-field">
                  <input
                    type="text"
                    placeholder="Signer's Name"
                    value={sig.name}
                    onChange={(e) => handleSignatureNameChange(index, e.target.value)}
                    required={!isOptional}
                  />
                  <select
                    value={sig.type}
                    onChange={(e) => handleSignatureTypeChange(index, e.target.value)}
                  >
                    <option value="upload">Upload Signature</option>
                    <option value="draw">Draw Signature</option>
                  </select>
                  {sig.type === 'upload' ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSignatureUpload(index, e)}
                      required={!isOptional}
                    />
                  ) : (
                    <SignatureCanvas
                      ref={(ref) => sigPads.current[index] = ref}
                      canvasProps={{ width: 300, height: 150, className: 'signature-canvas' }}
                    />
                  )}
                  {index > 0 && (
                    <button type="button" onClick={() => removeSignatureField(index)}>Remove</button>
                  )}
                </div>
              ))}
              {signatures.length < 3 && (
                <button type="button" onClick={addSignatureField}>Add Signature</button>
              )}
            </div>
          ) : fieldType === 'file' ? (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setUserInput(e.target.files[0])}
              required={!isOptional}
            />
          ) : (
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={`Enter ${currentField}${isOptional ? ' (optional)' : ''}`}
              required={!isOptional}
            />
          )}
          <button type="submit">{isOptional ? 'Skip/Submit' : 'Submit'}</button>
        </form>
      )}

      {showGenerateButton && (
        <button onClick={handleGenerateCertificates} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Certificates'}
        </button>
      )} */}
    </div>
  );
}

export default AICertificateGenerator;