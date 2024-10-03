import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Link } from 'react-router-dom';
import './CertificateGenerator.css';

function CertificateGenerator() {
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    date: '',
    certificateType: 'completion',
    issuer: '',
    additionalInfo: '',
  });
  const [logo, setLogo] = useState(null);
  const [signatures, setSignatures] = useState([{ name: '', image: null, type: 'upload' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedCertificateUrl, setGeneratedCertificateUrl] = useState(null);
  const sigPads = useRef([]);
  const topRef = useRef(null);
  const [apiKey, setApiKey] = useState('');

  const validateFileType = (file) => {
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && validateFileType(file)) {
      setLogo(file);
      setError(null);
    } else {
      setError('Please upload a valid JPG or PNG file for the logo.');
      e.target.value = null; // Reset the file input
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
    if (file && validateFileType(file)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newSignatures = [...signatures];
        newSignatures[index].image = event.target.result;
        setSignatures(newSignatures);
      };
      reader.readAsDataURL(file);
      setError(null);
    } else {
      setError('Please upload a valid JPG or PNG file for the signature.');
      e.target.value = null; // Reset the file input
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
    setGeneratedCertificateUrl(null);
  
    const dataToSend = {
      ...formData,
      logo: logo ? await fileToBase64(logo) : null,
      signatures: signatures.map((sig, index) => ({
        name: sig.name,
        image: sig.type === 'draw' ? sigPads.current[index].toDataURL() : sig.image
      }))
    };
  
    try {
      const response = await fetch('https://certificate4you.com/.netlify/functions/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(dataToSend),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          if (errorData.error === 'Invalid API key') {
            throw new Error('Invalid API key. Please check your API key and try again.');
          } else if (errorData.error === 'API key usage limit exceeded') {
            throw new Error('API key usage limit reached. Please generate a new API key.');
          }
        }
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.error}`);
      }
  
      const result = await response.json();
      console.log('Received result:', result);
      if (result.url) {
        setGeneratedCertificateUrl(result.url);
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      console.error('Error generating certificate:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  useEffect(() => {
    console.log('generatedCertificateUrl changed:', generatedCertificateUrl);
    if (generatedCertificateUrl && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generatedCertificateUrl]);

  return (

    <div className="certificate-generator">
      <div ref={topRef}></div>
      <h1>Generate Certificate</h1>
      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="loading-message">Generating certificate...</div>}
      {generatedCertificateUrl && (
        <div className="success-message">
          <p>Certificate generated successfully!</p>
          <button onClick={() => window.open(generatedCertificateUrl, '_blank')}>
            Download Certificate
          </button>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="apiKey">API Key</label>
        <input
          type="text"
          id="apiKey"
          name="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <Link to="/api-key-generator" className="get-api-key-link">Get free API key now</Link>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="certificateType">Certificate Type</label>
          <select
            id="certificateType"
            name="certificateType"
            value={formData.certificateType}
            onChange={handleInputChange}
            required
          >
            <option value="completion">Certificate of Completion</option>
            <option value="achievement">Certificate of Achievement</option>
            <option value="participation">Certificate of Participation</option>
            <option value="excellence">Certificate of Excellence</option>
            <option value="training">Certificate of Training</option>
            <option value="appreciation">Certificate of Appreciation</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="name">Recipient Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="course">Course/Event Name</label>
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
          <label htmlFor="date">Date of Completion</label>
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
          <label htmlFor="logo">Upload Logo</label>
          <input
            type="file"
            id="logo"
            accept="image/*"
            onChange={handleLogoUpload}
          />
        </div>

        <div className="form-group">
          <label>Signatures</label>
          {signatures.map((sig, index) => (
            <div key={index} className="signature-field">
              <input
                type="text"
                placeholder="Signer's Name"
                value={sig.name}
                onChange={(e) => handleSignatureNameChange(index, e.target.value)}
                required
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
                  required
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

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Certificate'}
        </button>
      </form>
    </div>
  );
}

export default CertificateGenerator;