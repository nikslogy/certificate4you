const express = require('express');
const multer = require('multer');
const path = require('path');
const { generateCertificate } = require('./certificateGenerator');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const certificates = new Map();

app.post('/api/generate-certificate', upload.single('logo'), async (req, res) => {
  console.log('Received certificate generation request');
  try {
    const { name, course, date, certificateType, issuer, additionalInfo } = req.body;
    const logoPath = req.file ? req.file.path : null;
    
    const signatures = [];
    for (let i = 1; i <= 3; i++) {
      if (req.body[`signatureName${i}`] && req.body[`signature${i}`]) {
        signatures.push({
          name: req.body[`signatureName${i}`],
          image: req.body[`signature${i}`]
        });
      }
    }

    console.log('Generating certificate with data:', { name, course, date, certificateType, issuer, signatureCount: signatures.length });

    const pdfBuffer = await generateCertificate(name, course, date, logoPath, certificateType, issuer, additionalInfo, signatures);

    console.log('Certificate generated, sending response');
    res.contentType('application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Failed to generate certificate', details: error.message });
  }
});

app.get('/api/verify-certificate/:id', (req, res) => {
  const { id } = req.params;
  try {
    const data = JSON.parse(fs.readFileSync('certificates.json', 'utf8'));
    const name = data[id];
    if (name) {
      res.json({ name });
    } else {
      res.status(404).json({ error: 'Certificate not found' });
    }
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});