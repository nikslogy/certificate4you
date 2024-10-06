import React, { useState, useRef, useEffect } from 'react';
import './AICertificateGenerator.css';
import * as XLSX from 'xlsx';

function AICertificateGenerator() {
  const [file, setFile] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [certificateCount, setCertificateCount] = useState(0);
  const [template, setTemplate] = useState('');
  const [logo, setLogo] = useState(null);
  const [remainingUsage, setRemainingUsage] = useState(null);
  const chatRef = useRef(null);
  const [missingRequiredFields, setMissingRequiredFields] = useState([]);
  const [suggestedOptionalFields, setSuggestedOptionalFields] = useState([]);
  const [fileData, setFileData] = useState(null);

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

  const handleLogoUpload = (e) => {
    setLogo(e.target.files[0]);
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
          logo: logo ? await fileToBase64(logo) : null,
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

  const handleMissingFieldSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const updatedFileData = fileData.map(item => ({
      ...item,
      ...Object.fromEntries(
        [...missingRequiredFields, ...suggestedOptionalFields].map(field => [field, e.target[field]?.value || ''])
      )
    }));

    try {
      const response = await fetch('/.netlify/functions/ai-certificate-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: selectedApiKey,
          fileData: updatedFileData,
          logo: logo ? await fileToBase64(logo) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process certificates');
      }

      const result = await response.json();
      await processAIResponse(result);
      setMissingRequiredFields([]);
      setSuggestedOptionalFields([]);
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
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        resolve(json);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const processAIResponse = async (result) => {
    const { messages, certificateCount, template, zipUrl, remainingUsage, missingRequiredFields, suggestedOptionalFields } = result;

    for (const message of messages) {
      addMessage('AI', message);
      await delay(1000);
    }

    if (missingRequiredFields && missingRequiredFields.length > 0) {
      setMissingRequiredFields(missingRequiredFields);
      addMessage('AI', `Please provide the following required information: ${missingRequiredFields.join(', ')}`);
    }

    if (suggestedOptionalFields && suggestedOptionalFields.length > 0) {
      setSuggestedOptionalFields(suggestedOptionalFields);
      addMessage('AI', `You may also provide the following optional information: ${suggestedOptionalFields.join(', ')}`);
    }

    if (!missingRequiredFields || missingRequiredFields.length === 0) {
      setCertificateCount(certificateCount);
      setTemplate(template);
      setRemainingUsage(remainingUsage);

      addMessage('AI', `Generated ${certificateCount} certificates using the ${template} template.`);
      addMessage('AI', `You have ${remainingUsage} certificates left to generate with this API key.`);
      addMessage('AI', 'All certificates have been generated successfully! You can now download the ZIP file containing all certificates.');
      addMessage('AI', 'Download ZIP', true, true, zipUrl);
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
      {missingRequiredFields.length > 0 || suggestedOptionalFields.length > 0 ? (
        <form onSubmit={handleMissingFieldSubmit}>
          {missingRequiredFields.map(field => (
            <div key={field} className="form-group">
              <label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
              <input type="text" id={field} name={field} required />
            </div>
          ))}
          {suggestedOptionalFields.map(field => (
            <div key={field} className="form-group">
              <label htmlFor={field}>{field.charAt(0).toUpperCase() + field.slice(1)} (Optional):</label>
              <input type="text" id={field} name={field} />
            </div>
          ))}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Submit Additional Information'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="file">Upload CSV or Excel file:</label>
            <input type="file" id="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} required />
          </div>
          <div className="form-group">
            <label htmlFor="logo">Upload Logo (optional):</label>
            <input type="file" id="logo" accept="image/*" onChange={handleLogoUpload} />
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
            {isLoading ? 'Processing...' : 'Generate Certificates'}
          </button>
        </form>
      )}

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

      {certificateCount > 0 && (
        <div className="certificate-summary">
          <h2>Certificate Summary</h2>
          <p>Number of certificates generated: {certificateCount}</p>
          <p>Template used: {template}</p>
          <p>Remaining usage: {remainingUsage}</p>
        </div>
      )}
    </div>
  );
}

export default AICertificateGenerator;