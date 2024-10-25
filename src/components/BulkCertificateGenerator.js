import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import './BulkCertificateGenerator.css';

function BulkCertificateGenerator() {
  const [formData, setFormData] = useState({
    course: '',
    date: '',
    certificateType: 'completion',
    issuer: '',
    additionalInfo: '',
    template: 'classic-elegance',
    apiKey: '',
  });
  const [csvFile, setCsvFile] = useState(null);
  const [logo, setLogo] = useState(null);
  const [signatures, setSignatures] = useState([{ name: '', image: null, type: 'upload' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [numberOfNames, setNumberOfNames] = useState(10);
  const sigPads = useRef([]);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError(null);
    } else {
      setError('Please upload a valid CSV file.');
      e.target.value = null;
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setLogo(file);
      setError(null);
    } else {
      setError('Please upload a valid image file for the logo.');
      e.target.value = null;
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
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newSignatures = [...signatures];
        newSignatures[index].image = event.target.result;
        setSignatures(newSignatures);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please upload a valid image file for the signature.');
      e.target.value = null;
    }
  };

  const handleSignatureDraw = (index) => {
    if (sigPads.current[index]) {
      const newSignatures = [...signatures];
      newSignatures[index].image = sigPads.current[index].toDataURL();
      setSignatures(newSignatures);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
  
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('formData', JSON.stringify(formData));
      if (logo) formDataToSend.append('logo', logo);
      signatures.forEach((sig, index) => {
        formDataToSend.append(`signature_${index}`, JSON.stringify(sig));
      });
  
      if (csvFile) {
        formDataToSend.append('csvFile', csvFile);
      } else {
        formDataToSend.append('numberOfNames', numberOfNames.toString());
      }
  
      const response = await fetch('/.netlify/functions/generate-bulk-certificates', {
        method: 'POST',
        body: formDataToSend,
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      navigate('/dashboard', { state: { bulkGenerationId: result.generationId } });
    } catch (error) {
      console.error('Error generating bulk certificates:', error);
      setError('Failed to generate bulk certificates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="certificate-bulk-generator">
      <h1>Bulk Certificate Generator</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="apiKey">API Key</label>
          <input
            type="text"
            id="apiKey"
            name="apiKey"
            value={formData.apiKey}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="course">Course Name</label>
          <input
            type="text"
            id="course"
            name="course"
            value={formData.course}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="certificateType">Certificate Type</label>
          <select
            id="certificateType"
            name="certificateType"
            value={formData.certificateType}
            onChange={handleInputChange}
          >
            <option value="completion">Completion</option>
            <option value="participation">Participation</option>
            <option value="achievement">Achievement</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="issuer">Issuer</label>
          <input
            type="text"
            id="issuer"
            name="issuer"
            value={formData.issuer}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="additionalInfo">Additional Information</label>
          <textarea
            id="additionalInfo"
            name="additionalInfo"
            value={formData.additionalInfo}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="template">Template</label>
          <select
            id="template"
            name="template"
            value={formData.template}
            onChange={handleInputChange}
          >
            <option value="classic-elegance">Classic Elegance</option>
            <option value="modern-minimalist">Modern Minimalist</option>
            <option value="vibrant-achievement">Vibrant Achievement</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="logo-upload">Upload Logo</label>
          <input
            id="logo-upload"
            type="file"
            onChange={handleLogoUpload}
            accept="image/*"
          />
        </div>
        <div className="signatures-container">
          {signatures.map((signature, index) => (
            <div key={index} className="signature-field">
              <input
                type="text"
                placeholder="Signature Name"
                value={signature.name}
                onChange={(e) => handleSignatureNameChange(index, e.target.value)}
              />
              <select
                value={signature.type}
                onChange={(e) => handleSignatureTypeChange(index, e.target.value)}
              >
                <option value="upload">Upload</option>
                <option value="draw">Draw</option>
              </select>
              {signature.type === 'upload' ? (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSignatureUpload(index, e)}
                />
              ) : (
                <SignatureCanvas
                  ref={(ref) => sigPads.current[index] = ref}
                  onEnd={() => handleSignatureDraw(index)}
                  canvasProps={{width: 300, height: 150, className: 'signature-canvas'}}
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
        <div className="form-group">
          <label htmlFor="csv-upload">Upload CSV file (optional)</label>
          <input
            id="csv-upload"
            type="file"
            onChange={handleCsvUpload}
            accept=".csv"
          />
        </div>
        {!csvFile && (
          <div className="form-group">
            <label htmlFor="number-of-names">Number of names to generate</label>
            <input
              id="number-of-names"
              type="number"
              min="1"
              max="100"
              value={numberOfNames}
              onChange={(e) => setNumberOfNames(parseInt(e.target.value))}
            />
          </div>
        )}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Bulk Certificates'}
        </button>
      </form>
      {isLoading && (
        <div className="processing-indicator">
          <p>Generating certificates... This may take a while.</p>
          <div className="loading-dots">
            <div className="dot1"></div>
            <div className="dot2"></div>
            <div className="dot3"></div>
          </div>
        </div>
      )}
      {error && <div className="error-alert">{error}</div>}
    </div>
  );
}

export default BulkCertificateGenerator;