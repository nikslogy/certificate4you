require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { generateCertificate } = require('./certificateGenerator');
const cors = require('cors');
const AWS = require('aws-sdk');
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();

app.use(cors());
app.use(express.json());

// Use environment variables with fallbacks
const AWS_REGION = process.env.AWS_REGION || process.env.MYCERT_AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || process.env.MYCERT_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || process.env.MYCERT_AWS_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || process.env.MYCERT_S3_BUCKET_NAME;

console.log(`Server starting with AWS region: ${AWS_REGION}`);
console.log(`Using S3 bucket: ${S3_BUCKET_NAME}`);

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/generate-certificate', upload.single('logo'), async (req, res) => {
  console.log('Received certificate generation request');
  try {
    const { name, course, date, certificateType, issuer, additionalInfo } = req.body;
    const logoBuffer = req.file ? req.file.buffer : null;
    
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

    const result = await generateCertificate(name, course, date, logoBuffer, certificateType, issuer, additionalInfo, signatures);

    console.log('Certificate generated, sending response');
    res.json({ url: result.url, id: result.id });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Failed to generate certificate', details: error.message });
  }
});

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
});

app.get('/api/verify-certificate/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Server: Verifying certificate with ID: ${id}`);
  console.log(`Server: Using S3 bucket: ${S3_BUCKET_NAME}`);
  
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `certificates/${id}.json`
    });
    
    console.log(`Server: Attempting to fetch certificate JSON from S3: certificates/${id}.json`);
    
    try {
      const response = await s3Client.send(command);
      const certificateData = JSON.parse(await response.Body.transformToString());
      console.log(`Server: Certificate data retrieved successfully for ID: ${id}`);
      
      // Generate a pre-signed URL for the PDF
      const pdfCommand = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: `certificates/${id}.pdf`
      });
      console.log(`Server: Generating signed URL for PDF: certificates/${id}.pdf`);
      const pdfUrl = await getSignedUrl(s3Client, pdfCommand, { expiresIn: 3600 });
      
      res.json({ ...certificateData, pdfUrl, isValid: true });
    } catch (error) {
      console.error(`Server: Error fetching certificate ${id}:`, error);
      console.error(`Server: Error name: ${error.name}, message: ${error.message}`);
      
      if (error.name === 'NoSuchKey') {
        res.status(404).json({ error: 'Certificate not found', isValid: false });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Server: Error verifying certificate:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message, isValid: false });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});